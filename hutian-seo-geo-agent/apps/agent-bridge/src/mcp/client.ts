/**
 * T4.2 · MCP client + 工具 schema 派生
 *
 * 用 @modelcontextprotocol/sdk 的 stdio Client 连 hutian-seo-mcp，
 * 调 list_tools() 拿五工具的 name/description/inputSchema，
 * 派生成 OpenAI tools 格式（ToolSchema[]）。
 *
 * 验收（自建loop.md §2）：派生出的 5 个工具名 =
 *   run_diagnosis / check_schema / trace_citations / submit_sitemap / entity_rename
 * 一字不差。
 *
 * 设计：
 *  - McpToolClient 封装 MCP 连接 + 工具调用
 *  - listToolSchemas() 派生 OpenAI tools 格式
 *  - callTool(name, args) 经 MCP 调 Python 工具，返回结构化结果
 *  - 连接失败时 fallback 到 STATIC_TOOLS（避免 bridge 启动阻塞）
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ToolSchema } from "../llm/types.ts";
import { sanitizeForOpenAI } from "./sanitize.ts";

export interface ToolCallResult {
  ok: boolean;
  ms: number;
  output: unknown;
  error?: string;
}

export interface McpToolClient {
  listToolSchemas(): Promise<ToolSchema[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;
  close(): Promise<void>;
}

export interface McpClientConfig {
  /** MCP server 命令（默认 hutian-seo-mcp） */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** 工作目录（默认 cwd） */
  cwd?: string;
}

const FIVE_TOOL_NAMES = [
  "run_diagnosis",
  "check_schema",
  "trace_citations",
  "submit_sitemap",
  "entity_rename",
] as const;

export class StdioMcpClient implements McpToolClient {
  private client: Client;
  private transport: StdioClientTransport;
  private connected = false;

  constructor(cfg: McpClientConfig = {}) {
    this.transport = new StdioClientTransport({
      command: cfg.command ?? "hutian-seo-mcp",
      args: cfg.args ?? [],
      env: cfg.env,
      cwd: cfg.cwd,
    });
    this.client = new Client(
      { name: "hutian-bridge", version: "0.1.0" },
      { capabilities: {} },
    );
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    await this.client.connect(this.transport);
    this.connected = true;
  }

  async listToolSchemas(): Promise<ToolSchema[]> {
    await this.ensureConnected();
    const resp = await this.client.listTools();
    return resp.tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: sanitizeForOpenAI(t.inputSchema ?? { type: "object", properties: {} }),
      },
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    const start = Date.now();
    try {
      await this.ensureConnected();
      const resp = await this.client.callTool({ name, arguments: args });
      const ms = Date.now() - start;
      // MCP 返回 content[]，取第一个 text 的内容
      const contents = (resp.content ?? []) as Array<{ type: string; text?: string }>;
      const content = contents[0];
      if (content?.type === "text" && typeof content.text === "string") {
        const raw = content.text;
        try {
          return { ok: true, ms, output: JSON.parse(raw) };
        } catch {
          return { ok: true, ms, output: raw };
        }
      }
      return { ok: true, ms, output: resp };
    } catch (e) {
      return { ok: false, ms: Date.now() - start, output: null, error: (e as Error).message };
    }
  }

  async close(): Promise<void> {
    if (!this.connected) return;
    await this.client.close();
    this.connected = false;
  }
}

/**
 * 静态 fallback schema —— 从 tools.py 函数签名派生。
 * 当 MCP server 不可用时（如 CI 无 hutian-seo-mcp 命令），bridge 用这份启动。
 * 工具签名变化时需同步更新（grep "@mcp.tool" tools.py）。
 */
export const STATIC_TOOLS: ToolSchema[] = [
  {
    type: "function",
    function: {
      name: "run_diagnosis",
      description: "Run an SEO/GEO diagnosis on a URL. Checks HTTP, robots, sitemap, JSON-LD, PageSpeed (if key set). Returns seo/geo scores and issues list.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to diagnose, e.g. https://example.com" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trace_citations",
      description: "Track brand citations across AI engines. Returns engine shares, sentiment, growth.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Brand name to track" },
          window_days: { type: "integer", description: "Lookback window in days", default: 30 },
        },
        required: ["brand"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_sitemap",
      description: "Submit sitemap URLs to Google/Bing via IndexNow. Returns submission status per target.",
      parameters: {
        type: "object",
        properties: {
          host: { type: "string", description: "Site host, e.g. example.com" },
          urls: { type: "array", items: { type: "string" }, description: "URLs to submit" },
          indexnow_key: { type: "string", description: "IndexNow protocol key" },
        },
        required: ["host", "urls", "indexnow_key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_schema",
      description: "Extract and validate JSON-LD blocks from a URL. Reports missing fields against schema.org spec.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to inspect for JSON-LD" },
          expected_type: { type: "string", description: "Expected @type, e.g. Product, Organization", default: "" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "entity_rename",
      description: "Rename a brand entity across project files. dry_run=true only counts matches. Skips VCS/build dirs.",
      parameters: {
        type: "object",
        properties: {
          root: { type: "string", description: "Project root to scan" },
          old_names: { type: "array", items: { type: "string" }, description: "Old brand names to replace" },
          new_name: { type: "string", description: "New brand name" },
          dry_run: { type: "boolean", description: "If true, only count matches without writing", default: true },
        },
        required: ["root", "old_names", "new_name"],
      },
    },
  },
];

/** 验证工具名闭环：派生的 5 个名字必须等于 FIVE_TOOL_NAMES */
export function validateToolNames(schemas: ToolSchema[]): { ok: boolean; missing: string[]; extra: string[] } {
  const names = new Set(schemas.map((s) => s.function.name));
  const expected = new Set<string>(FIVE_TOOL_NAMES);
  const missing = [...expected].filter((n) => !names.has(n));
  const extra = [...names].filter((n) => !expected.has(n));
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

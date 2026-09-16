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

const TOOL_NAMES = [
  "run_diagnosis",
  "check_schema",
  "trace_citations",
  "submit_sitemap",
  "entity_rename",
  "analyze_content_gap",
  "cms_create_page",
  "cms_update_content",
  "cms_configure_product",
  "cms_upload_media",
  "cms_publish",
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
 * 静态 fallback schema —— 从 tools.py / cms_tools.py 函数签名派生。
 * 当 MCP server 不可用时（如 CI 无 hutian-seo-mcp 命令），bridge 用这份启动。
 * 工具签名变化时需同步更新（grep "@mcp.tool" tools.py cms_tools.py）。
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
  {
    type: "function",
    function: {
      name: "analyze_content_gap",
      description: "SERP content gap analysis via Serper.dev (primary) / OpenSERP self-hosted (fallback). Fetches top competitor pages for a keyword, extracts their markdown content, and returns a content gap matrix (common topics, top questions, heading themes) plus an editorial brief with missing topics for your page.",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Target search keyword" },
          my_url: { type: "string", description: "Your page URL (optional). Excluded from competitor set and fetched for missing-topic calculation.", default: "" },
          engine: { type: "string", description: "Search engine: google, bing, yandex, baidu, duckduckgo, ecosia", default: "google" },
          gl: { type: "string", description: "Country/region code, e.g. us, uk, cn", default: "us" },
          num_results: { type: "integer", description: "Number of top results to analyze (1-10)", default: 5 },
        },
        required: ["keyword"],
      },
    },
  },
  // ── 建站腿 5 工具 ──
  {
    type: "function",
    function: {
      name: "cms_create_page",
      description: "Create a page/article in siteBase CMS. Returns created id and source (live or mock).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Page title" },
          summary: { type: "string", description: "Page summary" },
          content: { type: "string", description: "Page content (markdown supported)" },
          category_id: { type: "integer", description: "Category id (optional)", default: 0 },
          status: { type: "integer", description: "0=draft 1=published", default: 1 },
          publish_time: { type: "string", description: "Publish time (optional)", default: "" },
        },
        required: ["title", "summary", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cms_update_content",
      description: "Update an existing page/article in siteBase CMS.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Page id" },
          title: { type: "string", description: "New title (optional)", default: "" },
          summary: { type: "string", description: "New summary (optional)", default: "" },
          content: { type: "string", description: "New content (optional)", default: "" },
          category_id: { type: "integer", description: "New category id (optional)", default: 0 },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cms_configure_product",
      description: "Create or update a product in siteBase CMS. product_id=0 creates, >0 updates.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name" },
          product_code: { type: "string", description: "Product code/SKU" },
          description: { type: "string", description: "Product description", default: "" },
          price: { type: "number", description: "Price in USD", default: 0 },
          stock: { type: "integer", description: "Stock quantity", default: 0 },
          images: { type: "string", description: "Image URL or JSON array", default: "" },
          category_id: { type: "integer", description: "Category id", default: 0 },
          brand_id: { type: "integer", description: "Brand id", default: 0 },
          is_on_sale: { type: "integer", description: "0=off 1=on", default: 1 },
          product_id: { type: "integer", description: "0=create, >0=update", default: 0 },
        },
        required: ["name", "product_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cms_upload_media",
      description: "Upload an image/media file to siteBase CMS.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute local file path" },
          type: { type: "string", description: "image or file", default: "image" },
        },
        required: ["file_path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cms_publish",
      description: "Publish/unpublish a page or product by switching status.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Entity id" },
          type: { type: "string", description: "article or product" },
          status: { type: "integer", description: "0=unpublish 1=publish", default: 1 },
        },
        required: ["id", "type"],
      },
    },
  },
];

/** 验证工具名闭环：派生的名字必须等于 TOOL_NAMES */
export function validateToolNames(schemas: ToolSchema[]): { ok: boolean; missing: string[]; extra: string[] } {
  const names = new Set(schemas.map((s) => s.function.name));
  const expected = new Set<string>(TOOL_NAMES);
  const missing = [...expected].filter((n) => !names.has(n));
  const extra = [...names].filter((n) => !expected.has(n));
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

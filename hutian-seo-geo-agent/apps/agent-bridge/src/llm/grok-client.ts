/**
 * T4.1 · GrokClient —— CLIProxyAPI 适配实现
 *
 * 通过本地 CLIProxyAPI (http://127.0.0.1:8317) 调用 Grok Build
 * CLIProxyAPI 提供 OpenAI 兼容接口：/v1/chat/completions
 * 
 * 前置条件（Windows/macOS/Linux）：
 *   1. 安装 CLIProxyAPI: npm install -g cliproxyapi
 *   2. 配置 API Key: ~/.cli-proxy-api/config.yaml 或 %USERPROFILE%\.cli-proxy-api\config.yaml
 *   3. 授权 Grok: cliproxy --xai-login
 *   4. 启动服务：cliproxy 或 brew services start cliproxyapi
 *
 * 环境变量：
 *   - GROK_PROXY_API_KEY   (必填，从 config.yaml 的 api-keys 获取)
 *   - GROK_PROXY_BASE_URL  (默认 http://127.0.0.1:8317/v1)
 *   - GROK_MODEL           (默认 grok-4.5，可选 grok-4.5-build, grok-4.3)
 */
import type { ChatOptions, LLMClient, LLMResponse, Message, ToolCall } from "./types.ts";

export interface GrokConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class GrokClient implements LLMClient {
  readonly name = "grok";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor(cfg: GrokConfig) {
    if (!cfg.apiKey) throw new Error("GrokClient: apiKey is required");
    this.apiKey = cfg.apiKey;
    this.baseUrl = (cfg.baseUrl ?? "http://127.0.0.1:8317/v1").replace(/\/$/, "");
    // grok-4.5-build 是最新构建版本，支持 reasoning 和 tool calling
    this.model = cfg.model ?? "grok-4.5";
  }

  /** 从 process.env 构造（bridge 启动时用） */
  static fromEnv(): GrokClient {
    const apiKey = process.env.GROK_PROXY_API_KEY ?? "";
    if (!apiKey) throw new Error("GROK_PROXY_API_KEY not set — bridge cannot start GrokClient");
    return new GrokClient({
      apiKey,
      baseUrl: process.env.GROK_PROXY_BASE_URL,
      model: process.env.GROK_MODEL ?? "grok-4.5",
    });
  }

  async chat(opts: ChatOptions): Promise<LLMResponse> {
    const body = {
      model: this.model,
      messages: opts.messages.map(toOpenAIMessage),
      tools: opts.tools,
      tool_choice: opts.tools?.length ? "auto" : undefined,
      stream: false, // MVP 先非流式；onToken 暂不触发
    };

    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`GrokClient ${resp.status}: ${text.slice(0, 500)}`);
    }

    const data = (await resp.json()) as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason: string;
      }>;
    };

    const choice = data.choices?.[0];
    if (!choice) throw new Error("GrokClient: empty choices in response");

    const msg = choice.message;
    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      args: safeParseArgs(tc.function.arguments),
    }));

    return {
      content: msg.content,
      toolCalls,
      finishReason: normalizeFinish(choice.finish_reason, toolCalls.length > 0),
    };
  }
}

function toOpenAIMessage(m: Message) {
  if (m.role === "assistant" && m.tool_calls?.length) {
    return {
      role: m.role,
      content: m.content ?? "",
      tool_calls: m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      })),
    };
  }
  return m;
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { _raw: raw };
  }
}

function normalizeFinish(reason: string, hasToolCalls: boolean): LLMResponse["finishReason"] {
  if (hasToolCalls) return "tool_calls";
  if (reason === "length") return "length";
  return "stop";
}

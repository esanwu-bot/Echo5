/**
 * T4.1 · CodeBuddyClient —— OpenAI 兼容实现
 *
 * CodeBuddy 走腾讯云 TokenHub（OpenAI 兼容）：/v1/chat/completions
 * tool calling 原生支持（同 DeepSeek/OpenAI 格式）。
 * 环境变量（见 .env.example）：
 *   - CODEBUDDY_API_KEY   (必填)
 *   - CODEBUDDY_API_BASE  (默认 https://tokenhub.tencentmaas.com/v1)
 *   - CODEBUDDY_MODEL     (默认 deepseek-v4-flash；可选 kimi-k2.5 / hy3-preview / glm-5.2)
 *
 * 模型 ID 必须用 TokenHub 的"model 参数值"列（见 https://cloud.tencent.com/document/product/1823/130079），
 * 不是模型商品名。例如 Kimi-K2.5 的 ID 是 `kimi-k2.5`，不是 `kimi-2.5`。
 *
 * 缺 key 时抛错 —— T4.5 由 bridge 顶层 catch，回退 mock 或明确报错（自建loop.md §验收）。
 */
import type { ChatOptions, LLMClient, LLMResponse, Message, ToolCall } from "./types.ts";

export interface CodeBuddyConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class CodeBuddyClient implements LLMClient {
  readonly name = "codebuddy";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor(cfg: CodeBuddyConfig) {
    if (!cfg.apiKey) throw new Error("CodeBuddyClient: apiKey is required");
    this.apiKey = cfg.apiKey;
    this.baseUrl = (cfg.baseUrl ?? "https://tokenhub.tencentmaas.com/v1").replace(/\/$/, "");
    // deepseek-v4-flash: OpenAI Responses 兼容支持，tool calling 稳定，中文好
    this.model = cfg.model ?? "deepseek-v4-flash";
  }

  /** 从 process.env 构造（bridge 启动时用） */
  static fromEnv(): CodeBuddyClient {
    const apiKey = process.env.CODEBUDDY_API_KEY ?? "";
    if (!apiKey) throw new Error("CODEBUDDY_API_KEY not set — bridge cannot start CodeBuddyClient");
    return new CodeBuddyClient({
      apiKey,
      baseUrl: process.env.CODEBUDDY_API_BASE,
      model: process.env.CODEBUDDY_MODEL ?? "deepseek-v4-flash",
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
      throw new Error(`CodeBuddy ${resp.status}: ${text.slice(0, 500)}`);
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
    if (!choice) throw new Error("CodeBuddy: empty choices in response");

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

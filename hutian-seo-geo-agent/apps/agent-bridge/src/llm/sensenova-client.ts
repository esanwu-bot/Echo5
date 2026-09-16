/**
 * SenseNovaClient —— 商汤 SenseNova（OpenAI 兼容协议）
 *
 * 商汤 SenseNova 提供 OpenAI 兼容的 /v1/chat/completions 端点，
 * 支持 function calling（tool calling）。
 *
 * 环境变量（见 .env.example）：
 *   - SENSENOVA_API_KEY   (必填)
 *   - SENSENOVA_API_BASE  (默认 https://token.sensenova.cn/v1)
 *   - SENSENOVA_MODEL     (默认 sensenova-6.7-flash-lite)
 *
 * 设计约束（对齐 GrokClient / CodeBuddyClient）：
 *  1. 超时：单次调用 60s（SenseNova 响应可能较慢）
 *  2. 重试：网络抖动时重试 1 次（5xx / ECONNREFUSED / ETIMEDOUT）
 *  3. 快速失败：API Key 未配置时构造即抛错，由 buildLLM 降级
 */
import type { ChatOptions, LLMClient, LLMResponse, Message, ToolCall } from "./types.ts";

export interface SenseNovaConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** 单次调用超时（ms），默认 60000 */
  timeoutMs?: number;
  /** 重试次数，默认 1 */
  retries?: number;
}

export class SenseNovaClient implements LLMClient {
  readonly name = "sensenova";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(cfg: SenseNovaConfig) {
    if (!cfg.apiKey) throw new Error("SenseNovaClient: apiKey is required");
    this.apiKey = cfg.apiKey;
    this.baseUrl = (cfg.baseUrl ?? "https://token.sensenova.cn/v1").replace(/\/$/, "");
    this.model = cfg.model ?? "sensenova-6.7-flash-lite";
    this.timeoutMs = cfg.timeoutMs ?? 60_000;
    this.retries = cfg.retries ?? 1;
    console.log(`[SenseNovaClient] model=${this.model} baseUrl=${this.baseUrl} timeout=${this.timeoutMs}ms retries=${this.retries}`);
  }

  /** 从 process.env 构造（bridge 启动时用） */
  static fromEnv(): SenseNovaClient {
    const apiKey = process.env.SENSENOVA_API_KEY ?? "";
    if (!apiKey) throw new Error("SENSENOVA_API_KEY not set — bridge cannot start SenseNovaClient");
    return new SenseNovaClient({
      apiKey,
      baseUrl: process.env.SENSENOVA_API_BASE,
      model: process.env.SENSENOVA_MODEL ?? "sensenova-6.7-flash-lite",
      timeoutMs: process.env.SENSENOVA_TIMEOUT_MS ? parseInt(process.env.SENSENOVA_TIMEOUT_MS, 10) : undefined,
      retries: process.env.SENSENOVA_RETRIES ? parseInt(process.env.SENSENOVA_RETRIES, 10) : undefined,
    });
  }

  /**
   * 轻量探测 SenseNova 端点是否可用。
   * 用于 buildLLM 启动时快速验证。
   */
  async ping(timeoutMs = 5000): Promise<boolean> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(new Error("ping timeout")), timeoutMs);
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: ctrl.signal,
      });
      return resp.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  async chat(opts: ChatOptions): Promise<LLMResponse> {
    const body = {
      model: this.model,
      messages: opts.messages.map(toOpenAIMessage),
      tools: opts.tools,
      tool_choice: opts.tools?.length ? "auto" : undefined,
      stream: false,
    };

    let lastErr: Error | undefined;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        return await this.doChat(body, opts.signal);
      } catch (e) {
        lastErr = e as Error;
        const msg = lastErr.message ?? "";
        // 不重试的情况：明确业务错误（4xx 除 429）
        if (/\b4\d\d\b/.test(msg) && !/429/.test(msg)) {
          throw lastErr;
        }
        if (attempt < this.retries) {
          console.warn(`[SenseNovaClient] attempt ${attempt + 1} failed, retrying: ${msg}`);
          await sleep(500 * (attempt + 1));
        }
      }
    }
    throw lastErr ?? new Error("SenseNovaClient: unknown error");
  }

  private async doChat(body: Record<string, unknown>, externalSignal?: AbortSignal): Promise<LLMResponse> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(new Error("SenseNovaClient: timeout")), this.timeoutMs);
    const onExternalAbort = () => ctrl.abort(externalSignal?.reason ?? new Error("aborted externally"));
    externalSignal?.addEventListener("abort", onExternalAbort);

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      const err = e as Error;
      if (err.message?.includes("fetch failed") || err.message?.includes("ECONNREFUSED")) {
        throw new Error(`SenseNovaClient: endpoint unreachable at ${this.baseUrl} — ${err.message}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`SenseNovaClient ${resp.status}: ${text.slice(0, 500)}`);
    }

    const data = (await resp.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
        finish_reason?: string;
      }>;
    };

    const choice = data.choices?.[0];
    if (!choice) throw new Error("SenseNovaClient: empty choices in response");

    const msg = choice.message ?? {};
    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id ?? `sensenova-${Math.random().toString(36).slice(2)}`,
      name: tc.function?.name ?? "unknown",
      args: safeParseArgs(tc.function?.arguments ?? "{}"),
    }));

    return {
      content: msg.content ?? null,
      toolCalls,
      finishReason: normalizeFinish(choice.finish_reason ?? "stop", toolCalls.length > 0),
    };
  }
}

function toOpenAIMessage(m: Message): Record<string, unknown> {
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
  if (m.role === "tool") {
    return {
      role: m.role,
      tool_call_id: m.tool_call_id,
      content: m.content,
    };
  }
  return { role: m.role, content: m.content };
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

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

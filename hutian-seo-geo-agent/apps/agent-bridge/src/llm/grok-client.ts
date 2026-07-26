/**
 * GrokClient —— 经本地 CLIProxyAPI 接入 xAI Grok
 *
 * Grok 在此架构中只是又一个 OpenAI 兼容 LLM 端点：
 *  - CLIProxyAPI 是 grok-build / grok CLI 启动后暴露的本地 HTTP 代理
 *  - 默认 baseUrl: http://localhost:52415/v1（grok CLI 默认端口）
 *  - 默认 model: grok-3-latest（支持 function calling）
 *
 * 设计约束（用户 T4.5+ 命门）：
 *  1. 超时：单次调用 30s，避免本地代理 hang 导致 loop 卡死
 *  2. 重试：网络/代理抖动时重试 1 次（5xx / ECONNREFUSED / ETIMEDOUT）
 *  3. 快速失败：CLIProxyAPI 未启动或崩溃时，首调立即抛错，由 buildLLM 降级
 *  4. 不降级到自身：GrokClient 只负责调 grok，降级决策在 buildLLM
 *
 * 环境变量（见 .env.example）：
 *   - GROK_PROXY_BASE  （默认 http://localhost:52415/v1）
 *   - GROK_API_KEY     （CLIProxyAPI 多数不要求，留空即可）
 *   - GROK_MODEL       （默认 grok-3-latest）
 */
import type { ChatOptions, LLMClient, LLMResponse, Message, ToolCall, ToolSchema } from "./types.ts";

export interface GrokConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  /** 单次调用超时（ms），默认 30000 */
  timeoutMs?: number;
  /** 重试次数，默认 1 */
  retries?: number;
}

export class GrokClient implements LLMClient {
  readonly name = "grok";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(cfg: GrokConfig = {}) {
    this.apiKey = cfg.apiKey ?? "";
    this.baseUrl = (cfg.baseUrl ?? "http://localhost:52415/v1").replace(/\/$/, "");
    this.model = cfg.model ?? "grok-3-latest";
    this.timeoutMs = cfg.timeoutMs ?? 30_000;
    this.retries = cfg.retries ?? 1;
    console.log(`[GrokClient] model=${this.model} baseUrl=${this.baseUrl} timeout=${this.timeoutMs}ms retries=${this.retries}`);
  }

  static fromEnv(): GrokClient {
    return new GrokClient({
      apiKey: process.env.GROK_API_KEY,
      baseUrl: process.env.GROK_PROXY_BASE,
      model: process.env.GROK_MODEL ?? "grok-3-latest",
      timeoutMs: process.env.GROK_TIMEOUT_MS ? parseInt(process.env.GROK_TIMEOUT_MS, 10) : undefined,
      retries: process.env.GROK_RETRIES ? parseInt(process.env.GROK_RETRIES, 10) : undefined,
    });
  }

  /**
   * 轻量探测 CLIProxyAPI 是否活着。
   * 用于 buildLLM 启动时快速失败降级，避免 loop 首调才卡死。
   */
  async ping(timeoutMs = 3000): Promise<boolean> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(new Error("ping timeout")), timeoutMs);
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
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
        // 不重试的情况：明确业务错误（4xx 除 429、明确不支持 function calling）
        if (msg.includes("does not support") || msg.includes("function calling") || /\b4\d\d\b/.test(msg)) {
          throw lastErr;
        }
        if (attempt < this.retries) {
          console.warn(`[GrokClient] attempt ${attempt + 1} failed, retrying: ${msg}`);
          await sleep(500 * (attempt + 1));
        }
      }
    }
    throw lastErr ?? new Error("GrokClient: unknown error");
  }

  private async doChat(body: Record<string, unknown>, externalSignal?: AbortSignal): Promise<LLMResponse> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(new Error("GrokClient: timeout")), this.timeoutMs);
    const onExternalAbort = () => ctrl.abort(externalSignal?.reason ?? new Error("aborted externally"));
    externalSignal?.addEventListener("abort", onExternalAbort);

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      const err = e as Error;
      // 本地代理未启动 / 崩溃：fetch failed / ECONNREFUSED
      if (err.message?.includes("fetch failed") || err.message?.includes("ECONNREFUSED")) {
        throw new Error(`GrokClient: CLIProxyAPI unreachable at ${this.baseUrl} — ${err.message}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`GrokClient ${resp.status}: ${text.slice(0, 500)}`);
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
    if (!choice) throw new Error("GrokClient: empty choices in response");

    const msg = choice.message ?? {};
    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id ?? `grok-${Math.random().toString(36).slice(2)}`,
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

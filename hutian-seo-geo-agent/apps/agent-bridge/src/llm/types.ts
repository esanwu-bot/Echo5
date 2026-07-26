/**
 * T4.1 · LLM 适配层类型定义
 *
 * 设计原则（自建loop.md §1）：
 *  - 把"调 LLM"抽象成可替换接口，CodeBuddy 是首个实现
 *  - 流式回调 onToken 用于未来逐 token 推 SSE；MVP 先整条聚合
 *  - toolCalls 格式对齐 OpenAI 兼容（CodeBuddy 走 /v1/chat/completions）
 */

/** OpenAI tools 格式 —— T4.2 从 MCP inputSchema 派生 */
export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object; // JSON Schema object
  };
}

/** LLM 返回的工具调用（与 OpenAI tool_calls 同构） */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** LLM 一次 chat 的返回 */
export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: "stop" | "tool_calls" | "length";
}

/** 对话消息（OpenAI 兼容） */
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string; // role="tool" 时必填
  tool_calls?: ToolCall[]; // role="assistant" 调工具时携带
}

export interface ChatOptions {
  messages: Message[];
  tools?: ToolSchema[];
  signal?: AbortSignal;
  /** 流式回调：拿到一个 token 推一次。MVP 可不传，整条聚合。 */
  onToken?: (token: string) => void;
}

export interface LLMClient {
  /** 实现名："codebuddy" | "mock" | ... */
  readonly name: string;
  /** 同步 chat（非流式或内部聚合后返回） */
  chat(opts: ChatOptions): Promise<LLMResponse>;
}

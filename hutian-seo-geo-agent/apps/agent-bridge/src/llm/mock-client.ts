/**
 * T4.1 · MockLLMClient —— 脚本化 toolCalls，不依赖 key
 *
 * 用途（自建loop.md §1）：
 *  - T4.3 验 loop 骨架时，没有 CODEBUDDY_API_KEY 也能跑通整条事件流
 *  - CI 回归：固定输入 → 固定 AgentEvent 序列
 *
 * 工作方式：按预设脚本逐 turn 返回。脚本用完则返回 finishReason="stop"。
 */
import type { ChatOptions, LLMClient, LLMResponse, ToolCall } from "./types.ts";

export interface MockScriptStep {
  /** 当 user message 包含此关键字时匹配（首个命中即用）；空串 = 默认 fallback */
  match: string;
  content?: string | null;
  toolCalls?: ToolCall[];
  finishReason?: LLMResponse["finishReason"];
}

export interface MockLLMConfig {
  /** 脚本步骤；按 user 消息匹配 */
  steps?: MockScriptStep[];
  /** 默认 model 名 */
  name?: string;
}

const DEFAULT_STEPS: MockScriptStep[] = [
  {
    match: "",
    content: "已收到指令，但 MockLLM 未配置脚本，直接收工。",
    finishReason: "stop",
  },
];

export class MockLLMClient implements LLMClient {
  readonly name: string;
  private readonly steps: MockScriptStep[];
  private turn = 0;

  constructor(cfg: MockLLMConfig = {}) {
    this.name = cfg.name ?? "mock";
    this.steps = cfg.steps?.length ? cfg.steps : DEFAULT_STEPS;
  }

  async chat(opts: ChatOptions): Promise<LLMResponse> {
    // 按对话轮次推进脚本（user message 在 loop 里不变，按内容匹配会死循环）
    // 第 0 轮：首条 user 消息；后续轮：assistant 收到 tool 结果后继续
    // 统计 messages 里 role=tool 的数量 = 已完成的工具调用数 = 当前推进到第几步
    const toolResults = opts.messages.filter((m) => m.role === "tool").length;
    const idx = Math.min(toolResults, this.steps.length - 1);
    const step = this.steps[idx];
    this.turn++;

    return {
      content: step.content ?? null,
      toolCalls: step.toolCalls ?? [],
      finishReason: step.finishReason ?? (step.toolCalls?.length ? "tool_calls" : "stop"),
    };
  }
}

/**
 * SEO 诊断场景的预设脚本 —— 验 T4.3 loop 骨架用。
 * 模拟"品牌更名 → 诊断 → trace → edit → sitemap"五步工具流。
 */
export function seoDemoScript(): MockScriptStep[] {
  return [
    {
      match: "品牌",
      content: "收到。我会先固化实体，再做可见度诊断与结构化补齐。",
      toolCalls: [
        {
          id: "mock_t1",
          name: "entity_rename",
          args: { root: ".", old_names: ["天启芯", "Tikchip"], new_name: "壶天", dry_run: true },
        },
      ],
      finishReason: "tool_calls",
    },
    {
      match: "",
      content: "实体已固化，现在运行 SEO/GEO 综合诊断。",
      toolCalls: [
        { id: "mock_t2", name: "run_diagnosis", args: { url: "https://example.com" } },
      ],
      finishReason: "tool_calls",
    },
    {
      match: "",
      content: "诊断完成，追踪 AI 引用来源与情感倾向。",
      toolCalls: [
        { id: "mock_t3", name: "trace_citations", args: { brand: "壶天", window_days: 30 } },
      ],
      finishReason: "tool_calls",
    },
    {
      match: "",
      content: "Product 结构化数据缺失，补齐 JSON-LD。",
      toolCalls: [
        { id: "mock_t4", name: "check_schema", args: { url: "https://example.com" } },
      ],
      finishReason: "tool_calls",
    },
    {
      match: "",
      content: "提交语义站点地图并验证收录。",
      toolCalls: [
        {
          id: "mock_t5",
          name: "submit_sitemap",
          args: { host: "example.com", urls: ["https://example.com/"], indexnow_key: "demo-key" },
        },
      ],
      finishReason: "tool_calls",
    },
    {
      match: "",
      content: "全部完成。本次共执行 5 个工具调用。",
      finishReason: "stop",
    },
  ];
}

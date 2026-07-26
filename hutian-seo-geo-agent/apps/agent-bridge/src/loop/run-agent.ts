/**
 * T4.3 · agent loop 核心 —— v0.3 心脏
 *
 * 一个 while 循环：调 LLM → 执行 toolCalls（经 MCP）→ 结果喂回 → 直到 LLM 不再调工具。
 * 全程产出 AgentEvent（复用前端契约，一行不改前端）。
 *
 * 终止条件（T4.6 简版）：MAX_TURNS 防死循环；LLM finishReason=stop 收工。
 */
import type { AgentEvent } from "@hutian/agent-protocol";
import type { LLMClient, Message, ToolSchema } from "../llm/types.ts";
import type { McpToolClient } from "../mcp/client.ts";

const MAX_TURNS = 15;

const SYSTEM_PROMPT = `你是壶天 SEO/GEO 智能体，通过调用工具帮助用户完成品牌实体更新、SEO/GEO 诊断、AI 引用追踪、结构化数据补齐、站点地图提交等任务。

工作原则：
1. 收到用户指令后，先简要说明计划（1-2 句），然后调用合适的工具
2. 工具返回后，简明解读结果（用 markdown 强调关键数字）
3. 一个任务可拆成多步工具调用，按依赖顺序串行
4. 不要臆测评分或数据 —— 所有结论必须来自工具返回
5. 完成所有步骤后，用一句话总结本次会话执行的工具数

可用工具经 MCP 提供，包括：run_diagnosis / check_schema / trace_citations / submit_sitemap / entity_rename。`;

export interface AgentLoopDeps {
  llm: LLMClient;
  mcp: McpToolClient;
  signal?: AbortSignal;
}

export interface AgentLoopInput {
  prompt: string;
  /** 可选：覆盖默认 system prompt */
  systemPrompt?: string;
}

/**
 * 运行 agent loop，产出 AgentEvent 流（AsyncIterable）。
 * bridge 把每个 event 推 SSE，前端 streamReducer 消费。
 *
 * 事件序列（对齐 demo-events.ts，前端零改动）：
 *   meta(totalTools) → thinking(on) → [message + plan]
 *   → 每轮: tool_start → tool_end → plan_update
 *   → thinking(off) → message(总结) → done
 */
export async function* runAgentLoop(
  input: AgentLoopInput,
  deps: AgentLoopDeps,
): AsyncIterable<AgentEvent> {
  // 1. 派生工具 schema（T4.2）
  const tools: ToolSchema[] = await deps.mcp.listToolSchemas();

  // 2. 初始化消息
  const messages: Message[] = [
    { role: "system", content: input.systemPrompt ?? SYSTEM_PROMPT },
    { role: "user", content: input.prompt },
  ];

  // 3. 发开场事件（对齐 demo 节奏）
  yield { type: "meta", totalTools: tools.length };

  let turn = 0;
  let toolCallCount = 0;
  const planItems: string[] = [];

  while (turn < MAX_TURNS) {
    turn++;
    if (deps.signal?.aborted) {
      yield { type: "message", role: "agent", content: "已中止。" };
      break;
    }

    // 4. 调 LLM 前 → thinking on
    yield { type: "thinking", on: true };

    let res;
    try {
      res = await deps.llm.chat({ messages, tools, signal: deps.signal });
    } catch (e) {
      yield { type: "thinking", on: false };
      yield {
        type: "message",
        role: "agent",
        content: `⚠️ LLM 调用失败：${(e as Error).message}`,
      };
      break;
    }

    // 5. 收到响应 → thinking off（每轮配对，前端状态不卡）
    yield { type: "thinking", on: false };

    // 6. LLM 收工 —— 推总结 message + done
    if (res.finishReason === "stop" || res.toolCalls.length === 0) {
      if (planItems.length > 0) {
        yield { type: "plan", items: planItems };
      }
      if (res.content) {
        yield { type: "message", role: "agent", content: res.content };
      }
      break;
    }

    // 7. 处理 toolCalls
    // 记录 assistant 消息（含 tool_calls，喂回 LLM 用）
    messages.push({
      role: "assistant",
      content: res.content ?? "",
      tool_calls: res.toolCalls,
    });

    // 如果是第一轮且有 content，推一条 message + plan
    if (turn === 1 && res.content) {
      yield { type: "message", role: "agent", content: res.content };
      // 从 toolCalls 派生 plan（前端用 plan 渲染左侧计划栏）
      for (const tc of res.toolCalls) {
        planItems.push(planItemForTool(tc.name, tc.args));
      }
      yield { type: "plan", items: planItems };
    }

    // 8. 串行执行每个 toolCall
    for (let i = 0; i < res.toolCalls.length; i++) {
      const call = res.toolCalls[i];
      toolCallCount++;
      const toolId = call.id || `t${toolCallCount}`;

      // tool_start
      yield {
        type: "tool_start",
        id: toolId,
        name: call.name,
        args: formatArgs(call.name, call.args),
      };

      // 调 MCP 工具
      const result = await deps.mcp.callTool(call.name, call.args);

      // tool_end
      yield {
        type: "tool_end",
        id: toolId,
        ok: result.ok,
        durationMs: result.ms,
        output: result.output,
      };

      // plan_update（第 i 个工具完成）
      yield { type: "plan_update", done: toolCallCount, current: toolCallCount };

      // 把工具结果喂回 LLM（OpenAI 格式：role=tool, tool_call_id=call.id）
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result.output),
      });

      // T4.4 流程控制钩子点（见 flow-control.ts）
      yield* flowControlHook(call.name, call.args, result, deps);
    }
    // 继续下一轮（让 LLM 看到工具结果后决定下一步）
  }

  // 8. 收尾
  if (turn >= MAX_TURNS) {
    yield { type: "thinking", on: false };
    yield {
      type: "message",
      role: "agent",
      content: `⚠️ 已达最大轮次 (${MAX_TURNS})，自动收工。已执行 ${toolCallCount} 个工具调用。`,
    };
  }

  yield { type: "done" };
}

/**
 * T4.4 流程控制钩子 —— 路线 Y 精髓：把"求 LLM 遵守"变代码强制。
 * MVP 只做关键几条（自建loop.md §4）。
 *
 * 当前实现：detect edit_file/写 JSON-LD 后自动插 check_schema 复验。
 * 注意：我们的五工具里没有 edit_file，entity_rename(dry_run=false) 是写操作，
 * 触发条件改为：entity_rename 写入后 → 自动 run_diagnosis 复验。
 */
async function* flowControlHook(
  toolName: string,
  _args: Record<string, unknown>,
  result: { ok: boolean; output: unknown },
  deps: AgentLoopDeps,
): AsyncIterable<AgentEvent> {
  // 规则：entity_rename 写入后，自动 run_diagnosis 复验
  if (toolName === "entity_rename" && result.ok) {
    const output = result.output as { written?: boolean; dry_run?: boolean } | null;
    if (output && output.dry_run === false) {
      // 自动插入一个 check_schema 调用（复验）
      yield {
        type: "tool_start",
        id: `auto_check_${Date.now()}`,
        name: "check_schema",
        args: "auto-triggered by flow-control (entity_rename written)",
      };
      const recheck = await deps.mcp.callTool("check_schema", {
        url: "https://example.com", // MVP 占位；真实场景从 entity_rename 上下文取
      });
      yield {
        type: "tool_end",
        id: `auto_check_${Date.now()}`,
        ok: recheck.ok,
        durationMs: recheck.ms,
        output: recheck.output,
      };
    }
  }
  // 未来扩展：edit_file 后 check_schema；首品牌更名优先 entity_rename(dry_run=true) 等
}

/** 从工具名派生 plan item 文本（前端左侧计划栏用） */
function planItemForTool(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "entity_rename":
      return `品牌实体更新 → ${args.new_name ?? "目标品牌"}`;
    case "run_diagnosis":
      return `运行 SEO/GEO 综合诊断`;
    case "trace_citations":
      return `追踪 AI 引用来源与情感倾向`;
    case "check_schema":
      return `补齐 Product 结构化数据（JSON-LD）`;
    case "submit_sitemap":
      return `提交语义站点地图并验证收录`;
    default:
      return `调用 ${name}`;
  }
}

/** 工具入参格式化为人类可读字符串（前端 tool_start.args 显示用） */
function formatArgs(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "entity_rename":
      return `from=${JSON.stringify(args.old_names)} → to="${args.new_name}"`;
    case "run_diagnosis":
      return `target=${args.url}`;
    case "trace_citations":
      return `brand=${args.brand} · window=${args.window_days ?? 30}d`;
    case "check_schema":
      return `url=${args.url}${args.expected_type ? ` · type=${args.expected_type}` : ""}`;
    case "submit_sitemap":
      return `host=${args.host} · ${(args.urls as string[])?.length ?? 0} URLs`;
    default:
      return JSON.stringify(args);
  }
}

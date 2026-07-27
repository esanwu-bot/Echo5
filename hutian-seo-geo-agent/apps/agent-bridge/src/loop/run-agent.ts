/**
 * T4.3 · agent loop 核心 —— v0.3 心脏
 *
 * 一个 while 循环：调 LLM → 执行 toolCalls（经 MCP）→ 结果喂回 → 直到 LLM 不再调工具。
 * 全程产出 AgentEvent（复用前端契约，一行不改前端）。
 *
 * 终止条件（T4.6 简版）：MAX_TURNS 防死循环；LLM finishReason=stop 收工。
 *
 * intent 围栏 + GuardrailPipeline（§harness 显式化 P0）：
 *  - loop 启动时调 classifyIntent 产 Intent
 *  - pipeline.before(intent) 注入硬约束到 system prompt
 *  - intent.needsClarify → 直接产 message 反问，不进循环
 *  - 每轮：pipeline.exec(toolCall, intent) 破坏性闸门 → MCP exec → pipeline.after 派生 stats/复验
 *  - 破坏性 toolCall（entity_rename dry_run=false / submit_sitemap）执行前，
 *    用 isDestructiveAuthorized(intent) 守 —— 只信规则判定的 confirm。
 */
import type { AgentEvent } from "@hutian/agent-protocol";
import type { LLMClient, Message, ToolSchema } from "../llm/types.ts";
import type { McpToolClient } from "../mcp/client.ts";
import { classifyIntent, type Intent } from "./intent.ts";
import { GuardrailPipeline } from "./guardrail-pipeline.ts";
import type { RunCtx } from "./flow-control.ts";

const MAX_TURNS = 15;

const SYSTEM_PROMPT = `你是壶天 SEO/GEO 智能体，通过调用工具帮助用户完成品牌实体更新、SEO/GEO 诊断、AI 引用追踪、结构化数据补齐、站点地图提交、AI 建站等任务。

工作原则：
1. 收到用户指令后，先简要说明计划（1-2 句），然后调用合适的工具
2. 工具返回后，简明解读结果（用 markdown 强调关键数字）
3. 一个任务可拆成多步工具调用，按依赖顺序串行
4. 不要臆测评分或数据 —— 所有结论必须来自工具返回
5. 完成所有步骤后，用一句话总结本次会话执行的工具数

可用工具经 MCP 提供，包括：
- SEO/GEO：run_diagnosis / check_schema / trace_citations / submit_sitemap / entity_rename
- 建站：cms_create_page / cms_update_content / cms_configure_product / cms_upload_media / cms_publish

建站工具用法：
- cms_create_page：创建页面/文章（title/summary/content/category_id/status）
  - content 是 markdown 格式正文；不要以一级标题（# 标题）开头，因为页面已用 <h1> 渲染 title
  - 正文标题请从二级标题（##）开始，避免 H1 重复
- cms_configure_product：创建或编辑商品（name/product_code/description/price/stock/category_id）
- cms_upload_media：上传图片/媒体（file_path）
- cms_publish：发布/上线页面或商品（id/type/status）
- 建完页面/商品后，loop 会自动调用 check_schema 复验渲染器输出的 JSON-LD 是否合法`;


export interface AgentLoopDeps {
  llm: LLMClient;
  mcp: McpToolClient;
  signal?: AbortSignal;
}

export interface AgentLoopInput {
  prompt: string;
  /** 可选：覆盖默认 system prompt */
  systemPrompt?: string;
  /** 可选：从外部传入已分类好的 intent（skip classifyIntent，用于测试/续作） */
  intent?: Intent;
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

  // 2. intent 围栏：分类（圈 1 规则快通道 + 圈 2 LLM enum）
  const intent =
    input.intent ??
    (await classifyIntent(input.prompt, { llm: deps.llm, signal: deps.signal }));

  // 3. ambiguous → 直接反问，不进 loop
  if (intent.needsClarify && intent.clarifyQuestion) {
    yield { type: "meta", totalTools: tools.length };
    yield { type: "thinking", on: true };
    yield { type: "thinking", on: false };
    yield { type: "message", role: "agent", content: intent.clarifyQuestion };
    yield { type: "done" };
    return;
  }

  // 4. before guardrail：注入硬约束到 system prompt
  const before = GuardrailPipeline.before(intent);
  const systemContent = `${input.systemPrompt ?? SYSTEM_PROMPT}${before.systemPromptSuffix}`;
  const messages: Message[] = [
    { role: "system", content: systemContent },
    { role: "user", content: input.prompt },
  ];

  // 5. 发开场事件（对齐 demo 节奏）
  yield { type: "meta", totalTools: tools.length };

  let turn = 0;
  let toolCallCount = 0;
  const planItems: string[] = [];

  // C 规则复验用 ctx：run_diagnosis 灌 lastUrl，trace_citations 灌 brand
  const ctx: RunCtx = {
    lastUrl: intent.slots.url,
    brand: intent.slots.brand,
    windowDays: intent.slots.windowDays,
  };

  while (turn < MAX_TURNS) {
    turn++;
    if (deps.signal?.aborted) {
      yield { type: "message", role: "agent", content: "已中止。" };
      break;
    }

    // 6. 调 LLM 前 → thinking on
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

    // 7. 收到响应 → thinking off（每轮配对，前端状态不卡）
    yield { type: "thinking", on: false };

    // 8. LLM 收工 —— 推总结 message + done
    if (res.finishReason === "stop" || res.toolCalls.length === 0) {
      if (planItems.length > 0) {
        yield { type: "plan", items: planItems };
      }
      if (res.content) {
        yield { type: "message", role: "agent", content: res.content };
      }
      break;
    }

    // 9. 处理 toolCalls
    messages.push({
      role: "assistant",
      content: res.content ?? "",
      tool_calls: res.toolCalls,
    });

    // 第一轮有 content → 推 message + plan
    if (turn === 1 && res.content) {
      yield { type: "message", role: "agent", content: res.content };
      for (const tc of res.toolCalls) {
        planItems.push(planItemForTool(tc.name, tc.args));
      }
      yield { type: "plan", items: planItems };
    }

    // 10. 串行执行每个 toolCall（走 GuardrailPipeline.exec → MCP → after）
    for (let i = 0; i < res.toolCalls.length; i++) {
      const call = res.toolCalls[i];
      toolCallCount++;
      const toolId = call.id || `t${toolCallCount}`;

      // tool_start（无论是否被闸门拦，都先推 tool_start）
      yield {
        type: "tool_start",
        id: toolId,
        name: call.name,
        args: formatArgs(call.name, call.args),
      };

      // exec guardrail：破坏性闸门
      const gate = GuardrailPipeline.exec(call.name, call.args, intent, toolId);
      if (!gate.allowed) {
        // 拦截：推 gate 产出的事件（tool_end ok=false）
        if (gate.events) {
          for (const ev of gate.events) yield ev;
        }
        yield {
          type: "message",
          role: "agent",
          content: `⚠️ 即将执行破坏性操作 \`${call.name}\`，参数：\n\`\`\`json\n${JSON.stringify(call.args, null, 2)}\n\`\`\`\n\n回复「确认」继续，「取消」中止。`,
        };
        // 拒绝结果喂回 LLM
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "destructive_gate_blocked",
            note: gate.rejectReason ?? "用户需回复规则判定的 confirm 词",
          }),
        });
        continue; // 继续下一个 toolCall
      }

      // 执行 MCP 工具
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

      // 把工具结果喂回 LLM
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result.output),
      });

      // after guardrail：派生 stats + 触发复验（传 ctx，可能更新 lastUrl/brand）
      const after = GuardrailPipeline.after(call.name, call.args, result, ctx);
      if (after.statsItems && after.statsItems.length > 0) {
        yield { type: "stats", items: after.statsItems };
      }
      if (after.reverifyTask) {
        yield* runReverify(after.reverifyTask, deps);
      }
    }
    // 继续下一轮
  }

  // 11. 收尾
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
 * 执行 after guardrail 派生的复验任务（C 规则）。
 * 自动插入一个 tool_start/tool_end，让前端看到复验过程。
 */
async function* runReverify(
  task: { name: string; args: Record<string, unknown>; reason: string },
  deps: AgentLoopDeps,
): AsyncIterable<AgentEvent> {
  const id = `auto_${task.name}_${Date.now()}`;
  yield {
    type: "tool_start",
    id,
    name: task.name,
    args: task.reason,
  };
  const r = await deps.mcp.callTool(task.name, task.args);
  yield {
    type: "tool_end",
    id,
    ok: r.ok,
    durationMs: r.ms,
    output: r.output,
  };
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
    case "cms_create_page":
      return `创建页面 / ${args.title ?? "未命名"}`;
    case "cms_update_content":
      return `更新页面内容 / id=${args.id}`;
    case "cms_configure_product":
      return `配置商品 / ${args.name ?? "未命名"}`;
    case "cms_upload_media":
      return `上传媒体 / ${args.file_path ?? ""}`;
    case "cms_publish":
      return `发布 ${args.type} / id=${args.id}`;
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
    case "cms_create_page":
      return `title="${args.title}" · status=${args.status ?? 1}`;
    case "cms_update_content":
      return `id=${args.id}${args.title ? ` · title="${args.title}"` : ""}`;
    case "cms_configure_product":
      return `name="${args.name}" · price=${args.price} · stock=${args.stock}`;
    case "cms_upload_media":
      return `file=${args.file_path}`;
    case "cms_publish":
      return `type=${args.type} · id=${args.id} · status=${args.status}`;
    default:
      return JSON.stringify(args);
  }
}

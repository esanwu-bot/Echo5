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
import { tryBuildArtifact } from "./artifact.ts";
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
- SEO/GEO：run_diagnosis / check_schema / trace_citations / submit_sitemap / entity_rename / analyze_content_gap
- 建站：cms_create_page / cms_update_content / cms_configure_product / cms_upload_media / cms_publish

SEO 工具用法补充：
- analyze_content_gap：内容差距分析，输入关键词经 Serper.dev（优先）/ OpenSERP 自托管（回退）抓取 SERP 竞争者页面，返回高频主题/问答/H2结构的差距矩阵与编辑简报
  - keyword 必填；my_url 可选（你的页面，用于计算缺失主题）；engine 搜索引擎（google/bing/yandex/baidu）；gl 国家地区；num_results 顶部结果数（1-10）

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
  /** 可选：会话历史（不含 system 消息）。即上一轮及更早的 user/assistant/tool 对话消息。传了则主 LLM 和 intent 围栏都感知语境。 */
  history?: Message[];
  /** 可选：每次 messages 数组变化（新 assistant/tool/user 消息 push 后）触发回调，用于把最新会话写回 session 存储。MVP 用于跨回合保持历史。 */
  onMessagesUpdated?: (latestMessages: Message[]) => void;
}

/**
 * 运行 agent loop，产出 AgentEvent 流（AsyncIterable）。
 * bridge 把每个 event 推 SSE，前端 streamReducer 消费。
 *
 * 事件序列（对齐 demo-events.ts，前端零改动）：
 *   meta(totalTools) → thinking(on) → [message + plan]
 *   → 每轮: tool_start → tool_end → plan_update
 *   → thinking(off) → message(总结) → done
 *
 * 会话记忆（§ 继续失忆修复）：
 *   input.history 含所有 prior turn（不含 system），拼到 messages 中。
 *   classifyIntent 同时传入 lastAgentMessage（承接词双重护栏）+ recentContextText
 *   （最近 2-3 轮文本，消歧用）。ambiguous 分支产出的反问消息也写入 messages，
 *   下一轮围栏能识别"我刚问了个问题，用户说继续"的承接语义。
 */
export async function* runAgentLoop(
  input: AgentLoopInput,
  deps: AgentLoopDeps,
): AsyncIterable<AgentEvent> {
  // 0. 派生分类上下文（从历史提取 lastAgentMessage + 最近 2-3 轮消歧文本）
  const lastAgentMessage = extractLastAssistantText(input.history);
  const recentContextText = buildRecentContextText(input.history);

  // 1. 派生工具 schema（T4.2）
  const tools: ToolSchema[] = await deps.mcp.listToolSchemas();

  // 2. intent 围栏：分类（圈 1 规则快通道 + 圈 2 LLM enum）—— 带历史上下文
  const intent =
    input.intent ??
    (await classifyIntent(input.prompt, {
      llm: deps.llm,
      signal: deps.signal,
      lastAgentMessage,
      recentContextText,
    }));

  // 4. before guardrail：注入硬约束到 system prompt
  const before = GuardrailPipeline.before(intent);
  const systemContent = `${input.systemPrompt ?? SYSTEM_PROMPT}${before.systemPromptSuffix}`;

  // 构造 messages：system + history（不含 system，若有）+ 本轮 user prompt
  const history = input.history && input.history.length > 0 ? [...input.history] : [];
  const messages: Message[] = [
    { role: "system", content: systemContent },
    ...history,
    { role: "user", content: input.prompt },
  ];

  // 判官：入口 log，每轮 loop 打一条 —— 确认历史带上、续没续对（肉眼即判）
  {
    const n = messages.length;
    const last = messages[n - 2]; // 倒数第二条（最后一条是本轮 user prompt）
    const lastRole = last?.role ?? "-";
    const lastSnippet = (last?.content ?? "").toString().replace(/\s+/g, " ").slice(0, 30);
    console.log(
      `[agent-loop] classify kind=${intent.kind} src=${intent.source} | messages.len=${n} | last=${lastRole}«${lastSnippet}»`,
    );
  }
  // 回调：第一次 snapshot（已有 system + history + user）
  input.onMessagesUpdated?.([...messages]);

  // 3. ambiguous → 直接反问，不进 loop（但反问消息写入 messages，下一轮可承接）
  if (intent.needsClarify && intent.clarifyQuestion) {
    yield { type: "meta", totalTools: tools.length };
    yield { type: "thinking", on: true };
    yield { type: "thinking", on: false };
    yield { type: "message", role: "agent", content: intent.clarifyQuestion };
    // 把这次反问作为 assistant 消息写入，供下一轮承接词识别"上一轮 agent 是问句"
    messages.push({ role: "assistant", content: intent.clarifyQuestion });
    input.onMessagesUpdated?.([...messages]);
    yield { type: "done" };
    return;
  }

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
      const abortMsg = "已中止。";
      messages.push({ role: "assistant", content: abortMsg });
      input.onMessagesUpdated?.([...messages]);
      yield { type: "message", role: "agent", content: abortMsg };
      break;
    }

    // 6. 调 LLM 前 → thinking on
    yield { type: "thinking", on: true };

    let res;
    try {
      res = await deps.llm.chat({ messages, tools, signal: deps.signal });
    } catch (e) {
      const errContent = `⚠️ LLM 调用失败：${(e as Error).message}`;
      messages.push({ role: "assistant", content: errContent });
      input.onMessagesUpdated?.([...messages]);
      yield { type: "thinking", on: false };
      yield { type: "message", role: "agent", content: errContent };
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
        messages.push({ role: "assistant", content: res.content });
        input.onMessagesUpdated?.([...messages]);
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
    input.onMessagesUpdated?.([...messages]);

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
        const gateMsg = `⚠️ 即将执行破坏性操作 \`${call.name}\`，参数：\n\`\`\`json\n${JSON.stringify(call.args, null, 2)}\n\`\`\`\n\n回复「确认」继续，「取消」中止。`;
        yield { type: "message", role: "agent", content: gateMsg };
        // 拒绝结果喂回 LLM（同时保留到 messages 供下一轮承接词识别）
        const toolRejectContent = JSON.stringify({
          error: "destructive_gate_blocked",
          note: gate.rejectReason ?? "用户需回复规则判定的 confirm 词",
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolRejectContent,
        });
        // 同时把即将执行的提示作为 assistant 消息写入（承接词可识别"我刚问用户确认还是取消"）
        messages.push({ role: "assistant", content: gateMsg });
        input.onMessagesUpdated?.([...messages]);
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

      // artifact_created：工具产出可渲染产物（独立于 tool_end 语义）
      // 仅白名单工具 + JSON 解析成功才产 artifact，失败静默跳过（tool_end 已显示原文）
      const artifact = tryBuildArtifact(call.name, result.output);
      if (artifact) {
        yield artifact;
      }

      // plan_update（第 i 个工具完成）
      yield { type: "plan_update", done: toolCallCount, current: toolCallCount };

      // 把工具结果喂回 LLM
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result.output),
      });
      input.onMessagesUpdated?.([...messages]);

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
    const maxTurnMsg = `⚠️ 已达最大轮次 (${MAX_TURNS})，自动收工。已执行 ${toolCallCount} 个工具调用。`;
    messages.push({ role: "assistant", content: maxTurnMsg });
    input.onMessagesUpdated?.([...messages]);
    yield {
      type: "message",
      role: "agent",
      content: maxTurnMsg,
    };
  }

  yield { type: "done" };
}

// ── 历史上下文辅助（继续失忆修复 · 判官 + 分类上下文） ──────────────

/** 从 history 提取最后一条 assistant 消息的纯文本（用于承接词双重护栏）。空或无 assistant 消息返回 undefined。 */
function extractLastAssistantText(history: Message[] | undefined): string | undefined {
  if (!history || history.length === 0) return undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === "assistant" && typeof m.content === "string" && m.content.trim()) {
      return m.content.trim();
    }
  }
  return undefined;
}

/**
 * 从 history 构造最近 N 轮的紧凑文本（用于 classifyIntent 的消歧，廉价：最多最近 4 条非 system/tool 消息，各截断 120 字）。
 * 格式："[Agent]: xxx\n[User]: yyy\n[Agent]: ..." 按出现先后。
 * 不传整段历史，保持分类操作成本恒定。
 */
function buildRecentContextText(history: Message[] | undefined): string | undefined {
  if (!history || history.length === 0) return undefined;
  const lines: string[] = [];
  for (let i = history.length - 1; i >= 0 && lines.length < 4; i--) {
    const m = history[i];
    if (m.role === "system" || m.role === "tool") continue;
    const label = m.role === "assistant" ? "Agent" : "User";
    const content = (m.content ?? "").toString().replace(/\s+/g, " ").slice(0, 120);
    if (!content) continue;
    lines.unshift(`[${label}]: ${content}`);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
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
    case "analyze_content_gap":
      return `内容差距分析 / keyword="${args.keyword ?? ""}"`;
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
    case "analyze_content_gap":
      return `keyword="${args.keyword}"${args.my_url ? ` · my_url=${args.my_url}` : ""} · engine=${args.engine ?? "google"} · gl=${args.gl ?? "us"}`;
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

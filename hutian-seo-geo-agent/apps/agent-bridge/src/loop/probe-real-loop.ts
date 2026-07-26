/**
 * T4.3 真 LLM 探针 · 验 CodeBuddy 路径产出完整 AgentEvent 序列
 *
 * 场景（用户 T4.3 验收标准）：
 *   用户输入"诊断 https://example.com" →
 *   loop 调 CodeBuddy → LLM 返回 tool_calls(run_diagnosis) →
 *   loop 执行工具 → 结果喂回 LLM →
 *   LLM 返回 message(诊断结论) → loop 收工(finishReason=stop) →
 *   产出事件序列：meta → thinking → tool_start → tool_end → message → done
 *
 * 用法：
 *   cd apps/agent-bridge && npm run probe:realloop
 *
 * 依赖：
 *  - .env 中 CODEBUDDY_API_KEY
 *  - PATH 上有 hutian-seo-mcp 命令
 *
 * 验收（自建loop.md §3 + 用户五坑预警）：
 *  1. args 格式：CodeBuddyClient 返回 args 是对象，MCP callTool 期望对象 —— 一致
 *  2. 多轮终止：MAX_TURNS=15（loop 内已设）
 *  3. tool result 格式：MCP 返回 { ok, ms, output } → loop 转 { role:"tool", tool_call_id, content }
 *  4. thinking 事件：调 LLM 前 on:true，收到响应后 on:false —— 每轮配对
 *  5. meta 事件：loop 开始时 meta(totalTools=5)
 */
import { StdioMcpClient } from "../mcp/client.ts";
import { CodeBuddyClient } from "../llm/codebuddy-client.ts";
import { runAgentLoop } from "./run-agent.ts";
import type { AgentEvent } from "@hutian/agent-protocol";

async function main() {
  console.log("=== T4.3 真 LLM 探针：CodeBuddy + 真 MCP ===\n");

  // 1. 构造依赖
  let llm: CodeBuddyClient;
  try {
    llm = CodeBuddyClient.fromEnv();
    console.log(`>>> LLM = ${llm.name} (model=${llm.model})`);
  } catch (e) {
    console.error(`!!! 无法构造 CodeBuddyClient: ${(e as Error).message}`);
    console.error("    请确认 .env 中 CODEBUDDY_API_KEY 已配置");
    process.exit(2);
  }

  const mcp = new StdioMcpClient();
  console.log(">>> MCP = hutian-seo-mcp (stdio)\n");

  // 2. 跑 loop —— 最简诊断场景
  const prompt = "请诊断 https://example.com 的 SEO 情况";
  console.log(`>>> prompt: ${prompt}\n`);
  console.log(">>> 事件流开始 ---");

  const events: AgentEvent[] = [];
  let thinkingOn = 0;
  let thinkingOff = 0;
  let toolStart = 0;
  let toolEnd = 0;

  const t0 = Date.now();
  try {
    for await (const ev of runAgentLoop({ prompt }, { llm, mcp })) {
      events.push(ev);
      logEvent(ev);
      if (ev.type === "thinking") {
        if (ev.on) thinkingOn++;
        else thinkingOff++;
      }
      if (ev.type === "tool_start") toolStart++;
      if (ev.type === "tool_end") toolEnd++;
    }
  } catch (e) {
    console.error(`\n!!! loop 异常: ${(e as Error).message}`);
    console.error((e as Error).stack);
    await mcp.close().catch(() => {});
    process.exit(1);
  } finally {
    await mcp.close().catch(() => {});
  }
  const ms = Date.now() - t0;

  // 3. 统计 + 断言
  console.log(`\n>>> 事件流结束 (总耗时 ${ms}ms) ---\n`);
  console.log("=== 统计 ===");
  console.log(`总事件数: ${events.length}`);
  console.log(`thinking on/off: ${thinkingOn}/${thinkingOff}`);
  console.log(`tool_start/end: ${toolStart}/${toolEnd}`);

  const types = events.map((e) => e.type);
  const firstTool = events.find((e) => e.type === "tool_start") as
    | { type: "tool_start"; name: string; args: string }
    | undefined;

  const checks: { name: string; ok: boolean; detail?: string }[] = [
    { name: "首事件是 meta", ok: types[0] === "meta" },
    { name: "meta.totalTools === 5", ok: events[0]?.type === "meta" && events[0].totalTools === 5 },
    { name: "thinking on/off 配对", ok: thinkingOn === thinkingOff && thinkingOn > 0, detail: `on=${thinkingOn} off=${thinkingOff}` },
    { name: "含 tool_start", ok: toolStart > 0, detail: `${toolStart}` },
    { name: "含 tool_end", ok: toolEnd > 0, detail: `${toolEnd}` },
    { name: "tool_start === tool_end", ok: toolStart === toolEnd, detail: `${toolStart} vs ${toolEnd}` },
    { name: "首个工具是 run_diagnosis", ok: firstTool?.name === "run_diagnosis", detail: firstTool?.name ?? "(无)" },
    { name: "含 message(总结)", ok: events.some((e) => e.type === "message" && (e as any).role === "agent") },
    { name: "末事件是 done", ok: types[types.length - 1] === "done" },
    { name: "loop 自然收工（非 MAX_TURNS）", ok: events.some((e) => e.type === "message" && (e as any).content?.includes?.("诊断")) },
  ];

  console.log("\n=== 结构断言 ===");
  let allOk = true;
  for (const c of checks) {
    const mark = c.ok ? "✅" : "❌";
    console.log(`  ${mark} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
    if (!c.ok) allOk = false;
  }

  // 4. dump 事件序列（作 T4.5 前端对照基线）
  console.log("\n=== 事件序列 dump（作 T4.5 前端对照基线）===");
  console.log(JSON.stringify(events, null, 2));

  if (allOk) {
    console.log("\n✅ GREEN — T4.3 真 LLM 路径通过，事件序列完整可喂 streamReducer");
    process.exit(0);
  } else {
    console.log("\n❌ RED — 事件序列有缺，需修");
    process.exit(1);
  }
}

function logEvent(ev: AgentEvent) {
  switch (ev.type) {
    case "meta":
      console.log(`  → meta(totalTools=${ev.totalTools})`);
      break;
    case "thinking":
      console.log(`  → thinking(${ev.on ? "on" : "off"})`);
      break;
    case "message":
      console.log(`  → message(${ev.role}): ${ev.content.slice(0, 80)}${ev.content.length > 80 ? "..." : ""}`);
      break;
    case "plan":
      console.log(`  → plan(${ev.items.length} items: ${ev.items.join(" | ")})`);
      break;
    case "plan_update":
      console.log(`  → plan_update(done=${ev.done}, current=${ev.current})`);
      break;
    case "tool_start":
      console.log(`  → tool_start(${ev.id}, ${ev.name}, ${ev.args})`);
      break;
    case "tool_end":
      console.log(`  → tool_end(${ev.id}, ok=${ev.ok}, ${ev.durationMs}ms)`);
      break;
    case "done":
      console.log(`  → done`);
      break;
    default:
      console.log(`  → ${ev.type}`);
  }
}

main();

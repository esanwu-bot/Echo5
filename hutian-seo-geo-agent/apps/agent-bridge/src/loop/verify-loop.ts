/**
 * T4.3 验收 · runAgentLoop 事件流验证（用 MockLLM，不依赖 key）
 *
 * 用法：
 *   cd apps/agent-bridge && pnpm verify:loop
 *
 * 验收（自建loop.md §3）：
 *   1. runAgentLoop 吐出 AgentEvent 序列
 *   2. 序列喂 streamReducer 后，前端三栏渲染和 mock 流一致
 *   3. 工具调用经 MCP 真实执行（mock LLM 决策 + 真 MCP 工具）
 *
 * 本脚本只验 1 + 3；2 在 T4.5 前端切真流时验。
 */
import { StdioMcpClient } from "../mcp/client.ts";
import { MockLLMClient, seoDemoScript } from "../llm/mock-client.ts";
import { runAgentLoop } from "./run-agent.ts";
import type { AgentEvent } from "@hutian/agent-protocol";

async function main() {
  console.log("=== T4.3 runAgentLoop 事件流验证 ===\n");

  const mcp = new StdioMcpClient();
  const llm = new MockLLMClient({ steps: seoDemoScript(), name: "mock-seo" });

  console.log(">>> 启动 runAgentLoop（MockLLM + 真 MCP 工具）...\n");
  const events: AgentEvent[] = [];
  let toolEndCount = 0;
  let toolStartCount = 0;

  try {
    for await (const ev of runAgentLoop(
      { prompt: "请帮我把品牌从「天启芯/Tikchip」更新为「壶天」，然后做一次 SEO 诊断" },
      { llm, mcp },
    )) {
      events.push(ev);
      logEvent(ev);
      if (ev.type === "tool_start") toolStartCount++;
      if (ev.type === "tool_end") toolEndCount++;
    }
  } finally {
    await mcp.close().catch(() => {});
  }

  console.log("\n=== 统计 ===");
  console.log(`总事件数: ${events.length}`);
  console.log(`tool_start: ${toolStartCount}`);
  console.log(`tool_end: ${toolEndCount}`);

  // 结构断言（接 verify:tools 的门禁思路）
  const types = events.map((e) => e.type);
  // thinking on/off 配对检查（防前端状态卡死）
  let thinkingOnCount = 0;
  let thinkingOffCount = 0;
  let thinkingBalance = 0;
  let balanceOk = true;
  for (const ev of events) {
    if (ev.type !== "thinking") continue;
    if (ev.on) {
      thinkingOnCount++;
      thinkingBalance++;
      if (thinkingBalance > 1) balanceOk = false; // 连续 on 无 off
    } else {
      thinkingOffCount++;
      thinkingBalance--;
      if (thinkingBalance < 0) balanceOk = false; // off 无对应 on
    }
  }
  const thinkingPaired = thinkingBalance === 0 && balanceOk;

  const checks: { name: string; ok: boolean; detail?: string }[] = [
    { name: "首事件是 meta", ok: types[0] === "meta" },
    { name: "含 thinking 事件", ok: types.includes("thinking") },
    { name: "thinking on/off 配对", ok: thinkingPaired, detail: `on=${thinkingOnCount} off=${thinkingOffCount} balance=${thinkingBalance}` },
    { name: "含 message 事件", ok: types.includes("message") },
    { name: "含 plan 事件", ok: types.includes("plan") },
    { name: "含 tool_start 事件", ok: toolStartCount > 0 },
    { name: "含 tool_end 事件", ok: toolEndCount > 0 },
    { name: "tool_start === tool_end", ok: toolStartCount === toolEndCount, detail: `${toolStartCount} vs ${toolEndCount}` },
    { name: "末事件是 done", ok: types[types.length - 1] === "done" },
    { name: "meta.totalTools === 5", ok: events[0].type === "meta" && events[0].totalTools === 5 },
  ];

  console.log("\n=== 结构断言 ===");
  let allOk = true;
  for (const c of checks) {
    const mark = c.ok ? "✅" : "❌";
    console.log(`  ${mark} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
    if (!c.ok) allOk = false;
  }

  if (allOk) {
    console.log("\n✅ T4.3 通过：事件流结构对齐 demo 节奏，前端零改动可消费");
    process.exit(0);
  } else {
    console.log("\n❌ T4.3 失败：事件流结构有缺，需修");
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
      console.log(`  → message(${ev.role}): ${ev.content.slice(0, 60)}...`);
      break;
    case "plan":
      console.log(`  → plan(${ev.items.length} items)`);
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

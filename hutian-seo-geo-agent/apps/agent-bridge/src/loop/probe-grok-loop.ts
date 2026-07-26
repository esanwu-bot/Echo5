/**
 * Grok 命门探针 2/2：真 LLM + 真 MCP 跑完整 loop
 *
 * 等价 probe-real-loop.ts，只是把 LLM 换成 GrokClient。
 * 断言："诊断 example.com" 跑通多轮，事件序列完整
 *        meta → thinking → tool_start → tool_end → message → done。
 *
 * 用法：
 *   1. 启动 grok CLIProxyAPI（默认 http://localhost:52415/v1）
 *   2. cd apps/agent-bridge && npm run probe:grok-loop
 */
import { GrokClient } from "../llm/grok-client.ts";
import { StdioMcpClient } from "../mcp/client.ts";
import { runAgentLoop } from "./run-agent.ts";
import type { AgentEvent } from "@hutian/agent-protocol";

async function main() {
  console.log("=== Grok 真 loop 探针 ===\n");

  const llm = GrokClient.fromEnv();
  console.log(`[probe] model=${llm.model} baseUrl=${process.env.GROK_PROXY_BASE ?? "http://localhost:52415/v1"}`);

  // ping
  const alive = await llm.ping(3000);
  console.log(`[probe] CLIProxyAPI alive=${alive}`);
  if (!alive) {
    console.error("!!! CLIProxyAPI 未响应。请确认 grok 本地代理已启动。");
    process.exit(2);
  }

  const mcp = new StdioMcpClient();
  const prompt = "请诊断 https://example.com 的 SEO 情况";
  console.log(`[probe] prompt: ${prompt}\n`);
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

  console.log(`\n>>> 事件流结束 (总耗时 ${ms}ms) ---\n`);
  console.log("=== 统计 ===");
  console.log(`总事件数: ${events.length}`);
  console.log(`thinking on/off: ${thinkingOn}/${thinkingOff}`);
  console.log(`tool_start/end: ${toolStart}/${toolEnd}`);

  const types = events.map((e) => e.type);
  const firstTool = events.find((e) => e.type === "tool_start") as
    | { type: "tool_start"; name: string; args: string }
    | undefined;

  const checks = [
    { name: "首事件是 meta", ok: types[0] === "meta" },
    { name: "meta.totalTools === 5", ok: events[0]?.type === "meta" && events[0].totalTools === 5 },
    { name: "thinking on/off 配对", ok: thinkingOn === thinkingOff && thinkingOn > 0, detail: `on=${thinkingOn} off=${thinkingOff}` },
    { name: "含 tool_start", ok: toolStart > 0, detail: `${toolStart}` },
    { name: "含 tool_end", ok: toolEnd > 0, detail: `${toolEnd}` },
    { name: "tool_start === tool_end", ok: toolStart === toolEnd, detail: `${toolStart} vs ${toolEnd}` },
    { name: "首个工具是 run_diagnosis", ok: firstTool?.name === "run_diagnosis", detail: firstTool?.name ?? "(无)" },
    { name: "含 message(总结)", ok: events.some((e) => e.type === "message" && (e as any).role === "agent") },
    { name: "末事件是 done", ok: types[types.length - 1] === "done" },
    { name: "loop 自然收工", ok: events.some((e) => e.type === "message" && (e as any).content?.includes?.("诊断")) },
  ];

  console.log("\n=== 结构断言 ===");
  let allOk = true;
  for (const c of checks) {
    const mark = c.ok ? "✅" : "❌";
    console.log(`  ${mark} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
    if (!c.ok) allOk = false;
  }

  if (allOk) {
    console.log("\n✅ GREEN — Grok 路径完整跑通 loop，可喂 streamReducer");
    process.exit(0);
  } else {
    console.log("\n❌ RED — Grok 路径 loop 不完整");
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

main().catch((e) => {
  console.error("!!! 探针异常:", e);
  process.exit(1);
});

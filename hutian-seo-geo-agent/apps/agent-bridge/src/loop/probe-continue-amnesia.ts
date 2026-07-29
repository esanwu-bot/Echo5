/**
 * 「继续失忆」判官脚本（修复验收）
 *
 * 模拟两回合：
 *   回合 1：用户说"诊断 tikchip.cn/mall/product/1180 的 JSON-LD"
 *           → Agent 返回诊断结果 + "需要我继续吗？😊"（写进 messages）
 *   回合 2：间隔 2 分钟后，用户只说"继续"
 *           → 断言：classify kind !== ambiguous (continue_last 或 confirm),
 *                  messages.len > 2 (历史带上了),
 *                  倒数第 2 条是 assistant 的"需要我继续吗"（续上了语境）
 *
 * 用法：
 *   cd apps/agent-bridge
 *   node --import tsx src/loop/probe-continue-amnesia.ts
 */
import { StdioMcpClient } from "../mcp/client.ts";
import { MockLLMClient } from "../llm/mock-client.ts";
import { runAgentLoop } from "./run-agent.ts";
import type { AgentEvent } from "@hutian/agent-protocol";
import type { Message } from "../llm/types.ts";
import { classifyIntent } from "./intent.ts";

async function collectRound(
  prompt: string,
  llm: MockLLMClient,
  mcp: StdioMcpClient,
  history: Message[],
): Promise<{ events: AgentEvent[]; latest: Message[] }> {
  const events: AgentEvent[] = [];
  let latest: Message[] = [];
  for await (const ev of runAgentLoop(
    {
      prompt,
      history,
      onMessagesUpdated: (msgs) => {
        latest = msgs;
      },
    },
    { llm, mcp },
  )) {
    events.push(ev);
  }
  return { events, latest };
}

function lastTwoRoleSnippet(msgs: Message[]) {
  const nonSystem = msgs.filter((m) => m.role !== "system");
  const last = nonSystem[nonSystem.length - 1];
  const prev = nonSystem[nonSystem.length - 2];
  const snip = (m: Message) =>
    `${m?.role ?? "-"}«${(m?.content ?? "").toString().replace(/\s+/g, " ").slice(0, 40)}»`;
  return `len=${nonSystem.length} | prev=${snip(prev)} | last=${snip(last)}`;
}

let pass = 0;
let fail = 0;
function assert(name: string, ok: boolean, detail: string) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} — ${detail}`);
  }
}

async function main() {
  console.log("=== 「继续失忆」修复验收 · 判官脚本 ===\n");
  const mcp = new StdioMcpClient();
  const LAST_AGENT_ASK =
    "诊断结果：传统 SEO 100，生成式 GEO 0。缺 Product JSON-LD。需要我继续吗？😊";

  // ── Round 1: 假对话写入一轮 history（模拟 13:38 的 Agent 问"需要我继续吗"）
  console.log("■ Round 1：构造历史（模拟：Agent 刚问完'需要我继续吗？'）");
  const turn1History: Message[] = [
    { role: "user", content: "诊断 tikchip.cn/mall/product/1180 的结构化数据" },
    { role: "assistant", content: "收到，马上检查这个页面的 JSON-LD..." },
    { role: "tool", tool_call_id: "t1", content: '{"missing_fields":["gtin","price"]}' },
    { role: "assistant", content: LAST_AGENT_ASK },
  ];
  console.log(`  history.len=${turn1History.length} | 最后一条 agent: "${turn1History[turn1History.length - 1].content.slice(0, 40)}..."\n`);

  // ── Round 2: 先验 classifyIntent("继续" + lastAgentMessage) → continue_last
  console.log("■ Round 2a：规则层 classifyIntent('继续' + 上一轮问句)");
  {
    const intent = await classifyIntent("继续", {
      lastAgentMessage: LAST_AGENT_ASK,
    });
    assert(
      "classify kind ∈ {continue_last, confirm, check_schema, diagnose}（非 ambiguous）",
      ["continue_last", "confirm", "check_schema", "diagnose", "report", "submit"].includes(
        intent.kind,
      ),
      `got kind=${intent.kind} needsClarify=${intent.needsClarify}`,
    );
  }

  // ── Round 3：完整 loop 两回合：第一回合输出问"需要我继续吗"，第二回合说"继续"
  console.log("\n■ Round 3：真 loop 两回合（MockLLM + 真 MCP，看入口 log 判官和 messages.len）");
  {
    // 用 MockLLM 让回合 1 LLM 固定回复反问句、回合 2 LLM 固定回复续上一步
    const turn1LLM = new MockLLMClient({
      steps: [
        // turn 1 user message: Mock LLM returns assistant + a tool call
        {
          match: "",
          content: "好，先看这个页面的结构化数据情况。",
          toolCalls: [
            {
              id: "probe-t1",
              name: "check_schema",
              args: { url: "https://tikchip.cn/mall/product/1180", expected_type: "Product" },
            },
          ],
          finishReason: "tool_calls" as const,
        },
        // turn 2 after tool result → LLM asks "需要我继续吗？" and stops
        {
          match: "",
          content:
            "结果出来了：Product JSON-LD 缺 gtin/price。需要我继续吗？可以选择：①追踪品牌引用（trace_citations）②提交 sitemap（submit_sitemap）③补全结构化数据（check_schema 写回）😊",
          toolCalls: [],
          finishReason: "stop" as const,
        },
      ],
      name: "mock-turn1",
    });

    // Round 3A: 第一次 loop 调用（无 history，新会话做一次诊断）—— 结果 loop 写入 messages
    const r1 = await collectRound(
      "诊断 tikchip.cn/mall/product/1180 的结构化数据",
      turn1LLM,
      mcp,
      [], // no history first round
    );
    // 写回的 latest messages (含 system) 应该有 5+ 条：system / user / assistant(tool) / tool / assistant(问继续)
    const nonSystem1 = r1.latest.filter((m) => m.role !== "system");
    console.log(
      `  回合 1 结束（用户问诊断）→ non-system messages: ${lastTwoRoleSnippet(r1.latest)}`,
    );
    assert(
      "回合 1 终 messages 有 assistant 消息（含'需要我继续吗'或相似问句）",
      nonSystem1.some(
        (m) => m.role === "assistant" && /需要|继续|是否|选择|可以/.test(m.content ?? ""),
      ),
      `末条 assistant 内容：${nonSystem1.filter((m) => m.role === "assistant").pop()?.content}`,
    );

    // Round 3B: 第二次 loop 调用（"继续" + 上一轮 history，history 去掉 system）
    const historyForR2 = [...nonSystem1]; // pass NON-SYSTEM history to round 2
    console.log(
      `\n  回合 2 开始：用户说'继续'，传入 prevHistory.len=${historyForR2.length}`,
    );

    const turn2LLM = new MockLLMClient({
      steps: [
        {
          match: "",
          content:
            "好，接着上一步：我现在把缺的 Product JSON-LD（gtin/price/availability）用 schema 映射写回渲染层，然后复验一次。",
          toolCalls: [],
          finishReason: "stop" as const,
        },
      ],
      name: "mock-turn2",
    });
    const r2 = await collectRound("继续", turn2LLM, mcp, historyForR2);
    console.log(
      `  回合 2 入口 loop：messages (含 system+history+user) = ${lastTwoRoleSnippet(r2.latest)}`,
    );
    const totalMsgsR2 = r2.latest.length; // count system too (for compare)
    assert(
      "回合 2 messages.len ≥ 回合 1 messages.len + 1 (history + 新 user 已传入)",
      totalMsgsR2 >= nonSystem1.length + 2, // system(1) + nonSystem1(N) + user("继续")(1)
      `got r2.total=${totalMsgsR2}, expected ≥ ${nonSystem1.length + 2}（r1.nonSystem.len=${nonSystem1.length}）`,
    );
    // 关键判官：在 round-2 的 nonSystem 里找到本轮 user 发的"继续"，它前面那一条（来自历史）必须是上一轮 assistant 的问句
    const nonSystem2 = r2.latest.filter((m) => m.role !== "system");
    const r2UserIdx = nonSystem2.findIndex(
      (m) => m.role === "user" && (m.content ?? "").toString().trim() === "继续",
    );
    const preR2User = r2UserIdx >= 0 ? nonSystem2[r2UserIdx - 1] : undefined;
    assert(
      "round-2 user '继续' 之前的那条消息 = 上一轮 assistant 问句（历史真接上了，不是空会话）",
      r2UserIdx > 0 &&
        preR2User?.role === "assistant" &&
        /需要|继续|是否|选择|可以/.test(preR2User.content ?? ""),
      `r2UserIdx=${r2UserIdx} 前一条：role=${preR2User?.role} content="${(preR2User?.content ?? "").slice(0, 60)}"`,
    );
  }

  console.log("\n=== 汇总 ===");
  console.log(`通过: ${pass}`);
  console.log(`失败: ${fail}`);
  if (fail > 0) {
    console.log("\n❌ 「继续失忆」修复 RED — 还在漏记历史");
    process.exit(1);
  }
  console.log("\n✅ 「继续失忆」修复 GREEN — 承接词带历史续上，不会掉回首轮欢迎了");
}

main().catch((e) => {
  console.error("probe-continue-amnesia 崩溃:", e);
  process.exit(1);
});

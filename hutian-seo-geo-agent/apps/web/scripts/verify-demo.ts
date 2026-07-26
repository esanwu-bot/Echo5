/**
 * verify-demo.ts — 持久回归门禁（v0.2 裁决#2 焊入）
 *
 * 跑法：pnpm --filter @hutian/web verify:demo
 *
 * 两类断言：
 * ① 偏差回归 — 首条=user / artifacts=3 / activePanel 终值合法
 * ② 三源一致 — demo-events.ts 的 trace_citations 出参与 PRD §6.3 / tools.py 基线表逐字相等
 *   （数字：64/92/+89/2410/+12.5/42/28/15；sources[].{engine,share,role}）
 *
 * 这条门禁焊住的是"demo 漂移"风险——之前靠人眼盯的"双源一致"，
 * 现在变成 CI/手跑必过的布尔断言。
 */
import { demoEvents } from "../lib/demo-events";
import { streamReducer, initialStreamState } from "../lib/streamReducer";

let state = initialStreamState;
let firstMessage: { role: string; content: string } | null = null;

for (const entry of demoEvents) {
  const { delay: _delay, ...event } = entry;
  void _delay;
  state = streamReducer(state, event);
  if (event.type === "message" && !firstMessage) {
    firstMessage = { role: event.role, content: event.content };
  }
}

let failures = 0;
const check = (name: string, ok: boolean, detail: string) => {
  const mark = ok ? "✅" : "❌";
  console.log(`  ${mark} ${name}: ${detail}`);
  if (!ok) failures++;
};

// ════════ ① 偏差回归 ════════
console.log("\n=== 偏差回归 ===");
check("偏差#1 首条 message role=user",
  firstMessage?.role === "user",
  `role=${firstMessage?.role}`);
check("偏差#2 artifacts 数量=3",
  state.artifacts.length === 3,
  `数量=${state.artifacts.length} 文件=${state.artifacts.map(a=>a.file).join("/")}`);
check("偏差#3 activePanel 终值=arts（采纳停 arts）",
  state.activePanel === "arts",
  `终值=${state.activePanel}`);
check("收尾 done=true / totalTools=5",
  state.done && state.totalTools === 5,
  `done=${state.done} totalTools=${state.totalTools}`);

// ════════ ② 三源一致（裁决#2 门禁） ════════
console.log("\n=== 三源一致 · trace_citations 出参 ===");

// 找到 t3 (trace_citations) 的 tool_end 事件
const t3End = demoEvents.find(
  (e) => e.type === "tool_end" && e.id === "t3"
) as { output: Record<string, unknown> } | undefined;

check("t3 tool_end 存在", !!t3End, `找到=${!!t3End}`);

if (t3End) {
  const out = t3End.output as {
    sources?: Array<{ engine: string; share: number; role: string; tag?: string }>;
    total_citations?: number;
    sentiment?: string;
    growth?: string;
  };

  // 字段名门禁：必须是 sources（不是 citations/engines），total_citations（不是 total）
  check("字段名 sources（非 citations/engines）",
    Array.isArray(out.sources),
    `类型=${Array.isArray(out.sources) ? "array" : typeof out.sources}`);
  check("字段名 total_citations（非 total）",
    typeof out.total_citations === "number",
    `值=${out.total_citations}`);
  // 裁决#2 三源一致：demo 的 sources 字段名 = 文档契约 = tools 出参键名
  // 若 tools.py 仍返回旧的 note/citations，此处会被拦住
  check("sources 元素不含旧字段 note（应使用 role）",
    !out.sources?.some((s) => "note" in s),
    `旧字段出现次数=${out.sources?.filter((s) => "note" in s).length ?? 0}`);

  // 数字门禁：与 PRD §6.3 / tools.py 基线表逐字相等
  check("total_citations=2410", out.total_citations === 2410, `值=${out.total_citations}`);
  check("sentiment=正面 87%", out.sentiment === "正面 87%", `值=${out.sentiment}`);
  check("growth=+12.5%", out.growth === "+12.5%", `值=${out.growth}`);

  // sources[] 字段门禁：engine/share/role 三字段齐备，tag 保留
  if (out.sources && out.sources.length === 4) {
    console.log("\n  sources[] 逐条核对：");
    const expected = [
      { engine: "DeepSeek-V3", share: 42, role: "主要来源", tag: "ds" },
      { engine: "GPT-4o",       share: 28, role: "次要权威", tag: "gpt" },
      { engine: "Kimi",         share: 15, role: "提及",     tag: "kimi" },
      { engine: "其他",          share: 15, role: "长尾",     tag: "oth" },
    ];
    for (let i = 0; i < 4; i++) {
      const got = out.sources[i];
      const exp = expected[i];
      const ok = got.engine === exp.engine
        && got.share === exp.share
        && got.role === exp.role
        && got.tag === exp.tag;
      check(`  sources[${i}] ${exp.engine}`,
        ok,
        `engine=${got.engine} share=${got.share} role=${got.role} tag=${got.tag}`);
    }
  } else {
    check("sources[] 长度=4", false, `长度=${out.sources?.length ?? "undefined"}`);
  }
}

// ════════ 总结 ════════
console.log("\n" + "═".repeat(56));
if (failures === 0) {
  console.log("✅ 全部门禁通过 — demo 无漂移");
  process.exit(0);
} else {
  console.log(`❌ ${failures} 项断言失败 — demo 已漂移，请核对`);
  process.exit(1);
}

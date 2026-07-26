/**
 * intent 围栏验收 · 规则快通道断言
 *
 * 用法：
 *   cd apps/agent-bridge && pnpm verify:intent
 *
 * 断言（每条独立计数，呼应 T4.2 门禁风格）：
 *  1. confirm 闸门：规则判定，confidence ≥ 0.9，source="rule"
 *  2. cancel 闸门：规则判定，confidence ≥ 0.9，source="rule"
 *  3. rename 识别：含品牌+更名词 → kind="rename"，slots.oldNames/newName 抽到
 *  4. diagnose 识别：诊断关键词 → kind="diagnose"，slots.url 抽到
 *  5. submit 识别：sitemap/提交 → kind="submit"
 *  6. report 识别：引用/可见度 → kind="report"
 *  7. check_schema 识别：json-ld/schema → kind="check_schema"
 *  8. chitchat 识别：短句问候 → kind="chitchat"
 *  9. URL slot 抽取：裸域名 + https:// 都抽到
 * 10. windowDays slot 抽取：30 天 / 7d 抽到
 * 11. 红线：isDestructiveAuthorized 只信 rule + confirm，不信 llm
 * 12. 红线：isDestructiveToolCall 识别 entity_rename dry_run=false + submit_sitemap
 * 13. ambiguous 反问：无 LLM 时降级 ambiguous + needsClarify
 * 14. applyFlowControl(rename) 注入硬约束
 * 15. applyFlowControl(submit) 注入闸门提示
 */
import {
  classifyIntentByRule,
  classifyIntent,
  extractSlots,
  isDestructiveAuthorized,
  isDestructiveToolCall,
  type Intent,
} from "./intent.ts";
import { applyFlowControl } from "./flow-control.ts";

interface Case {
  name: string;
  input: string;
  check: (intent: Intent | null) => boolean;
  desc: string;
}

let pass = 0;
let fail = 0;

function assert(name: string, ok: boolean, desc: string) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} — ${desc}`);
  }
}

async function run() {
  console.log("=== intent 围栏 · 规则快通道断言 ===\n");

  // ── 1. confirm 闸门
  console.log("■ 1. confirm 闸门");
  for (const txt of ["确认", "确认执行", "确认写入", "ok", "yes", "干吧", "就这么办"]) {
    const r = classifyIntentByRule(txt);
    assert(
      `confirm("${txt}")`,
      r !== null && r.kind === "confirm" && r.confidence >= 0.9 && r.source === "rule",
      `got kind=${r?.kind} conf=${r?.confidence} src=${r?.source}`,
    );
  }

  // ── 2. cancel 闸门
  console.log("\n■ 2. cancel 闸门");
  for (const txt of ["取消", "中止", "算了", "cancel", "stop", "no"]) {
    const r = classifyIntentByRule(txt);
    assert(
      `cancel("${txt}")`,
      r !== null && r.kind === "cancel" && r.confidence >= 0.9 && r.source === "rule",
      `got kind=${r?.kind} conf=${r?.confidence} src=${r?.source}`,
    );
  }

  // ── 3. rename 识别 + slot 抽取
  console.log("\n■ 3. rename 识别 + slot 抽取");
  {
    const r = classifyIntentByRule("帮我把品牌从「天启芯」改为「壶天」");
    assert(
      "rename kind",
      r !== null && r.kind === "rename",
      `got kind=${r?.kind}`,
    );
    assert(
      "rename oldNames 抽到",
      r?.slots.oldNames?.includes("天启芯") === true,
      `got oldNames=${JSON.stringify(r?.slots.oldNames)}`,
    );
    assert(
      "rename newName 抽到",
      r?.slots.newName === "壶天",
      `got newName=${r?.slots.newName}`,
    );
  }

  // ── 4. diagnose 识别 + URL 抽取
  console.log("\n■ 4. diagnose 识别 + URL 抽取");
  {
    const r = classifyIntentByRule("请诊断 https://example.com 的 SEO 情况");
    assert(
      "diagnose kind",
      r !== null && r.kind === "diagnose",
      `got kind=${r?.kind}`,
    );
    assert(
      "diagnose url 抽到",
      r?.slots.url === "https://example.com",
      `got url=${r?.slots.url}`,
    );
    assert(
      "diagnose host 抽到",
      r?.slots.host === "example.com",
      `got host=${r?.slots.host}`,
    );
  }

  // ── 5. submit 识别
  console.log("\n■ 5. submit 识别");
  {
    const r = classifyIntentByRule("帮我提交 sitemap 到搜索引擎");
    assert(
      "submit kind",
      r !== null && r.kind === "submit",
      `got kind=${r?.kind}`,
    );
  }

  // ── 6. report 识别
  console.log("\n■ 6. report 识别");
  {
    const r = classifyIntentByRule("追踪一下「壶天」在 AI 引擎里的引用情况");
    assert(
      "report kind",
      r !== null && r.kind === "report",
      `got kind=${r?.kind}`,
    );
  }

  // ── 7. check_schema 识别
  console.log("\n■ 7. check_schema 识别");
  {
    const r = classifyIntentByRule("检查一下 example.com 的 JSON-LD 结构化数据");
    assert(
      "check_schema kind",
      r !== null && r.kind === "check_schema",
      `got kind=${r?.kind}`,
    );
  }

  // ── 8. chitchat 识别
  console.log("\n■ 8. chitchat 识别");
  for (const txt of ["你好", "您好", "hi", "hello", "谢谢"]) {
    const r = classifyIntentByRule(txt);
    assert(
      `chitchat("${txt}")`,
      r !== null && r.kind === "chitchat",
      `got kind=${r?.kind}`,
    );
  }

  // ── 9. URL slot 抽取（裸域名 + https://）
  console.log("\n■ 9. URL slot 抽取");
  {
    const s1 = extractSlots("看看 tikchip.cn 的情况");
    assert(
      "裸域名抽到",
      s1.host === "tikchip.cn" && Boolean(s1.url?.startsWith("https://tikchip.cn")),
      `got host=${s1.host} url=${s1.url}`,
    );
    const s2 = extractSlots("诊断 https://www.example.com/path");
    assert(
      "https URL 抽到",
      s2.url === "https://www.example.com/path" && s2.host === "www.example.com",
      `got url=${s2.url} host=${s2.host}`,
    );
  }

  // ── 10. windowDays slot 抽取
  console.log("\n■ 10. windowDays slot 抽取");
  {
    const s1 = extractSlots("最近 30 天的引用情况");
    assert("windowDays=30", s1.windowDays === 30, `got=${s1.windowDays}`);
    const s2 = extractSlots("过去 7d 的数据");
    assert("windowDays=7", s2.windowDays === 7, `got=${s2.windowDays}`);
  }

  // ── 11. 红线：isDestructiveAuthorized 只信 rule + confirm
  console.log("\n■ 11. 红线 · isDestructiveAuthorized 只信 rule+confirm");
  {
    const ruleConfirm: Intent = {
      kind: "confirm",
      confidence: 0.95,
      slots: {},
      source: "rule",
      raw: "确认",
    };
    const llmConfirm: Intent = {
      kind: "confirm",
      confidence: 0.99,
      slots: {},
      source: "llm",
      raw: "确认",
    };
    const ruleCancel: Intent = {
      kind: "cancel",
      confidence: 0.95,
      slots: {},
      source: "rule",
      raw: "取消",
    };
    assert(
      "rule confirm 放行",
      isDestructiveAuthorized(ruleConfirm) === true,
      "rule+confirm 必须放行",
    );
    assert(
      "llm confirm 拦截",
      isDestructiveAuthorized(llmConfirm) === false,
      "LLM confirm 绝不放行（红线）",
    );
    assert(
      "rule cancel 拦截",
      isDestructiveAuthorized(ruleCancel) === false,
      "cancel 必须拦截",
    );
  }

  // ── 12. 红线：isDestructiveToolCall 识别破坏性工具
  console.log("\n■ 12. 红线 · isDestructiveToolCall 识别");
  {
    assert(
      "entity_rename dry_run=false 破坏性",
      isDestructiveToolCall("entity_rename", { dry_run: false, new_name: "壶天" }) === true,
      "dry_run=false 必须识别为破坏性",
    );
    assert(
      "entity_rename dry_run=true 非破坏性",
      isDestructiveToolCall("entity_rename", { dry_run: true, new_name: "壶天" }) === false,
      "dry_run=true 是预演，非破坏性",
    );
    assert(
      "submit_sitemap 破坏性",
      isDestructiveToolCall("submit_sitemap", { host: "x.com", urls: [] }) === true,
      "submit_sitemap 必须识别为破坏性",
    );
    assert(
      "run_diagnosis 非破坏性",
      isDestructiveToolCall("run_diagnosis", { url: "x.com" }) === false,
      "诊断只读，非破坏性",
    );
  }

  // ── 13. ambiguous 反问（无 LLM 时降级）
  console.log("\n■ 13. ambiguous 反问（无 LLM 降级）");
  {
    const r = classifyIntentByRule("那个啥来着");
    assert(
      "规则未命中返回 null",
      r === null,
      "纯规则应返回 null 交 LLM 圈",
    );
    const ambiguous = await classifyIntent("那个啥来着", { llm: undefined });
    assert(
      "无 LLM 降级 ambiguous",
      ambiguous.kind === "ambiguous" && ambiguous.needsClarify === true,
      `got kind=${ambiguous.kind} clarify=${ambiguous.needsClarify}`,
    );
    assert(
      "ambiguous 有反问问题",
      typeof ambiguous.clarifyQuestion === "string" && ambiguous.clarifyQuestion.length > 0,
      "needsClarify=true 时必须有反问问题",
    );
  }

  // ── 14. applyFlowControl(rename) 注入硬约束
  console.log("\n■ 14. applyFlowControl(rename) 注入硬约束");
  {
    const intent: Intent = {
      kind: "rename",
      confidence: 0.9,
      slots: { oldNames: ["天启芯"], newName: "壶天" },
      source: "rule",
      raw: "把品牌从「天启芯」改为「壶天」",
    };
    const plan = applyFlowControl(intent);
    assert(
      "rename 注入硬约束",
      plan.systemPromptSuffix.includes("品牌前置") && plan.systemPromptSuffix.includes("entity_rename(dry_run=true)"),
      "硬约束必须含品牌前置 + dry_run=true",
    );
  }

  // ── 15. applyFlowControl(submit) 注入闸门提示
  console.log("\n■ 15. applyFlowControl(submit) 注入闸门提示");
  {
    const intent: Intent = {
      kind: "submit",
      confidence: 0.85,
      slots: { host: "x.com" },
      source: "rule",
      raw: "提交 sitemap",
    };
    const plan = applyFlowControl(intent);
    assert(
      "submit 注入闸门提示",
      plan.systemPromptSuffix.includes("破坏性操作") && plan.systemPromptSuffix.includes("confirm 闸门"),
      "submit 硬约束必须提示破坏性 + confirm 闸门",
    );
  }

  // ── 16. applyFlowControl(diagnose + url) 注入 URL 硬约束
  console.log("\n■ 16. applyFlowControl(diagnose+url) 注入 URL 约束");
  {
    const intent: Intent = {
      kind: "diagnose",
      confidence: 0.85,
      slots: { url: "https://example.com", host: "example.com" },
      source: "rule",
      raw: "诊断 example.com",
    };
    const plan = applyFlowControl(intent);
    assert(
      "diagnose 注入 URL + 工具权威",
      plan.systemPromptSuffix.includes("https://example.com") &&
        plan.systemPromptSuffix.includes("run_diagnosis"),
      "diagnose 硬约束必须含 URL + 强制调 run_diagnosis",
    );
  }

  // ── 17. applyFlowControl(chitchat) 不注入
  console.log("\n■ 17. applyFlowControl(chitchat) 不注入");
  {
    const intent: Intent = {
      kind: "chitchat",
      confidence: 0.85,
      slots: {},
      source: "rule",
      raw: "你好",
    };
    const plan = applyFlowControl(intent);
    assert(
      "chitchat 不注入硬约束",
      plan.systemPromptSuffix === "",
      `chitchat 应返回空 suffix，got="${plan.systemPromptSuffix.slice(0, 30)}..."`,
    );
  }

  // ── 汇总
  console.log("\n=== 汇总 ===");
  console.log(`通过: ${pass}`);
  console.log(`失败: ${fail}`);
  if (fail > 0) {
    console.log("\n❌ intent 围栏门禁 RED");
    process.exit(1);
  }
  console.log("\n✅ intent 围栏门禁 GREEN");
}

run().catch((e) => {
  console.error("verify-intent 崩溃:", e);
  process.exit(1);
});

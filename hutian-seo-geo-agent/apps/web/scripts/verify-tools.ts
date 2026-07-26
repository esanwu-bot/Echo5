/**
 * verify-tools.ts — 五工具出参字段名门禁（v0.2 封箱最后一道）
 *
 * 跑法：pnpm --filter @hutian/web verify:tools
 * 前置：先生成 fixture ——
 *   python hutian-seo-plugin/mcp-server/generate_fixtures.py
 *
 * 这条门禁焊住的是"tools.py 出参与文档契约 §6 三源一致"：
 * 前端 demo 的 note 拦截拦的是 TS 侧；这里拦的是 Python 侧真实出参。
 * 任何字段漂移（扁平 seo_score、sources[].note、缺 accepted/verified）都会被机器抓。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../hutian-seo-plugin/mcp-server/__fixtures__/tool_outputs.json",
);

let fixtures: Record<string, unknown>;
try {
  fixtures = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
} catch {
  console.error(`❌ 无法读取 fixture：${FIXTURE_PATH}`);
  console.error(
    "请先运行：python hutian-seo-plugin/mcp-server/generate_fixtures.py",
  );
  process.exit(1);
}

let failures = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`  ${ok ? "✅" : "❌"} ${name}: ${detail}`);
  if (!ok) failures++;
};

console.log("\n=== 五工具出参字段名门禁（tools.py 真实 JSON ↔ 文档 §6）===");

// ─── 1. run_diagnosis ───
console.log("\n--- run_diagnosis ---");
const diag = fixtures.run_diagnosis as Record<string, unknown> | undefined;
check("含 scores 嵌套", !!diag?.scores, `keys=${diag ? Object.keys(diag).join(",") : "missing"}`);
check(
  "scores.traditional_seo 是 number",
  typeof (diag?.scores as Record<string, unknown>)?.traditional_seo === "number",
  `值=${(diag?.scores as Record<string, unknown>)?.traditional_seo}`,
);
check(
  "scores.generative_geo 是 number",
  typeof (diag?.scores as Record<string, unknown>)?.generative_geo === "number",
  `值=${(diag?.scores as Record<string, unknown>)?.generative_geo}`,
);
check("含 conclusions 嵌套", !!diag?.conclusions, `keys=${diag?.conclusions ? Object.keys(diag.conclusions as object).join(",") : "missing"}`);
check(
  "conclusions.entity_clarity 是 boolean",
  typeof (diag?.conclusions as Record<string, unknown>)?.entity_clarity === "boolean",
  `值=${(diag?.conclusions as Record<string, unknown>)?.entity_clarity}`,
);
check(
  "conclusions.semantic_links 是 boolean",
  typeof (diag?.conclusions as Record<string, unknown>)?.semantic_links === "boolean",
  `值=${(diag?.conclusions as Record<string, unknown>)?.semantic_links}`,
);
check(
  "conclusions.structured_data_missing 是 boolean",
  typeof (diag?.conclusions as Record<string, unknown>)?.structured_data_missing === "boolean",
  `值=${(diag?.conclusions as Record<string, unknown>)?.structured_data_missing}`,
);
check("含 issues[] 是数组", Array.isArray(diag?.issues), `长度=${(diag?.issues as unknown[])?.length}`);
check(
  "不含旧扁平 seo_score（漂移护栏）",
  !diag || !("seo_score" in diag),
  `seo_score=${diag && "seo_score" in diag ? "存在(漂移)" : "无"}`,
);

// ─── 2. check_schema ───
console.log("\n--- check_schema ---");
const schema = fixtures.check_schema as Record<string, unknown> | undefined;
check("含 found 是 boolean", typeof schema?.found === "boolean", `值=${schema?.found}`);
check("含 missing_fields[] 是数组", Array.isArray(schema?.missing_fields), `长度=${(schema?.missing_fields as unknown[])?.length}`);
check("含 valid 是 boolean", typeof schema?.valid === "boolean", `值=${schema?.valid}`);
check("含 rich_result_eligible 是 boolean", typeof schema?.rich_result_eligible === "boolean", `值=${schema?.rich_result_eligible}`);

// ─── 3. trace_citations ───
console.log("\n--- trace_citations ---");
const cit = fixtures.trace_citations as Record<string, unknown> | undefined;
const citSources = cit?.sources as Array<Record<string, unknown>> | undefined;
check("含 sources[] 是数组", Array.isArray(citSources), `长度=${citSources?.length}`);
check(
  "sources[0].role 是 string（非旧 note）",
  typeof citSources?.[0]?.role === "string",
  `值=${citSources?.[0]?.role}`,
);
check(
  "sources[] 全部不含旧 note 字段（漂移护栏）",
  citSources?.every((s) => !("note" in s)) ?? false,
  `旧字段数=${citSources?.filter((s) => "note" in s).length ?? 0}`,
);
check("含 total_citations 是 number", typeof cit?.total_citations === "number", `值=${cit?.total_citations}`);
check("含 sentiment 是 string", typeof cit?.sentiment === "string", `值=${cit?.sentiment}`);
check("含 growth 是 string", typeof cit?.growth === "string", `值=${cit?.growth}`);

// ─── 4. submit_sitemap ───
console.log("\n--- submit_sitemap ---");
const sitemap = fixtures.submit_sitemap as Record<string, unknown> | undefined;
const targets = sitemap?.targets as Record<string, Record<string, unknown>> | undefined;
const targetKeys = targets ? Object.keys(targets) : [];
const firstTarget = targets?.[targetKeys[0]];
check("含 targets 对象", !!targets && typeof targets === "object", `keys=${targetKeys.join(",")}`);
check(
  "targets[].accepted 是 boolean",
  typeof firstTarget?.accepted === "boolean",
  `值=${firstTarget?.accepted}`,
);
check(
  "targets[].verified 存在",
  !!firstTarget && "verified" in firstTarget,
  `值=${firstTarget?.verified}`,
);
check("顶层含 note 是 string", typeof sitemap?.note === "string", `长度=${(sitemap?.note as string)?.length}`);
check("顶层含 ok 是 boolean", typeof sitemap?.ok === "boolean", `值=${sitemap?.ok}`);
check("顶层含 status 是 string", typeof sitemap?.status === "string", `值=${sitemap?.status}`);

// ─── 5. entity_rename ───
console.log("\n--- entity_rename ---");
const rename = fixtures.entity_rename as Record<string, unknown> | undefined;
check("含 files_code[] 是数组", Array.isArray(rename?.files_code), `长度=${(rename?.files_code as unknown[])?.length}`);
check("含 files_doc[] 是数组", Array.isArray(rename?.files_doc), `长度=${(rename?.files_doc as unknown[])?.length}`);
check("含 skipped_files[] 是数组", Array.isArray(rename?.skipped_files), `长度=${(rename?.skipped_files as unknown[])?.length}`);
check("含 dry_run 是 boolean", typeof rename?.dry_run === "boolean", `值=${rename?.dry_run}`);
check("含 next 是 string", typeof rename?.next === "string", `长度=${(rename?.next as string)?.length}`);

// ─── 6. 错误模型（致命） ───
console.log("\n--- entity_rename 错误模型（致命） ---");
const errOut = fixtures.entity_rename_error as Record<string, unknown> | undefined;
check("致命错误返回 {error}", typeof errOut?.error === "string", `值=${(errOut?.error as string)?.slice(0, 50)}`);

// ─── 总结 ───
console.log("\n" + "═".repeat(56));
if (failures === 0) {
  console.log("✅ 全部门禁通过 — tools.py 出参与文档契约 §6 一致");
  process.exit(0);
} else {
  console.log(`❌ ${failures} 项断言失败 — tools.py 出参有漂移，请核对`);
  process.exit(1);
}

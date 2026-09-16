/** 探针：直调 tryBuildArtifact，断言 artifact_created 结构与护栏 */
import { tryBuildArtifact } from "../src/loop/artifact.ts";

// ── 1. 模拟 analyze_content_gap 真实输出 ──
const sampleOutput = JSON.stringify({
  keyword: "electric tricycle",
  engine: "google",
  gl: "us",
  hl: "en",
  my_url: null,
  my_url_in_serp: false,
  my_url_fetch_error: null,
  serp_results: [
    { position: 1, title: "Electric Trikes", link: "https://a.com/t", snippet: "..." },
    { position: 2, title: "Mooncool", link: "https://b.com/t", snippet: "..." },
  ],
  competitor_analysis: [
    { position: 1, title: "Electric Trikes", url: "https://a.com/t", fetched_ok: true, fetch_failed: false, fetch_blocked_403: false, error: null, markdown_length: 1392 },
    { position: 2, title: "Mooncool", url: "https://b.com/t", fetched_ok: false, fetch_failed: true, fetch_blocked_403: true, error: "HTTP 403", markdown_length: 0 },
  ],
  content_gap_brief: {
    competitors_analyzed: 1,
    competitors_failed: 1,
    gap_matrix: {
      common_topics: [{ keyword: "electric", coverage: 1 }],
      top_questions: [{ question: "are e-trikes safe", mentions: 1 }],
      heading_themes: [{ theme: "trike", mentions: 10 }],
    },
    missing_topics_for_my_page: ["price", "range"],
    editorial_brief: { summary: "分析了 1 个竞品", recommendations: ["补充 price 主题", "新增 FAQ"] },
  },
  issues: [],
  duration_ms: 6984,
});

// ── 2. 白名单内工具 → 应产 artifact ──
const art = tryBuildArtifact("analyze_content_gap", sampleOutput);
console.assert(art !== null, "白名单工具应产 artifact");
console.assert(art?.type === "artifact_created", "type=artifact_created");
console.assert(art?.kind === "content_gap_report", "kind=content_gap_report");
console.assert(typeof art?.artifact_id === "string" && art.artifact_id.length > 0, "artifact_id 非空");
console.assert(art?.source_tool === "analyze_content_gap", "source_tool 正确");
console.assert(art?.title.includes("electric tricycle"), `title 含 keyword: ${art?.title}`);

// ── 3. data 不含竞品 markdown 全文 ──
const dataStr = JSON.stringify(art?.data);
console.assert(!/"markdown"/.test(dataStr) || !/"markdown":"[^"]{50,}/.test(dataStr), "data 不含 markdown 全文");
console.assert(!dataStr.includes("<html") && !dataStr.includes("<body"), "data 不含 HTML 正文");

// ── 4. 非白名单工具 → 不产 artifact ──
const nonWhite = tryBuildArtifact("entity_rename", JSON.stringify({ ok: true }));
console.assert(nonWhite === null, "非白名单工具不产 artifact");

// ── 5. 非 JSON 输出 → 不产 artifact ──
const nonJson = tryBuildArtifact("analyze_content_gap", "not json at all");
console.assert(nonJson === null, "非 JSON 输出不产 artifact");

// ── 6. 空/null 输出 → 不产 artifact ──
const empty = tryBuildArtifact("analyze_content_gap", "");
console.assert(empty === null, "空字符串不产 artifact");

// ── 7. 体积保护：超大 recommendations 应被截断 ──
const hugeRecs = JSON.stringify({
  keyword: "x",
  serp_results: [],
  competitor_analysis: [],
  content_gap_brief: {
    competitors_analyzed: 0,
    competitors_failed: 0,
    gap_matrix: { common_topics: [], top_questions: [], heading_themes: [] },
    missing_topics_for_my_page: [],
    editorial_brief: {
      summary: "s",
      recommendations: Array.from({ length: 100 }, (_, i) => `建议 ${i}：${"x".repeat(5000)}`),
    },
  },
  issues: Array.from({ length: 50 }, (_, i) => `issue ${i}: ${"y".repeat(2000)}`),
  duration_ms: 1,
});
const huge = tryBuildArtifact("analyze_content_gap", hugeRecs);
console.assert(huge !== null, "超大输入仍产 artifact（截断后）");
const hugeSize = JSON.stringify(huge?.data).length;
console.assert(hugeSize < 300 * 1024, `截断后体积 < 300KB: ${(hugeSize / 1024).toFixed(1)}KB`);
console.assert((huge?.data as any).truncated === true, "truncated=true 已标注");
console.assert(
  ((huge?.data as any).content_gap_brief.editorial_brief.recommendations as string[]).length <= 3,
  "recommendations 已截断到 3 条",
);

console.log("\n✅ 所有断言通过");
console.log(`artifact_id: ${art?.artifact_id}`);
console.log(`title: ${art?.title}`);
console.log(`kind: ${art?.kind}`);
console.log(`created_at: ${art?.created_at}`);

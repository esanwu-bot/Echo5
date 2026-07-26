import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import * as path from "node:path";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

/**
 * 保留三 · 验证用 probe：定位 rehype-raw 是否干扰 remark-gfm 表格解析
 *
 * 用例：含 raw HTML（<strong>/<span>/<code>）+ GFM 表格的混合 markdown。
 * 期望：输出 HTML 含 <table>、<thead>、<tbody>、<th>、<td>。
 *
 * 运行：pnpm --filter @hutian/web exec tsx scripts/probe-md-table.tsx
 */

const content = `诊断结论：GEO 表现强劲（<span class="text-amber font-bold">92%</span>），但 <code>Product</code> 结构化数据缺 <code>gtin</code>，会拉低生成式引擎的<strong>事实采纳率</strong>。现在写入修补。

**对照实验 · 解析层 vs 渲染层：**

GFM 竖线表格（需 remark-gfm 解析）：

| 维度 | 得分 | 备注 |
| --- | --- | --- |
| GEO 引用 | 92% | 强劲 |
| Schema 完整性 | 60% | 缺 gtin/price |
| 页面速度 | 78ms | 待优化 |
| 移动端可用性 | 95% | 优秀 |

HTML 表格（rehype-raw 直接接住）：

<table><thead><tr><th>指标</th><th>分数</th></tr></thead><tbody><tr><td>SEO</td><td>40</td></tr><tr><td>GEO</td><td>92</td></tr></tbody></table>
`;

const html = renderToStaticMarkup(
  React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeRaw],
    children: content,
  }),
);

const tableCount = (html.match(/<table/g) || []).length;
const theadCount = (html.match(/<thead/g) || []).length;
const tbodyCount = (html.match(/<tbody/g) || []).length;
const thCount = (html.match(/<th[ >]/g) || []).length;
const tdCount = (html.match(/<td[ >]/g) || []).length;
const trCount = (html.match(/<tr[ >]/g) || []).length;

console.log("=== Probe: react-markdown + remark-gfm + rehype-raw ===");
console.log("=== 对照实验：GFM 竖线表格 + HTML 原生表格 ===\n");
console.log(`Input length:        ${content.length} chars`);
console.log(`Output HTML length:  ${html.length} chars`);
console.log(`table count:         ${tableCount}  (期望 2：1 GFM + 1 HTML)`);
console.log(`thead count:         ${theadCount}  (期望 2)`);
console.log(`tbody count:         ${tbodyCount}  (期望 2)`);
console.log(`th count:            ${thCount}  (期望 5：GFM 3 + HTML 2)`);
console.log(`td count:            ${tdCount}  (期望 16：GFM 12 + HTML 4)`);
console.log(`tr count:            ${trCount}  (期望 8：GFM 5 + HTML 3)`);
console.log("");

if (tableCount === 2 && theadCount === 2 && thCount === 5) {
  console.log("✅ PASS: GFM 竖线表格 + HTML 表格都被正确渲染为 <table>");
  console.log("   → remark-gfm (解析层) + components.table (渲染层) + rehype-raw (HTML 接住) 三层全通");
} else if (tableCount === 1) {
  console.log("❌ FAIL: 只有 1 个 <table> —— remark-gfm 未挂载或未在 remarkPlugins 数组中");
  console.log("   → 仅 rehype-raw 接住了 HTML 表格，GFM 竖线语法被当成普通段落文本");
} else {
  console.log(`❌ FAIL: table=${tableCount} thead=${theadCount} th=${thCount}，预期 2/2/5`);
}

const outputHTML = html.substring(0, 4000);
console.log("\n=== Output HTML (first 4000 chars) ===\n");
console.log(outputHTML);

// 落盘 fixture（运行时证据，门禁可重跑刷新）
// cwd 是 apps/web/，../../../docs/probes/ 指向 hutianSEOGEOAGent/docs/probes/（项目根）
const fixturePath = path.resolve(process.cwd(), "../../../docs/probes/md-table-ssr.txt");
const fixtureContent = `# Probe fixture: react-markdown + remark-gfm + rehype-raw
# 对照实验：GFM 竖线表格 + HTML 原生表格
# 运行：pnpm --filter @hutian/web run probe:md-table
# 期望：table=2 thead=2 tbody=2 th=5 td=16 tr=8

Input length:        ${content.length} chars
Output HTML length:  ${html.length} chars
table count:         ${tableCount}  (期望 2：1 GFM + 1 HTML)
thead count:         ${theadCount}  (期望 2)
tbody count:         ${tbodyCount}  (期望 2)
th count:            ${thCount}  (期望 5：GFM 3 + HTML 2)
td count:            ${tdCount}  (期望 16：GFM 12 + HTML 4)
tr count:            ${trCount}  (期望 8：GFM 5 + HTML 3)

=== Output HTML ===
${outputHTML}
`;
writeFileSync(fixturePath, fixtureContent, "utf-8");
console.log(`\n=== Fixture 落盘 → ${fixturePath} ===`);

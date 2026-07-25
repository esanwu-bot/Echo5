---
name: geo-optimize
description: 提升品牌在生成式(AI)搜索引擎中的可见度。当用户询问 GEO、生成式引擎优化、AI 引用、被 ChatGPT/DeepSeek/Kimi 引用,或提升 AI 答案收录时使用。
version: 1.0.0
---

# GEO 优化 — 生成式引擎可见度

GEO(生成式引擎优化)旨在让品牌更容易被 AI 引擎准确引用。
聚焦三个杠杆:JSON-LD 完整性、实体一致性、引用信号。

## 步骤

1. **建立基线** — 运行 `run_diagnosis(url)` 与 `trace_citations(brand)`,
   获取当前 GEO 评分、实体清晰度与各引擎引用占比。
2. **JSON-LD 完整性** — 运行 `check_schema(url)`。对每个 Product /
   Organization 块,确保推荐字段存在:`name`、`brand`、`sku`、
   `gtin`、`description`、`sameAs`、`offers`(含 `price` + `priceCurrency`)。
   缺失的 Product 片段用内置 `edit_file` 编写(参见 schema-mapping 技能)。
3. **实体一致性** — 让品牌名称、`@id`、`sameAs` 链接在所有页面、
   OG 标签、站点地图与页脚中完全一致。一个规范实体,无拼写变体。
   添加一个 Wikidata / 权威 `sameAs` 目标。
4. **引用信号** — 强化 AI 引擎信任的证据链:权威第三方提及、
   FAQPage 与 TechArticle 块,以及清晰可引用的事实陈述
   (数字、规格、日期)。
5. **重新提交** — 改动后调用 `submit_sitemap(host, urls, indexnow_key)`
   让引擎快速再抓取,随后用 `trace_citations` 重新测量。

## 输出
- 更新后的 GEO 评分与实体清晰度状态。
- 已新增 / 修复的 JSON-LD 字段清单。
- 各引擎的引用占比目标,以及推动其提升的行动。

## 陷阱
- 跨页面品牌拼写不一致会碎片化实体 —— 必须全局修复。
- 占位 `gtin` / `sameAs` 在依赖前必须替换为真实值。
- GEO 增益随再抓取复利增长;编辑后务必重新提交站点地图。

## 验证
`check_schema` 报告零问题,且 `run_diagnosis` 显示更高的 GEO 评分
与 `entity_clarity: true`。

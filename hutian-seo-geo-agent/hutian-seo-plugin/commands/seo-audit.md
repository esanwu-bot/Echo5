---
name: seo-audit
description: 使用四步诊断法对指定 URL 执行完整的 SEO/GEO 诊断。
---

对以下目标执行完整的 SEO/GEO 审计: $ARGUMENTS

请遵循 `seo-audit` 技能(四步诊断法):

1. **技术爬取** — 调用 `run_diagnosis` MCP 工具,传入目标 URL。
   若参数为空,先向用户索要 URL。
2. **品牌声誉** — 根据页面推断品牌(或使用参数中提供的品牌),调用
   `trace_citations` 获取生成式引擎的引用情况。
3. **用户意图** — 评估内容与意图的匹配度,以及语义链接。
4. **性能体验** — 在可用时纳入 PageSpeed 性能分。

随后对该 URL 调用 `check_schema`,详述结构化数据状态。

报告需包含:SEO 评分、GEO 评分、实体清晰度、语义链接、结构化数据状态,
以及按影响优先级排序的问题清单与具体修复建议。

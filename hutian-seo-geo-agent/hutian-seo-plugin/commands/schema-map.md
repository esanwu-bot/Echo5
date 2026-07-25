---
name: schema-map
description: 将页面实体映射到 schema.org JSON-LD 并校验结果。
---

为以下目标映射结构化数据: $ARGUMENTS

请遵循 `schema-mapping` 技能:

1. 调用 `check_schema(url, expected_type)`,列出已发现的 `@type` 以及
   缺失的推荐字段。若参数为空,先向用户索要 URL;在可能时根据页面的
   主导实体(Product / Organization / Article)推断 `expected_type`。
2. 对每个缺失字段,使用内置 `edit_file` 编写 JSON-LD 修复 ——
   不要发明单独的生成工具。优先使用带类型的嵌套对象
   (`brand` 用 `Brand`,`offers` 用 `Offer`)。
3. 对该 URL 重新运行 `check_schema`,确认 `valid: true` 且
   `rich_result_eligible: true`。

报告需包含:发现的 JSON-LD 类型、已补齐的缺失字段、仍需真实数据
的占位值(如 `gtin` / `sameAs`),以及最终校验状态。

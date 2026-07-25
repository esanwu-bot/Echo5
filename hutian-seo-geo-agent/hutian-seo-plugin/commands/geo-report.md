---
name: geo-report
description: 生成某品牌在各 AI 引擎中的 GEO 引用报告。
---

为以下对象生成 GEO(生成式引擎优化)引用报告: $ARGUMENTS

若参数为空,先向用户索要品牌名称。

执行步骤:
1. 调用 `trace_citations` MCP 工具,传入品牌(默认窗口 30 天;
   若参数中指定了窗口则使用指定值)。
2. 汇总各引擎的引用占比(DeepSeek / GPT / Kimi / 其他)、引用总量、
   情感倾向与增速。
3. 可选:对品牌官网调用 `run_diagnosis`,将 GEO 评分与实体清晰度
   和引用表现进行关联分析。
4. 给出提升引用占比的具体建议(JSON-LD 完整性、实体一致性、
   FAQPage/TechArticle、站点地图再提交)。

输出一份简洁、结构化的 GEO 引用报告,包含上述指标与按优先级排序的
行动清单。

# hutianSEOGEOAGent

壶天 SEO/GEO Agent —— 让品牌被生成式引擎看见。

一个"会自己干活"的搜索可见度工作台:用户用一句话下达意图,Agent 自主调用
诊断、结构化数据修补、引用追踪、站点地图提交等工具,把过去需要 SEO 工程师
数天的"诊断—修复—提交—验证"闭环压缩进一次对话。

## 仓库结构

- `hutian-seo-geo-agent/` — 主工作区
  - `apps/web/` — Next.js 15(官网 SSG + 工作台客户端渲染)
  - `apps/agent-bridge/` — 常驻 SSE 桥接服务
  - `packages/agent-protocol/` — 共享 AgentEvent 契约
  - `hutian-seo-plugin/` — grok-build 插件(MCP 工具 + 技能 + 命令 + 子代理)
- `docs/qwen交接.md` — PRD、技术方案与开发计划(交接文档)

详见 `docs/qwen交接.md`。

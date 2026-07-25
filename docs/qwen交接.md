下面三份文档已按"可追溯工程文档体系"打磨：需求带 ID（`FR-`/`UX-`/`DATA-`/`NFR-`），技术方案与开发计划反向引用这些 ID，三份串成一条链，而非各自填空。所有数字、工具名、事件类型、品牌约束均来自我们前几轮沉淀的真实决策，无占位废话。

> 复制方式：每份文档以加粗行 **保存为：xxx.md** 起头，从该行复制到下一份的加粗行之前，即为该 `.md` 完整内容。建议放入仓库 `docs/` 目录。

---

**保存为：PRD.md**

# 壶天 SEO/GEO Agent · 产品需求文档（PRD）

| 项 | 值 |
|---|---|
| 文档版本 | v0.3（评审稿） |
| 状态 | Draft → 待评审 |
| 产品负责人 | ops@hutian |
| 关联文档 | 《开发技术方案（grok-build MCP 插件模式）.md》《开发计划.md》 |
| 需求追溯 | 本文 `FR/UX/DATA/NFR` 编号 → 技术方案章节 / 开发计划任务项 |
| 品牌硬约束 | 全站品牌 = **壶天**（旧称 天启芯 / Tikchip，仅作历史映射，不得在新产物中作为现行品牌出现） |

---

## 1. 一句话定位与核心机会

**壶天 SEO/GEO Agent 是一个"会自己干活"的搜索可见度工作台**：用户用一句话下达意图，Agent 自主调用诊断、结构化数据修补、引用追踪、站点地图提交等工具，把过去需要 SEO 工程师数天的"诊断—修复—提交—验证"闭环，压缩进一次对话，并让结果同时被**传统搜索引擎**与**生成式 AI 引擎**看见。

核心机会来自一个正在发生的结构性迁移：

- **传统 SEO 见顶**：关键词堆叠与外链博弈的边际收益递减，技术 SEO（CWV、结构化数据、抓取健康）成为底线而非优势。
- **GEO（生成式引擎优化）成为新战场**：DeepSeek / GPT / Kimi 等生成式引擎正在成为新的"入口"，但它们只引用**实体清晰、结构完整、证据链充分**的内容。多数站点尚未为"被 AI 引用"做任何准备。
- **能力断层**：懂 SEO 的人不写代码，写代码的人不懂 Schema.org 与实体图谱。**Agent 正是填这道断层的形态**——把方法论（四步诊断法）固化成可执行工具，把执行交给模型编排。

> 产品要赢，不赢在"又一个 SEO 工具"，而赢在**把 GEO 这件没人系统做过的事，做成开箱即用的闭环**。

---

## 2. 产品愿景与北极星指标

**愿景**：让每一个网站天生具备"被搜索、被 AI 引用"的竞争力，且这件事不需要用户懂技术。

| 层级 | 指标 | v0.1 基线 | v1.0 目标 | 口径 |
|---|---|---|---|---|
| 北极星 | 单会话闭环完成率 | — | ≥ 70% | 一次会话内完成"诊断→至少 1 项修复→提交"的会话占比 |
| 一级 | 生成式 GEO 评分中位数 | 92%（样例页） | ≥ 80%（真实接入页） | 综合诊断输出 |
| 一级 | 修复后引用增速 | +12.5%（样例） | 正向且可观测 | 引用追踪 7 日窗口 |
| 二级 | 从意图到首屏结果时延 | < 30s（建站）/ < 8s（诊断首字节） | 达标 | 端到端 |
| 二级 | 工具调用一次成功率 | — | ≥ 92% | 工具 `ok=true` 占比 |

> 注：上表"样例页"数字（92% / +12.5%）为产品演示基线，源自工作台原型，用于校准 UI 与 mock；真实目标以接入真实数据源后为准（见 §8 / 技术方案 §11）。

---

## 3. 目标用户与场景

| 画像 | 典型 JTBD（Jobs-to-be-done） | 壶天如何满足 |
|---|---|---|
| **增长/SEO 负责人**（不懂代码） | "我想知道我的产品页为什么不被 AI 提到，并修好它" | 对话式诊断 + 一键修复 + 人话报告 |
| **独立开发者/小团队** | "我没预算请 SEO，但需要站点被收录且表现好" | 官网一句话建站 + 内置 SEO/GEO 默认达标 |
| **品牌/电商运营** | "品牌改名/上新后，全网实体与结构化数据要同步更新" | `entity_rename` 全站更名 + Schema 自动重写 + 再索引 |
| **技术 SEO/前端**（进阶） | "我要批量审计、看 diff、控工具、接自己的数据源" | 工作台 Manual 模式 + MCP 工具可编程 + 产物可回滚 |

**反画像（明确不做）**：不做黑帽/群发外链/关键词堆砌工具；不做与"可见度"无关的通用 CMS 功能。

---

## 4. 品牌与领域硬约束

### 4.1 品牌约束（产品级，不可违反）

- 现行品牌统一为 **壶天**；旧称 **天启芯 / Tikchip** 仅作为"待迁移源"出现在更名工具与历史映射中。
- 所有新生成的文案、Schema `brand` 字段、OG 标签、页脚、实体 `sameAs` 锚点，必须指向壶天实体。
- 更名是**前置约束**：任何会话若涉及品牌，先固化实体再做后续优化（对应工作台首轮 `entity_rename` 优先执行）。

### 4.2 方法论资产：四步诊断法

壶天的诊断不是黑盒打分，而是固化为可复述、可执行的四步法，作为产品核心知识资产（落地为 `seo-audit` 技能）：

1. **技术爬取** — 状态码 / robots.txt / sitemap / 站点结构，确保顺畅抓取。
2. **品牌声誉** — 品牌提及、外链质量、社交信号。
3. **用户意图** — title / meta / 内容是否匹配搜索意图。
4. **性能体验** — Core Web Vitals、加载与交互响应。

### 4.3 领域数据基线表（产品演示与验收的"真值"，禁止编造新数）

| 指标 | 基线值 | 含义 |
|---|---|---|
| 传统 SEO 评分 | **64%** | 综合诊断·传统维度 |
| 生成式 GEO 评分 | **92%** | 综合诊断·生成式维度 |
| 搜索流量提升 | **+89%** | 30 日环比 |
| AI 引用量 | **2,410** | 30 日窗口 |
| 引用增速 | **+12.5%** | 周环比 |
| DeepSeek-V3 占比 | **42%** | 主要来源 |
| GPT-4o 占比 | **28%** | 次要权威 |
| Kimi 占比 | **15%** | 提及 |
| 诊断三项结论 | 实体清晰度 ✓ / 语义链接 ✓ / 结构化缺失 ⚠ | 综合诊断 |
| 示例实体 | `TC-DIODE-001` 半导体二极管 / brand=壶天 | JSON-LD 样例 |

---

## 5. 产品范围与信息架构

产品由**两个面向人的表面** + **一个面向 Agent 的能力层**组成：

```
壶天 SEO/GEO Agent
├─ 表面 A：官网 marketing（获客/转化/演示）      —— 静态优先，SSG
├─ 表面 B：工作台 workbench（执行/编排/观测）    —— 客户端 + 实时流
└─ 能力层：grok-build 插件 + MCP 工具 + 技能/命令/子代理  —— Agent 真正"干活"的手脚与大脑
```

**信息架构（IA）**

- 官网：首页（Hero 演示 + 能力 + 四步法 + 模板 + 定价 + CTA）/ 定价 / 文档入口 / 工作台入口。
- 工作台：顶栏（品牌/工作区/模型路由/主题/状态）· 左栏（会话列表 + 运行时卡片）· 中栏（对话流 + 工具调用块 + 计划清单 + 指标卡 + 输入区）· 右栏（Diff / 预览 / 终端 / 产物 四标签）· 底栏（分支/同步/工具进度/时钟）。
- 能力层：5 个 MCP 工具 + 3 技能 + 3 命令 + 2 子代理 + 钩子（详见技术方案 §6–§7）。

---

## 6. 功能需求

### 6.1 官网（marketing）

| ID | 需求 | 用户故事 | 验收 |
|---|---|---|---|
| FR-M01 | 一句话建站演示 | 作为访客，我想在首页看到"输入一句话→实时生成站点"的过程，以理解产品 | Hero 演示窗含打字机循环、骨架流光、3D 悬停、浮动指标（Lighthouse 98 / GEO 92%） |
| FR-M02 | 能力陈述 | 作为访客，我想快速知道壶天能做什么 | 6 项能力（自然语言建站/SEO 原生/GEO/性能/响应式/一键部署），跳出死板等分卡布局 |
| FR-M03 | 四步诊断法呈现 | 作为访客，我想理解壶天的方法论 | 深色区块四步流程，带序号与悬停反馈 |
| FR-M04 | 模板中心 | 作为访客，我想从模板起步 | ≥3 行业模板（SaaS/电商/作品集），含 Schema 标签 |
| FR-M05 | 定价与切换 | 作为访客，我想看清价格 | 三档（免费/专业/企业），月/年切换实时变价，中间档高亮 |
| FR-M06 | 工作台入口 | 作为访客，我想进入执行环境 | 导航与 CTA 直达 `/workbench` |

### 6.2 工作台（workbench）

| ID | 需求 | 用户故事 | 验收 |
|---|---|---|---|
| FR-W01 | 会话与运行时可视 | 作为用户，我想看到上下文/工具/MCP/沙箱状态 | 左栏运行时卡片：上下文窗口、模型路由、工具数、MCP 连接、沙箱隔离 |
| FR-W02 | 对话流 + 工具调用块 | 作为用户，我想看清 Agent 每一步在干什么 | 工具块含 running(spinner)→done(✓+耗时)，旧块自动折叠，可手动展开 |
| FR-W03 | 计划清单 | 作为用户，我想看到执行计划与进度 | 计划项随进度 pending→now→ok 逐项点亮 |
| FR-W04 | 思考态 | 作为用户，我想知道模型在思考而非卡死 | 思考三点动效，事件驱动出现/消失 |
| FR-W05 | 指标卡 | 作为用户，我想看到结果量化 | 收尾 4 卡（流量+89%/GEO 92%/引用 2410/增速+12.5%）数字滚动 |
| FR-W06 | Diff 联动 | 作为用户，我想看到 Agent 改了什么 | `edit_file` 完成时右栏切到 Diff 并高亮闪，行级 add/del 配色 |
| FR-W07 | 终端与产物 | 作为用户，我想看命令与产出文件 | 终端追加日志含光标；产物列表随事件增长，可下载/回滚 |
| FR-W08 | 输入与模式 | 作为用户，我想追加指令并控制自主度 | 首轮 done 后可编辑；Enter 发送；Auto/Manual 模式切换 |
| FR-W09 | 主题切换 | 作为用户，我想在深/浅间切换 | 顶栏或左下切换，整页平滑过渡，**不污染官网配色** |
| FR-W10 | 模型路由 | 作为进阶用户，我想选择底层模型 | 下拉切换 DeepSeek-V3/GPT-4o/Kimi-K2，带 toast 反馈 |

### 6.3 能力层（Agent 工具与知识）

| ID | 需求 | 对应工具/资产 | 验收 |
|---|---|---|---|
| FR-A01 | 综合诊断 | `run_diagnosis` | 输出传统/GEO 双评分 + 三项结论 + 问题清单（四步法） |
| FR-A02 | 结构化数据校验 | `check_schema` | 检测指定 `@type` 必填字段缺失，给出富媒体资格判定 |
| FR-A03 | 引用追踪 | `trace_citations` | 输出各引擎占比/情感/增速，支持真实 API 与示意回退 |
| FR-A04 | 站点地图提交 | `submit_sitemap` | 经 IndexNow 提交，返回状态与提交数 |
| FR-A05 | 品牌实体更名 | `entity_rename` | 默认 dry_run 先统计，确认后写盘；跳过 .git/node_modules |
| FR-A06 | 方法论技能 | `seo-audit`/`geo-optimize`/`schema-mapping` | 技能文本可被 Agent 检索并遵循 |
| FR-A07 | 斜杠命令 | `/seo-audit`/`/geo-report`/`/schema-map` | 命令触发对应技能编排 |
| FR-A08 | 专家子代理 | `seo-auditor`/`geo-optimizer` | 子代理带工具白名单与角色提示 |

---

## 7. 交互与体验要求（让产品"活"）

| ID | 要求 | 说明 |
|---|---|---|
| UX-01 | 状态可感知 | 每个异步动作有 running/done/error 三态可视反馈，杜绝"无响应"假死感 |
| UX-02 | 渐进揭示 | 消息/工具块/卡片渐入；滚动揭示用于官网 |
| UX-03 | 环境层 | 工作台与官网均含分层背景（网格底纹 + 多色光晕），非纯平铺 |
| UX-04 | 微交互 | 悬停上浮/边框点亮/图标位移；主题与模式切换有过渡 |
| UX-05 | 字号字重对比 | 标题用 display 字体与强字重，与正文形成层级，避免一片灰 |
| UX-06 | 反馈闭环 | 用户每次输入都有"已接收→编排→执行→摘要"的完整回路 |
| UX-07 | 不惊吓 | 自动播放/动效克制，不阻塞阅读；工具块自动折叠旧项以降低噪声 |

---

## 8. 数据需求

| ID | 数据 | 来源（v0.1 示意 / v1.0 真实） | 用于 |
|---|---|---|---|
| DATA-01 | 抓取健康/状态码/robots/sitemap | 自写爬虫 | 诊断·技术爬取 |
| DATA-02 | Core Web Vitals / 性能分 | PageSpeed Insights API | 诊断·性能体验 |
| DATA-03 | 结构化数据 JSON-LD | 页面解析 `application/ld+json` | 诊断·GEO / 校验 |
| DATA-04 | 搜索流量/收录 | Google Search Console / Bing Webmaster API | 流量分析 |
| DATA-05 | AI 引用量/占比/情感/增速 | 自建引用监测后端（`HUTIAN_CITATION_API`） | 引用追踪 |
| DATA-06 | 收录提交回执 | IndexNow API | 站点地图提交 |

> v0.1 在缺真实密钥/后端时，工具返回与基线表一致的**示意结构**（不报错、不阻塞演示）；v1.0 接真实源。示意与真实的切换由环境变量驱动，前端契约不变。

---

## 9. 非功能需求

| ID | 维度 | 要求 |
|---|---|---|
| NFR-01 | 性能 | 官网首屏 LCP < 2.5s，Lighthouse 性能 ≥ 95；工作台首屏可交互 < 1.5s |
| NFR-02 | 实时性 | 工具事件端到端 < 300ms（不含工具自身耗时）；SSE 心跳 ≤ 15s |
| NFR-03 | 兼容 | 现代 evergreen 浏览器；工作台 ≥ 1280px 三栏，< 1240px 隐藏右栏，< 900px 抽屉左栏 |
| NFR-04 | 可访问 | 键盘可达、焦点可见、对比度达标、动效尊重 `prefers-reduced-motion` |
| NFR-05 | 安全 | 密钥不下前端；MCP/bridge 经 BFF 鉴权代理；远程插件 source 必须 SHA pin |
| NFR-06 | 可观测 | 工具调用成功率/时延/会话闭环率可埋点 |
| NFR-07 | 国际化 | 默认中文；文案与 token 结构支持后续多语言（不在 v0.1 范围） |
| NFR-08 | 可回滚 | 产物随会话归档，文件改动可一键回滚 |

---

## 10. 关键流程

**旅程一：从一句话到上线（建站）**
访客输入意图 → AI 规划结构/文案/Schema → 实时预览 → 可视化微调 → 绑定域名一键发布 → 自动 IndexNow 提交 → 搜索与 AI 同步可见。

**旅程二：诊断—修复闭环（GEO）**
用户给 URL → `run_diagnosis`（四步法）→ 报告双评分+三项结论 → 若结构化缺失 → `check_schema` 定位缺字段 → Agent 用内置编辑写 JSON-LD → 右栏 Diff 闪 → `submit_sitemap` 触发再索引 → `trace_citations` 验证引用变化 → 指标卡收尾。

**旅程三：品牌更名（实体迁移）**
用户声明更名 → `entity_rename(dry_run=true)` 统计命中 → 用户确认 → `dry_run=false` 写盘 → 重写 Schema `brand`/`sameAs` → 写 301 重定向 → 提交再索引。

---

## 11. 指标与埋点

- 会话级：会话 ID、工具调用序列、各工具 ok/耗时、是否触发 diff/terminal/artifact、闭环是否完成。
- 页面级：官网各 CTA 点击、定价切换、模板使用；工作台主题/模式/模型切换、输入发送。
- 结果级：诊断双评分分布、修复后引用增速、提交回执成功率。

---

## 12. 版本规划（产品视角）

| 版本 | 主题 | 含能力 | 对应 FR |
|---|---|---|---|
| v0.1 | 看得见 | 官网 + 工作台 UI + mock 时间线全链路 + 主题 | FR-M*, FR-W01–W10 |
| v0.2 | 干得了（本地） | MCP 五工具本地可跑 + 技能/命令/子代理 + bridge 演示流 | FR-A* |
| v1.0 | 接得真 | 接真实数据源 + Phase3 接 grok headless/ACP + 鉴权 + 部署 | DATA-* 真实化, NFR-05 |

---

## 13. 验收标准（Definition of Done）

- [ ] `pnpm install` 无 peer 报错；`pnpm dev` 同时起 web(:3000) 与 bridge(:4317)
- [ ] `/` 官网：导航滚动变色、Hero 3D+打字机、数据条滚动、定价月/年切价、滚动揭示
- [ ] `/workbench`：进入自动播 mock 时间线；5 工具块 spinner→✓ 且旧块折叠；`edit_file` 触发 Diff 闪
- [ ] 计划清单逐项点亮；收尾指标卡数字滚动；输入框 done 后可编辑并触发新一轮
- [ ] 主题深↔浅平滑，**官网配色不变**
- [ ] `tsc --noEmit` 零报错；`next build` 通过；`/` 静态/ISR、`/workbench` 客户端渲染
- [ ] 含中文源文件 UTF-8 无乱码；工具名跨文件一字不差
- [ ] 演示数字与 §4.3 基线表一致，无编造

---

## 14. 术语表

| 术语 | 释义 |
|---|---|
| SEO | 传统搜索引擎优化 |
| GEO | 生成式引擎优化（Generative Engine Optimization） |
| MCP | Model Context Protocol，工具/资源接入协议 |
| ACP | Agent Client Protocol，Agent 嵌入外部程序的协议 |
| JSON-LD | 结构化数据标记格式（Schema.org 载体） |
| IndexNow | 主动通知搜索引擎 URL 变更的协议 |
| CWV | Core Web Vitals，核心网页指标 |
| 四步诊断法 | 技术爬取/品牌声誉/用户意图/性能体验 |

---

## 15. 开放问题 / 待决

1. 引用监测后端（DATA-05）自建方案的采集频率与合规边界，需法务确认对各引擎的调用方式。
2. 企业版私有部署的 SSO 与数据驻留要求，待首个企业客户输入。
3. 多语言（NFR-07）排期取决于出海计划，暂列 v1.x。

---
---

**保存为：开发技术方案（grok build MCP 插件模式）.md**

# 壶天 SEO/GEO Agent · 开发技术方案（grok-build MCP 插件模式）

| 项 | 值 |
|---|---|
| 版本 | v0.3 |
| 关联 | PRD（需求 ID：`FR/UX/DATA/NFR`）· 开发计划（任务 ID：`T*`） |
| 决策基调 | **不 fork grok-build 内核**，用其官方扩展系统（MCP + skills + commands + agents + hooks + plugin）做插件；前端 Next.js，bridge 常驻服务接 Agent 运行时 |

---

## 0. 阅读指引与追溯

- 本文实现 PRD 的功能/非功能需求；每个设计点尽量标注 `← FR-xx / NFR-xx`。
- 开发计划的任务项 `T*` 反向落到本文章节（见 §16 矩阵）。
- 凡涉及"真实数据/真实 grok"的，均标注 **Phase**；v0.1/v0.2 用 mock 或本地，不阻塞界面。

---

## 1. 设计目标与约束

- **可演进**：v0.1 纯前端 mock → v0.2 本地 MCP → v1.0 接 grok 与真实数据，**前端契约全程不变**。
- **可隔离**：官网与工作台互不污染（构建、样式、渲染策略）。
- **可观测**：Agent 的每一步以结构化事件流暴露，前端只做"渲染事件"。
- **可回退**：示意数据与真实数据由环境变量切换，工具签名稳定。
- 约束：Windows 10 开发环境；不先编译 grok（84 万行 Rust，Win 上数小时，Phase3 才需要）。

---

## 2. 技术选型与"为什么是插件模式"（ADR）

**决策**：采用 grok-build 插件模式（路线 A），否决 fork 内核（路线 B）。

| 维度 | 路线 A 插件模式 ✅ | 路线 B fork 内核 ❌ |
|---|---|---|
| 工作量 | 小（Python/TS + Markdown） | 极大（啃 84 万行 Rust） |
| 升级 | 跟随上游无冲突 | 每次同步地狱级 merge |
| 能力覆盖 | 工具/知识/子代理/钩子全覆盖 | 仅当需改 Agent loop/TUI 才有意义 |
| 风险 | 受扩展点能力边界约束 | 长期维护成本不可控 |

**结论**：壶天需求 = 领域工具 + 方法论知识 + 自有前端，**恰好落在扩展系统甜区**，无需碰内核。grok 自带文件编辑/终端/搜索工具，故 `edit_file` 等复用内置，本方只补 SEO/GEO 领域工具。

**栈**：Next.js 15（App Router）+ React 19 + TS · Tailwind + next-themes · pnpm workspaces + Turborepo · Node 常驻 bridge · Python MCP server（FastMCP）。刻意不引 shadcn/xterm/zustand 等重依赖，降低 Win 安装失败率（Diff/终端/Markdown 轻量自实现）。

---

## 3. 总体架构

```
浏览器
 ├─ 官网 (marketing)            ← Next.js SSG/ISR，固定品牌色，不读工作台主题变量
 └─ 工作台 (workbench)          ← 客户端组件 + EventSource
        │  SSE (/api/sessions/[id]/stream)        POST messages
        ▼
   Next.js Route Handler (BFF：鉴权 + 代理)        ← NFR-05
        │  SSE / HTTP
        ▼
   Agent Bridge (Node 常驻)      ← 持有会话、编排、翻译事件   ← NFR-02
        │  Phase3: spawn grok --headless / ACP client
        ▼
   grok-build (运行时)  ──调用──▶  hutian-seo MCP server (Python)
        │                              ├ run_diagnosis   ← FR-A01
        │                              ├ check_schema    ← FR-A02
        │                              ├ trace_citations ← FR-A03
        │                              ├ submit_sitemap  ← FR-A04
        │                              └ entity_rename   ← FR-A05
        └── 内置工具 edit_file / terminal / search（复用，不重写）
```

三层职责铁律：**Next.js 只渲染 + 代理，不跑 Agent**；**Bridge 持有会话并翻译事件**；**MCP 提供领域工具**。Serverless 无法维持长会话，故 bridge 必须常驻。

---

## 4. 仓库与目录结构

```
hutian-seo-geo-agent/
├─ package.json / pnpm-workspace.yaml / turbo.json / tsconfig.base.json
├─ packages/agent-protocol/src/index.ts        ← 共享 AgentEvent 契约（§5）
├─ apps/
│  ├─ web/                                     ← Next.js 15（§8）
│  │  ├─ app/
│  │  │  ├─ (marketing)/page.tsx                ← 官网 SSG
│  │  │  ├─ (workbench)/workbench/page.tsx      ← 工作台
│  │  │  ├─ (workbench)/api/sessions/[id]/stream/route.ts  ← SSE 代理
│  │  │  └─ layout.tsx / globals.css
│  │  ├─ components/{workbench,chat,ui}/
│  │  └─ lib/{useAgentSession,streamReducer,mockStream,markdown}.ts
│  └─ agent-bridge/src/server.ts               ← 常驻 SSE（§9/§10）
├─ hutian-seo-plugin/                          ← grok 插件（§6/§7）
│  ├─ .grok-plugin/plugin.json
│  ├─ .mcp.json
│  ├─ mcp-server/hutian_seo_mcp/{tools.py,__main__.py}
│  ├─ skills/{seo-audit,geo-optimize,schema-mapping}/SKILL.md
│  ├─ commands/{seo-audit,geo-report,schema-map}.md
│  ├─ agents/{seo-auditor,geo-optimizer}.md
│  └─ hooks/hooks.json
├─ hutian-marketplace/.grok-plugin/marketplace.json
└─ docs/{PRD.md, 开发技术方案…md, 开发计划.md}
```

---

## 5. 共享契约：AgentEvent（唯一真相源）

前后端 + bridge 三方共用，**type 名禁止改名**（PRD 验收项）。

```ts
export type AgentEvent =
  | { type: "meta"; totalTools: number }
  | { type: "thinking"; on: boolean }
  | { type: "message"; role: "user" | "agent"; content: string }
  | { type: "plan"; items: string[] }
  | { type: "plan_update"; done: number; current: number }
  | { type: "tool_start"; id: string; name: string; args: string }
  | { type: "tool_end"; id: string; ok: boolean; durationMs: number; output: unknown }
  | { type: "diff"; data: DiffData }
  | { type: "terminal"; line: string }
  | { type: "artifact"; data: ArtifactData }
  | { type: "stats"; items: StatItem[] }
  | { type: "done" };
```

| type | 语义 | 驱动的前端表现 | 对应 FR/UX |
|---|---|---|---|
| meta | 会话元信息（工具总数） | 状态栏分母 | FR-W01 |
| thinking | 思考开关 | 三点动效出现/消失 | FR-W04, UX-01 |
| message | 用户/Agent 文本 | 气泡（markdown 渲染） | FR-W02, UX-06 |
| plan / plan_update | 计划与进度 | 清单逐项点亮 | FR-W03 |
| tool_start / tool_end | 工具生命周期 | 块 spinner→✓+耗时，旧块折叠 | FR-W02, UX-01/07 |
| diff | 文件变更 | 右栏切 Diff + 高亮闪 | FR-W06 |
| terminal | 命令日志 | 终端追加 + 光标 | FR-W07 |
| artifact | 产物 | 产物列表增长 | FR-W07, NFR-08 |
| stats | 收尾指标 | 指标卡数字滚动 | FR-W05 |
| done | 回合结束 | 解锁输入、状态栏空闲 | FR-W08 |

**工具块状态机**：`running`（spinner）→ `done`（✓ + durationMs）/ `error`；新工具出现时，已 `done` 的旧块自动折叠（UX-07）。

**reducer 原则**：纯函数，按 type 追加/更新 timeline；`thinking` 为单例（出现新消息/工具时清除）。

---

## 6. MCP Server 设计（五工具）

传输：stdio，由 grok 拉起；命令名 `hutian-seo-mcp`。环境变量：`PAGESPEED_API_KEY`、`HUTIAN_CITATION_API`。

| 工具 | 入参 | 出参（要点） | 真实源 / 回退 |
|---|---|---|---|
| `run_diagnosis(url)` | url | `{scores:{traditional_seo,generative_geo}, performance, conclusions:{entity_clarity,semantic_links,structured_data_missing}, issues[]}` | 爬虫+PageSpeed / 中性占位 ← FR-A01, DATA-01/02/03 |
| `check_schema(url, expected_type)` | url, type | `{found, missing_fields[], valid, rich_result_eligible}` | 页面 JSON-LD 解析 ← FR-A02 |
| `trace_citations(brand, window_days)` | brand, days | `{sources[{engine,share,role}], total_citations, sentiment, growth}` | `HUTIAN_CITATION_API` / 基线表示意 ← FR-A03, DATA-05 |
| `submit_sitemap(host, urls, indexnow_key)` | host, urls, key | `{status, ok, submitted, targets}` | IndexNow API ← FR-A04, DATA-06 |
| `entity_rename(root, old_names, new_name, dry_run=true)` | 路径/旧名/新名/空跑 | `{dry_run, total_matches, files_affected, files[], next}` | 本地文件系统 ← FR-A05 |

**错误模型**：工具不抛异常给模型，统一返回 `{error: "..."}` JSON，保证编排不中断；`ok` 字段在 `tool_end` 反映。

**`entity_rename` 安全**：仅处理文本/标记扩展名；跳过 `.git/node_modules/dist/build/.next/__pycache__`；`dry_run=true` 只统计，`next` 字段提示二次确认。

**Product JSON-LD 基线（写入与校验参照）**：

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "半导体二极管",
  "brand": "壶天",
  "description": "高性能半导体器件，适用于工业控制与物联网。",
  "sku": "TC-DIODE-001",
  "sameAs": ["https://www.wikidata.org/wiki/Q128888"],
  "offers": { "@type": "Offer", "availability": "https://schema.org/InStock", "price": "12.80", "priceCurrency": "CNY" }
}
```

---

## 7. 插件资产设计

- **skills/**（方法论，frontmatter 字段以 grok `user-guide` 为准）：`seo-audit`（四步法，引用 `run_diagnosis`/`trace_citations`）、`geo-optimize`（实体/语义/结构化/引用四抓手）、`schema-mapping`（业务→JSON-LD，含 Product 模板与 `check_schema` 复验流程）。
- **commands/**：`/seo-audit <url>`、`/geo-report <brand>`、`/schema-map <url>`，正文用 `$ARGUMENTS` 编排技能。
- **agents/**：`seo-auditor`（工具白名单 `run_diagnosis,check_schema`）、`geo-optimizer`（白名单含 `entity_rename,submit_sitemap,trace_citations`），各带角色与优先级规则。
- **hooks/**：`PostToolUse` 匹配 `edit_file|write_file`，提示"改了 .jsonld 记得 `check_schema`"（事件名以 user-guide 为准）。
- **plugin.json / .mcp.json / marketplace.json**：清单 + MCP 注册 + 本地 source（远程 source 必须 40 位 SHA pin，← NFR-05）。

---

## 8. 前端架构（Next.js 15）

- **Route Groups 隔离**：`(marketing)` 与 `(workbench)` 各自 layout；官网固定品牌色（`--indigo` 等），**不读** `--bg*/--text`，确保切主题不污染官网（← FR-W09, NFR-01）。
- **主题**：`next-themes` `attribute="class"`；`globals.css` 中 `:root`=浅、`.dark`=深；切换 0.3s 过渡。
- **字体**：`next/font/google` 注入 `--font-disp`(Space Grotesk) / `--font-sans`(Noto Sans SC) / `--font-mono`(JetBrains Mono)；**禁止 `<link>` 外链字体**（避免 CLS 与国内不稳，← NFR-01）。
- **组件树**：`TopBar / Sidebar(含 RuntimeCard) / ChatStream(Message|ToolCall|PlanChecklist|StatTiles|ThinkingDots) / RightPanel(Diff|Preview|Terminal|Artifacts) / Composer / StatusBar`。
- **数据流**：`useAgentSession(mode)` → `useReducer(streamReducer)`；`mode="mock"` 用 `mockStream`，`mode="sse"` 用 `EventSource`。
- **mock 时间线编排**（← §5 状态机，顺序固定）：`meta → thinking → user → plan(5) → t1 entity_rename → t2 run_diagnosis → t3 trace_citations → agent → t4 edit_file(+diff 闪+切标签) → t5 submit_sitemap(+terminal+artifact) → stats → agent → done`。数字取自 PRD §4.3。
- **轻量自实现**：内联 markdown（`**bold**`/`` `code` ``/列表）、Diff 行渲染、终端光标，避免重依赖。

---

## 9. 实时通信（SSE）

- 链路：bridge `GET /sessions/:id/events`（`text/event-stream`，心跳 `: ping\n\n` ≤15s，← NFR-02）→ Next BFF `route.ts` 透传 `upstream.body` → 前端 `EventSource`。
- 发送：前端 `POST /api/sessions/[id]/messages` → BFF → bridge `session.send()`。
- 背压/断线：bridge 在 `req.close` 清理订阅；前端 `onerror` 关闭并提示，v1.0 加指数退避重连 + `Last-Event-ID` 续传。
- 鉴权在 BFF 层完成，bridge 不直接暴露公网（← NFR-05）。

---

## 10. Phase3 接 grok-build

两种模式，v1.0 二选一或并存：

- **模式 A（推荐起步）headless**：bridge `spawn('grok', ['--headless','--plugin','hutian-seo'])`，逐行解析 stdout → 映射为 `tool_start/tool_end/message/diff/terminal` → 推 SSE。
- **模式 B ACP**：bridge 作 ACP client 嵌入 grok，结构化拿事件，映射更准但接入更重。

**输出→事件映射**：识别工具调用边界（开始/结束/耗时）、文件编辑（→`diff`，行级 add/del 由 grok 编辑结果或内置 diff 生成）、终端输出（→`terminal`）、最终文本（→`message`）。

**fake-grok 模拟器**：为不装 grok 也能验证全链路 SSE，bridge 内置一个按脚本吐行的 fake 进程，接口与真 grok 同构，便于 CI 与本地联调。

---

## 11. 数据源接入清单

| 能力 | 真实源 | 环境变量 | 阶段 |
|---|---|---|---|
| 性能/CWV | PageSpeed Insights | `PAGESPEED_API_KEY` | v1.0 |
| 流量/收录 | GSC / Bing Webmaster | OAuth/密钥 | v1.0 |
| 引用监测 | 自建后端 | `HUTIAN_CITATION_API` | v1.0 |
| 收录提交 | IndexNow | key（需 `/<key>.txt` 可访问） | v0.2 可本地验 |
| 抓取/JSON-LD | 自写爬虫+解析 | — | v0.2 |

---

## 12. 安全、合规与供应链

- grok-build 为 **Apache 2.0**，可商用二开，保留 LICENSE 与版权声明；根 `Cargo.toml` 只读，改依赖改各 crate。
- 远程插件 source 必须 pin 完整 40 位 SHA；第三方插件作者自负，注意供应链（← NFR-05）。
- 密钥仅存 bridge/服务端 env，不下前端；BFF 校验会话归属。

---

## 13. 工程规范

- **编码**：含中文源文件统一 UTF-8。⚠️ Windows 10 的 `.ps1` 若经 PS5.1 执行需 **UTF-8 with BOM**，否则按 GBK 误读、引号被吞导致 `out-file` 路径崩溃（已踩坑，记录在案）。`.ts/.tsx/.py` 走 UTF-8 无 BOM 即可。
- **类型**：`tsc --noEmit` 零报错为门禁；共享类型只放 `agent-protocol`。
- **目录约定**：共享逻辑入 `lib/`，UI 入 `components/`，路由入 `app/` 对应 group。
- **lint**：turbo `lint` 任务接入。

---

## 14. 部署拓扑

| 服务 | 平台 | 说明 |
|---|---|---|
| `apps/web` | Vercel | 官网 SSG + 工作台 + SSE 代理 |
| `apps/agent-bridge` | Railway / Fly.io / ECS | **常驻**，Serverless 不行 |
| `hutian-seo` MCP | 随 bridge 部署 | `pip install -e` 后由 grok 调用 |

环境变量：`AGENT_BRIDGE_URL`、`PAGESPEED_API_KEY`、`HUTIAN_CITATION_API`、鉴权密钥。

---

## 15. 风险与降级

| 风险 | 降级 |
|---|---|
| grok headless 输出格式变动 | fake-grok 兜底 + 解析层加适配 |
| 真实数据源无密钥 | 工具回退示意结构，前端契约不变 |
| SSE 断连 | 心跳 + 重连 + Last-Event-ID |
| Win 编译 grok 耗时 | Phase1/2 不编译，用 mock/本地 MCP |
| 并行写覆盖根 layout/globals | 见开发计划"并行边界" |

---

## 16. 需求—实现可追溯矩阵

| 需求 ID | 实现章节 / 文件 |
|---|---|
| FR-A01..A05 | §6 tools.py |
| FR-A06..A08 | §7 skills/commands/agents |
| FR-W01..W10 | §8 组件树 + §5 事件 |
| FR-M01..M06 | §8 (marketing) |
| UX-01..07 | §5 状态机 + §8 动效/过渡 |
| DATA-01..06 | §6 + §11 |
| NFR-01 | §8 字体/SSG |
| NFR-02 | §9 心跳/时延 |
| NFR-05 | §9 BFF + §12 |
| NFR-08 | §5 artifact + 产物归档 |

---
---

**保存为：开发计划.md**

# 壶天 SEO/GEO Agent · 开发计划

| 项 | 值 |
|---|---|
| 版本 | v0.3 |
| 关联 | PRD（`FR/UX/DATA/NFR`）· 技术方案（章节 §x） |
| 排期假设 | 1 名全栈执行（Qoder）+ 1 名上游设计/review（我）+ 产品验收（你）；周为单位 |
| 环境基线 | Windows 10 · Node 20+ · pnpm 9+ · Git · Python 3.10+（MCP） |

---

## 0. 排期与分工总则

- **执行 / review / 验收三分离**：Qoder 落地文件并跑通命令；我做对照 review 与补漏；你按 PRD §13 验收。
- **界面优先于内核**：Phase1/2 不编译 grok，先让 `pnpm dev` 出界面与 mock 全链路；Rust/grok 留 Phase3。
- **契约先行**：`agent-protocol` 在任何前后端代码之前定稿并锁定。

---

## 1. 里程碑总览

| 里程碑 | 周 | 主题 | 出口标准 | 对应版本 |
|---|---|---|---|---|
| M0 | W0 | 环境与骨架 | `setup.ps1` 跑通，骨架落盘，UTF-8 BOM 坑已规避 | — |
| M1 | W1 | 脚手架 + 契约 | monorepo 装依赖成功；`agent-protocol` 定稿；tsc 通过 | v0.1 起 |
| M2 | W2 | 前端双表面 + mock 全链路 | `/` 与 `/workbench` 可访问，mock 时间线自动播放，主题切换正常 | v0.1 |
| M3 | W3 | 本地 MCP + 插件资产 | 五工具本地可调用；skills/commands/agents 装载；bridge 演示流 | v0.2 |
| M4 | W4 | 接 grok + 真实数据 | headless/ACP 跑通或 fake-grok 全链路；≥1 真实数据源接入 | v1.0 起 |
| M5 | W5 | 鉴权 + 部署 + 验收 | BFF 鉴权、Vercel+常驻 bridge 部署、PRD §13 全绿 | v1.0 |

---

## 2. 分期详述

### Phase 0 — 环境与骨架（M0）
- 目标：在 Win10 零摩擦生成骨架，规避编码坑。
- 任务：`T0.1` 生成 monorepo 根配置；`T0.2` 生成 `agent-bridge` SSE 骨架；`T0.3` 生成插件清单/marketplace；`T0.4` 验证 `.ps1` UTF-8 BOM 自举命令。
- 产出：15 个骨架文件。验收：脚本无报错、控制台中文不乱码。

### Phase 1 — 脚手架 + 契约（M1）← 技术方案 §4/§5
- 任务：`T1.1` 定稿 `agent-protocol`（12 type，锁名）；`T1.2` 配 Next.js15 + Tailwind + next-themes + next/font；`T1.3` 建 Route Groups 与 globals 主题 token；`T1.4` `pnpm install` + `tsc` 门禁。
- 验收：依赖安装成功；类型检查通过；**根 layout/globals 自此锁定**（见 §3 并行边界）。

### Phase 2 — 前端双表面 + mock 全链路（M2）← 技术方案 §5/§8，PRD FR-M*/FR-W*
- 任务：`T2.1` 官网 SSG（Hero 3D+打字机、能力、四步法、模板、定价切换、滚动揭示）；`T2.2` 工作台组件（TopBar/Sidebar/ChatStream/ToolCall/RightPanel/Composer/StatusBar）；`T2.3` `streamReducer` + `mockStream`（固定编排，数字取 PRD §4.3）；`T2.4` 主题切换（不污染官网）；`T2.5` `next build` 验证渲染策略。
- 验收：PRD §13 中前端相关项全绿；mock 时间线无需手点自动播放。

### Phase 3 — 本地 MCP + 插件资产（M3）← 技术方案 §6/§7，PRD FR-A*
- 任务：`T3.1` `tools.py` 五工具（含 dry_run 与错误模型）；`T3.2` 三技能 + 三命令 + 二子代理 + hooks；`T3.3` bridge 演示模式事件流（不依赖 grok 也能推 SSE）；`T3.4` 本地 marketplace 装载，TUI 验证工具被调用。
- 验收：工具名跨文件一字不差；`/seo-audit` 等命令触发编排；bridge `:4317` 推流正常。

### Phase 4 — 接 grok + 真实数据（M4）← 技术方案 §10/§11
- 任务：`T4.1` bridge `spawn grok --headless` 解析层 或 ACP client；`T4.2` fake-grok 模拟器（CI/无 grok 联调）；`T4.3` 接 ≥1 真实源（建议先 PageSpeed 或 IndexNow）；`T4.4` 输出→事件映射单测。
- 验收：mock 与真 Agent 两条流前端渲染一致；真实源缺密钥时优雅回退。

### Phase 5 — 鉴权 + 部署 + 验收（M5）← 技术方案 §9/§12/§14，PRD NFR-05
- 任务：`T5.1` BFF 鉴权与会话归属校验；`T5.2` SSE 重连 + Last-Event-ID；`T5.3` Vercel + 常驻 bridge 部署脚本；`T5.4` 埋点（§11 指标）；`T5.5` 全量验收 + 文档归档。
- 验收：PRD §13 全绿；线上 `/` 静态、`/workbench` 实时。

---

## 3. 任务依赖与并行边界（高发冲突点）

- **契约先于一切**：`T1.1` 完成前，不写 reducer/bridge/mock 的事件结构。
- **根文件先锁**：`app/layout.tsx`、`globals.css` 由 `T1.2/T1.3` 一次性写完并锁定；后续并行任务**只往各自 Route Group 加文件**，不回头改根文件（并行 Agent 互覆盖的头号坑）。
- **工具名闭环**：`T3.1`（tools.py）与 `T3.2`（skills/commands）须同批提交或互相 review，确保五工具名 `run_diagnosis/check_schema/trace_citations/submit_sitemap/entity_rename` 一字不差。
- **可并行**：Phase2 内 `T2.1`（官网）与 `T2.2`（工作台组件）可并行（前提是根文件已锁）；Phase3 内 `T3.1` 与 `T3.3` 可并行。
- **不可并行/须串行**：`T2.3`（reducer+mock）依赖 `T1.1`；`T4.1` 依赖 `T3.3` 的演示流接口稳定。
- **Rust 延后**：grok 编译不进 M0–M3 任何关键路径。

---

## 4. 分工矩阵

| 角色 | 职责 | 不做 |
|---|---|---|
| Qoder（执行） | 落地文件、跑 `pnpm install/dev/build`、看真实报错迭代 | 不擅自改 `agent-protocol` 类型名；不回头改已锁根文件 |
| 我（上游/review） | 设计交接、对照 review、补漏、写 Phase3 适配与 fake-grok | 不抢执行、不在 Qoder 运行时贴冲突代码 |
| 你（验收） | 按 PRD §13 与本计划出口标准验收、决策开放问题 | — |

**review 触发**：每里程碑结束，或 Qoder 报错卡住时，提交产物（文件/diff/截图/日志）给我，按"契约一致/路由隔离/主题字体/编排还原/数据真值/工具名闭环/编码/设计完成度/可构建"九维核对，⚠️ 附补丁。

---

## 5. 风险登记册

| ID | 风险 | 概率 | 影响 | 应对 | owner |
|---|---|---|---|---|---|
| R1 | Win 编译 grok 耗时数小时 | 高 | 高 | Phase1–3 不编译；Phase4 用 fake-grok 先行 | 执行 |
| R2 | PS5.1 读 `.ps1` 按 GBK 误读致崩溃 | 已发生 | 中 | 自举转 UTF-8 BOM；或 VSCode 存 BOM | 执行 |
| R3 | 并行写覆盖根 layout/globals | 中 | 高 | §3 先锁根文件 | 执行+review |
| R4 | 工具名跨文件不一致 | 中 | 中 | §3 同批提交+review | review |
| R5 | 真实引用监测无 API/合规未定 | 高 | 中 | 示意回退；PRD §15 待决 | 产品 |
| R6 | SSE 断连/背压 | 中 | 中 | 心跳+重连+Last-Event-ID（T5.2） | 执行 |
| R7 | grok headless 输出格式变动 | 中 | 中 | 解析适配层+fake-grok 兜底 | 执行 |
| R8 | 重依赖致 Win 安装失败 | 中 | 中 | 刻意最小依赖，Diff/终端/md 自实现 | 执行 |

---

## 6. 环境与前置 checklist

- [ ] Node 20+（`node -v`）
- [ ] pnpm 9+（`npm i -g pnpm`）
- [ ] Git（推仓库）
- [ ] Python 3.10+（MCP，Phase3）
- [ ] 含中文文件 UTF-8；`.ps1` 经 PS5.1 执行需 BOM
- [ ] **不**在 M0–M3 编译 grok-build

---

## 7. 交付物清单

- 代码：`apps/web`、`apps/agent-bridge`、`packages/agent-protocol`、`hutian-seo-plugin`、`hutian-marketplace`
- 文档：`docs/PRD.md`、`docs/开发技术方案（grok build MCP 插件模式）.md`、`docs/开发计划.md`
- 脚本：`setup.ps1`（含 BOM 自举说明）
- 配置：部署脚本（Vercel/Railway）、CI（lint+type+MCP 单测，M5）

---

## 8. 验收与质量门禁

| 门禁 | 命令/动作 | 阶段 |
|---|---|---|
| 类型 | `tsc --noEmit` / turbo build 内检查 | M1 起 |
| 构建 | `pnpm build`（`/` 静态、`/workbench` 客户端） | M2 起 |
| 运行 | `pnpm dev` 起 :3000 + :4317 | M2 起 |
| 契约 | 三方 `AgentEvent` 同源、type 未改名 | 每次 review |
| 体验 | PRD §13 全项 | M2/M5 |
| 工具闭环 | 五工具名跨文件一致 | M3 |

---

## 9. 沟通与变更机制

- 变更契约（`agent-protocol`）或根文件：须先同步三方，更新本计划与技术方案版本号。
- 开放问题（PRD §15）由产品决策后回写 PRD，并评估对排期影响。
- 每里程碑结束产出"完成说明 + 已知偏差"，偏差入风险登记册。

---

## 10. 附录：周视图（文本甘特）

```
        W0      W1      W2      W3      W4      W5
M0 环境  █
M1 脚手架        █
M2 前端+mock             ███
M3 MCP+插件                      ███
M4 接grok+真数据                         ███
M5 鉴权+部署+验收                                ███
关键路径: 契约(T1.1) → reducer/mock(T2.3) → bridge演示(T3.3) → 接grok(T4.1) → 部署(T5.3)
并行带:   官网(T2.1) ‖ 工作台组件(T2.2)；tools.py(T3.1) ‖ bridge演示(T3.3)
```

---

三份文档到此结束，已构成 **PRD（做什么/为何/验收）→ 技术方案（怎么做/契约/架构）→ 开发计划（何时/谁/风险）** 的可追溯闭环，需求 ID 贯穿三者。

需要的话，我可以下一步：① 把这三份也并进 `setup.ps1` 的 `docs/` 写入逻辑；② 或直接给 Qoder 一段"按 M1→M2 顺序开工、遵守并行边界"的执行提示词。你说一声即可。
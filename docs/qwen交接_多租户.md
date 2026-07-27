收到。多租户这块我按我们这程的"可追溯工程文档体系"出三份（PRD 补充 / 数据库设计 / 开发计划补充），需求带 ID、三份串成链、带门禁和开工顺序，可直接复制转交 Trae。

先给你（不是给 Trae）几句衔接，讲清我设计时拍的几个关键决策和诚实边界，免得你转交时心里没底：

- **隔离策略用"混合模式"**，这是多租户的命门，我写成 ADR：壶天自己的元数据（租户/订阅/席位/凭证/用量）用**共享库 + `tenant_id` 列**隔离；租户的业务数据（文章/商品/SEO）在 siteBase，而 siteBase 是单租户的（trace 第 5 节实锤无 tenant_id），所以业务数据靠**每 workspace 一套 siteBase 实例**隔离（trace 缺口 6 的方案 a），不在 siteBase 表里加 tenant_id（方案 b 改 80+ 表太重）。串数据的风险面因此分两块，文档里分别给探针守。
- **租户 : workspace = 1 : N**，这是对前面脉络的一次诚实细化——前面说"workspace≈品牌≈租户"是单品牌客户的简化，正式多租户里租户是计费/登录主体（公司），workspace 是品牌/站主体（一个站一套 siteBase 映射 + 一套品牌配置）。这正好把我上轮挂的"brand 单源第三段 = workspace 派生"焊成硬需求：渲染器/兜底 settings 的品牌从 workspace 取，全局 env 壶天降为平台默认。否则多租户上线后所有客户的站兜底都挂壶天牌子。
- **数据模型是新建**，诚实标清：知识库里没有已落档的多租户表，我前面口头提过的 Tenant/Subscription 是模型名不是真值，文档不引用任何"已存在的多租户文档"当依据，免得 Trae 去找一份不存在的东西。
- **M6 单独立里程碑**，不塞进 M5——M5 的 BFF 鉴权是单租户语境的会话归属，多租户是租户隔离+席位+订阅，工作量大，塞进去会把 M5 撑爆，也违背你"建站先、会员租户后"的排序。
- **不阻塞 Trae 当前的活**：截图里 Trae 正在做 B2 整站导航扩展（SiteNav + about/news/faq/contact），那是建站腿 (a) 的活。这份多租户文档**可与它并行准备、不要求它停下手头的活**，等 B2 整站收一段再让 Trae 接 M6。转交时跟它说一句"先收 B2 整站，多租户文档先读、排进 M6"即可。

复制方式同前：每份以加粗行 `保存为：xxx.md` 起头，复制到下一份加粗行之前即为该文件完整内容，建议放 `docs/`。

---

**保存为：docs/多租户-PRD补充.md**

# 壶天 SEO/GEO Agent · 多租户与商业化 PRD 补充

| 项 | 值 |
|---|---|
| 文档版本 | v0.1（多租户首稿） |
| 状态 | Draft → 待评审 |
| 关联 | PRD v0.3（`FR/UX/DATA/NFR`）· 技术方案 v0.3 · 开发计划 v0.3 · `tp6-trace.md` §5/§6 |
| 需求追溯 | 本文 `FR-T/FR-S/NFR-T` → 数据库设计 §表 → 开发计划 `T6.x` |
| 范围声明 | 本补充服务**形态 2 托管 SaaS**（每租户数据隔离 + 订阅计费）。形态 3 桌面授权**共用 `tenants/subscriptions` 模型**，但授权服务（License Server）另立文档，不在本补充展开。 |
| 现状校准 | 壶天侧此前**无**多租户元数据表，本设计为**新建**；siteBase 为单租户（trace §5），业务数据隔离靠"每 workspace 一套 siteBase 实例"，不靠 siteBase 加 tenant_id。 |

## 0. 一句话定位

多租户让壶天从"单品牌演示工具"变成"多客户 SaaS 平台"：每个客户（租户）登录自己的壶天后台，管自己的品牌/站/席位/订阅，数据与别的租户完全隔离；壶天 Agent 在租户上下文里跑建站+SEO，渲染出来的站挂**该租户的品牌**而非壶天。

## 1. 核心概念与关系（先对齐词，再写需求）

| 概念 | 定义 | 与既有脉络的衔接 |
|---|---|---|
| **租户 tenant** | 计费/登录主体，通常=一个公司 | 新建 |
| **工作区 workspace** | 品牌/站主体，一个站=一个 workspace=一套 siteBase 实例映射+一套品牌配置 | 前面"workspace=品牌"的正式化；**租户 1:N workspace** |
| **席位 seat** | 租户内一个可登录成员 + 角色 | 新建 |
| **订阅 subscription** | 租户的套餐+周期+配额 | 与桌面授权共用模型 |
| **租户凭证 tenant_credential** | 该租户对应 siteBase 实例的访问凭证（加密存） | 接 trace §6，每租户一套，不全局共享 |

关系：`tenant 1—N workspace 1—1 siteBase 实例`；`tenant 1—N seat`；`tenant 1—1 subscription`；`workspace 1—1 tenant_credential`。

> 为什么 1:N 而非 1:1：出海客户常一公司多品牌/多站；1:N 让"brand 单源第三段=workspace 派生"自然落地（每 workspace 一个品牌）。M6 起步 siteBase 实例按 workspace 1:1 部署，数据模型预留"多 workspace 共享实例+siteBase 内 tenant_id"演进位（不现在做，见数据库设计 ADR-2）。

## 2. 功能需求 · 多租户隔离（FR-T）

| ID | 需求 | 用户故事 | 验收 |
|---|---|---|---|
| FR-T01 | 租户上下文注入 | 作为平台，每个请求必须带明确的 tenant+workspace，无上下文不得访问任何业务数据 | 中间件缺上下文即 401/403；无"全局默认租户"旁路 |
| FR-T02 | 数据隔离 | 作为租户 A，我绝不能看到/改到租户 B 的会话/站/产物 | `probe:tenant-isolation` 绿（见开发计划门禁） |
| FR-T03 | workspace 级品牌派生 | 作为租户，我的站挂我的品牌，不挂壶天 | 渲染器/兜底 settings 的 brand+业务文案从 workspace 取；全局 env 壶天仅作平台最后兜底 |
| FR-T04 | 站点实例路由 | 作为平台，按 workspace 路由到正确的 siteBase 实例 | workspace→siteBase 映射表命中；路由错配返回明确错误，不静默落到别租户实例 |
| FR-T05 | 跨租户操作禁止 | 作为平台，URL/参数里篡改 workspace_id 不得越权 | 所有业务查询强制 `where tenant_id=ctx.tenant`，参数 workspace 须归属 ctx.tenant |
| FR-T06 | 平台品牌 vs 租户品牌分离 | 租户登录的壶天 SaaS 后台=壶天品牌；租户的站=租户品牌 | 后台 chrome 读平台品牌，(sites) 渲染读 workspace 品牌，互不串 |

## 3. 功能需求 · 订阅/席位/用量（FR-S）

| ID | 需求 | 用户故事 | 验收 |
|---|---|---|---|
| FR-S01 | 套餐分档 | 作为客户，我看得清 free/pro/enterprise 的能力与配额差异 | 三档配额表（席位/建站页/SEO 审计/LLM 调用/引用追踪）可配 |
| FR-S02 | 席位管理 | 作为租户 owner，我能加/删成员、分角色 | owner/admin/member 三角色；超席位限额拒绝并提示升级 |
| FR-S03 | 用量计量 | 作为平台，我按窗口计量每租户用量 | `usage_meters` 按 meter_kind+window 累加；超额降级或拒绝（按 plan 策略） |
| FR-S04 | 到期/续费/宽限 | 作为客户，到期前提醒、到期宽限 N 天、超期降级只读 | 状态机 active→grace→readonly→suspended；宽限天数可配 |
| FR-S05 | 试用 | 作为新客户，我能试用 pro 能力 | trial_ends_at 到期自动降 free，不丢数据 |

## 4. 非功能需求 · 多租户安全（NFR-T）

| ID | 维度 | 要求 |
|---|---|---|
| NFR-T01 | 隔离零旁路 | 多租户鉴权链路（租户归属+席位有效+订阅未过期）**任何一环不得被旁路**；生产禁 rewrites 直连（接技术方案 §9 M5 硬约束，多租户下升级为红线） |
| NFR-T02 | 凭证加密 | 租户 siteBase 凭证**加密存储**（envelope：data_key 加密 secret，master_key 加密 data_key），带 key_version 支持轮换；明文不落日志/不落前端 |
| NFR-T03 | 审计可分 | 操作审计带 tenant_id+workspace_id+seat_id，区分"壶天 Agent 操作"vs"人工操作"（接 trace §6 审计混账风险） |
| NFR-T04 | 限流按租户 | rate limit 按 tenant 维度，防单租户拖垮平台或刷爆 siteBase 实例 |
| NFR-T05 | 删除可隔离 | 租户注销可逻辑删+异步物理清，不影响他租户 |

## 5. 验收标准（多租户 DoD）

- [ ] 无上下文请求访问业务接口 = 401/403，无全局默认旁路
- [ ] `probe:tenant-isolation` 绿：mock 两租户，A 的 token 取 B 的 workspace/会话/产物 = 403 或空
- [ ] 渲染租户 A 的站，head/兜底品牌 = A 的品牌，非壶天、非 B
- [ ] 篡改 URL 中 workspace_id 到他租户 = 403
- [ ] 凭证表无明文 secret（grep + 单测）
- [ ] 超额/到期/宽限状态机按 FR-S04 转移
- [ ] 审计日志含 tenant+workspace+seat 三元

## 6. 开放问题

- 形态 2 与形态 3 的 `subscriptions` 字段差异（订阅 vs 买断授权）如何统一，待桌面授权文档对齐。
- siteBase 实例的供给方式（每租户预置 vs 按需拉起 vs 容器化）属运维/部署决策，M6 先用"预置+映射表"，容器化留 v2。
- 跨租户的"平台级模板/共享资产"（如行业模板）只读共享机制，留 v2。

---

**保存为：docs/多租户-数据库设计.md**

# 壶天 SEO/GEO Agent · 多租户数据库设计

| 项 | 值 |
|---|---|
| 关联 | 多租户-PRD补充（`FR-T/FR-S/NFR-T`）· `tp6-trace.md` §5/§6 |
| 范围 | 仅**壶天侧新建元数据表**；siteBase 表**不动**（业务数据靠实例隔离） |

## ADR-1 · 隔离策略：混合模式（命门决策）

| 数据层 | 隔离方式 | 理由 |
|---|---|---|
| 壶天元数据（租户/订阅/席位/凭证/用量/审计） | 共享库 + `tenant_id` 列 | 量小、查询多、需跨表 join；靠应用层强制 `where tenant_id` + 探针守 |
| 租户业务数据（文章/商品/SEO） | **每 workspace 一套 siteBase 实例/库** | siteBase 单租户无 tenant_id（trace §5）；加 tenant_id 改 80+ 表=1-2 周（trace 缺口 6 方案 b），否决 |

**串数据风险面分两块**：① 壶天元数据漏 `where tenant_id` → 串元数据（靠中间件+ORM 基类+探针守）；② siteBase 实例路由错配 → 串业务数据（靠映射表强校验+路由探针守）。两块各有探针，见开发计划。

## ADR-2 · workspace : siteBase 实例 = 1:1 起步，预留共享演进

M6 起步 1:1（简单、隔离强）。`workspaces` 表预留 `sitebase_instance_id`（指向实例池）+ 注释标记"未来多 workspace 共享实例时，siteBase 内补 tenant_id"。**现在不建 siteBase 内 tenant_id**。

## 表设计（壶天侧新建）

约定：所有业务表含 `id`(bigint pk) / `tenant_id`(除 tenants 外，not null, indexed) / `created_at` / `updated_at` / `deleted_at`(软删, nullable)。下表只列**特有字段**。

### tenants（租户=计费/登录主体）
| 字段 | 类型 | 说明 |
|---|---|---|
| slug | varchar(64) unique | 租户标识（子域/路径用） |
| display_name | varchar(128) | 公司名 |
| status | enum | trial/active/grace/readonly/suspended |
| owner_seat_id | bigint | 指向 seats（owner） |

### workspaces（品牌/站主体，tenant 1:N）← FR-T03 品牌派生落点
| 字段 | 类型 | 说明 |
|---|---|---|
| tenant_id | bigint fk | |
| slug | varchar(64) | 租户内唯一（联合唯一 tenant_id+slug） |
| brand_name | varchar(128) | **渲染器/兜底品牌来源**（闭合 brand 单源第三段） |
| industry | varchar(64) | 行业（兜底文案/模板选择用） |
| sitebase_instance_id | bigint fk | 指向 sitebase_instances |
| fallback_copy_json | json | 兜底 settings 文案（meta_title/description 等，按 brand+industry 生成） |
| status | enum | active/archived |

> `brand_name`+`industry`+`fallback_copy_json` 三字段=渲染器 reader.ts 的 MOCK_SETTINGS 兜底真值来源；全局 env 壶天降为"workspace 也无兜底时的平台最后兜底"。

### sitebase_instances（siteBase 实例池）
| 字段 | 类型 | 说明 |
|---|---|---|
| base_url | varchar(255) | 该实例 backend 地址 |
| provision_kind | enum | preset/container |
| capacity | int | 预留：共享模式下承载 workspace 数（M6=1） |
| health | enum | healthy/degraded/down |

### tenant_credentials（每 workspace 的 siteBase 凭证，加密）← NFR-T02
| 字段 | 类型 | 说明 |
|---|---|---|
| workspace_id | bigint fk unique | 一 workspace 一套 |
| auth_kind | enum | jwt_password / client_credentials |
| encrypted_secret | bytea | envelope 加密后的 secret/password |
| key_version | int | 主密钥版本，支持轮换 |
| username | varchar(128) | jwt_password 模式用 |
| token_cache_encrypted | bytea | 缓存的 access token（加密，可选） |
| expires_at | datetime | |
| last_rotated_at | datetime | |
| status | enum | active/rotating/revoked |

### subscriptions（租户 1:1，与桌面授权共用结构）
| 字段 | 类型 | 说明 |
|---|---|---|
| tenant_id | bigint fk unique | |
| plan | enum | free/pro/enterprise |
| status | enum | active/trial/grace/readonly/suspended/canceled |
| seats_limit | int | |
| current_period_start / _end | datetime | |
| trial_ends_at | datetime | |
| grace_days | int | |
| cancel_at | datetime | |

### seats（租户成员+角色）
| 字段 | 类型 | 说明 |
|---|---|---|
| tenant_id | bigint fk | |
| user_id | bigint fk | 平台用户 |
| role | enum | owner/admin/member |
| status | enum | active/disabled |
| 约束 | | 联合唯一 tenant_id+user_id；active 席位数 ≤ subscriptions.seats_limit |

### usage_meters（用量计量）← FR-S03
| 字段 | 类型 | 说明 |
|---|---|---|
| tenant_id | bigint fk | |
| meter_kind | enum | llm_calls/pages_built/seo_audits/citations_tracked |
| window_start | datetime | 计量窗口起点 |
| count | bigint | |
| 约束 | | 联合唯一 tenant_id+meter_kind+window_start |

### plan_quotas（套餐配额表，平台级，无 tenant_id）
| 字段 | 类型 | 说明 |
|---|---|---|
| plan | enum | |
| meter_kind | enum | |
| limit_per_window | bigint | -1=无限 |
| window_kind | enum | month/total |
| overage_policy | enum | reject/degrade/allow |

### audit_logs（审计，带三元）← NFR-T03
| 字段 | 类型 | 说明 |
|---|---|---|
| tenant_id / workspace_id / seat_id | bigint | 三元 |
| actor_kind | enum | human/agent |
| action | varchar(128) | |
| target_kind / target_id | | |
| meta_json | json | |
| created_at | datetime | 分区键候选 |

## 索引与约束要点

- 所有含 `tenant_id` 表：`tenant_id` 单列索引 + 业务查询的 `(tenant_id, ...)` 复合索引，**强制查询走 tenant_id 前缀**（ORM 基类注入，见开发计划 T6.2）。
- `workspaces(tenant_id, slug)` 联合唯一；`seats(tenant_id, user_id)` 联合唯一；`tenant_credentials.workspace_id` 唯一。
- 外键：`workspaces.tenant_id→tenants`、`sitebase_instance_id→sitebase_instances`；`tenant_credentials.workspace_id→workspaces`；其余 fk 同理。**跨租户 fk 不可能成立**（因 tenant_id 约束），物理上挡一道串数据。

## 凭证加密方案（NFR-T02 落地）

envelope encryption：`master_key`（KMS 或 env 主密钥，按 `key_version` 管理）→ 加密 `data_key` → `data_key` 加密 `encrypted_secret`。读时按 `key_version` 取 master_key 解 data_key 再解 secret。轮换=新 data_key 重加密 secret+递增 key_version，旧版本保留至在途请求结束。**明文 secret 禁止进日志/异常栈/前端响应**（单测 grep 守）。

## 与 siteBase 的边界（一图清）

| 层 | 谁建/谁动 | 隔离靠什么 |
|---|---|---|
| 壶天元数据（上表） | 壶天新建 | tenant_id 列 + 中间件 + 探针 |
| siteBase 业务表（sk_article/sk_product/seo_pages…） | **不动** | 每 workspace 一套实例（sitebase_instances 路由） |
| siteBase 凭证 | 壶天存加密副本（tenant_credentials） | 每 workspace 一套，不共享 |

---

**保存为：docs/多租户-开发计划补充.md**

# 壶天 SEO/GEO Agent · 多租户开发计划补充

| 项 | 值 |
|---|---|
| 关联 | 多租户-PRD补充 · 多租户-数据库设计 · 开发计划 v0.3（接 M5 之后） |
| 排序 | **建站腿（M4/B2）先收一段，再接 M6**；本文档可先读、先排期，不阻塞 Trae 当前 B2 整站扩展 |

## 1. 里程碑

| 里程碑 | 主题 | 出口标准 |
|---|---|---|
| **M6** | 多租户与商业化 | 租户上下文中间件 + 隔离探针绿 + 订阅/席位/用量 CRUD + 凭证加密 + 渲染器品牌派生 + BFF 多租户鉴权 |

## 2. 任务（T6.x）

| ID | 任务 | 依赖 | 对应需求 |
|---|---|---|---|
| T6.1 | migration 建壶天元数据 9 表 + 索引/约束 | — | 数据库设计全表 |
| T6.2 | **租户上下文中间件 + ORM 基类**（强制注入 tenant_id，无上下文=403，无全局旁路） | T6.1 | FR-T01/T05, NFR-T01 |
| T6.3 | **串数据探针 probe:tenant-isolation**（mock 两租户，A 取 B=403/空；含元数据+siteBase 路由两块） | T6.2 | FR-T02, NFR-T01 |
| T6.4 | workspace→siteBase 实例路由 + 路由错配探针 | T6.1 | FR-T04 |
| T6.5 | 凭证加密存取（envelope + key_version）+ 明文不落日志单测 | T6.1 | NFR-T02 |
| T6.6 | 订阅/席位/用量 CRUD + 状态机（active→grace→readonly→suspended） | T6.2 | FR-S01..05 |
| T6.7 | **渲染器品牌派生**：reader.ts 的 brand_name+MOCK_SETTINGS 兜底改读 workspace（brand/industry/fallback_copy_json），全局 env 降为平台兜底 | T6.4 | FR-T03, FR-T06 |
| T6.8 | BFF 多租户鉴权（租户归属+席位有效+订阅未过期，三环全验）+ 生产禁 rewrites 校验 | T6.2, T6.6 | NFR-T01 |
| T6.9 | 审计日志带三元 + actor_kind | T6.2 | NFR-T03 |
| T6.10 | 限流按 tenant | T6.2 | NFR-T04 |

## 3. 开工顺序铁律（多租户经典坑，先守门人后业务）

**先 T6.2+T6.3（上下文中间件+串数据探针），再 T6.6/T6.7 等业务 CRUD。** 理由：若先建一堆 CRUD 再补隔离，每个查询都要回头加 `where tenant_id`，返工巨大且易漏。**串数据探针 T6.3 必须早于业务 CRUD 立起来**，让后续每个 CRUD 在"隔离守门人已就位"的环境里写、被探针盯着。这与我们"先探针后采信"一贯纪律同构。

## 4. 并行边界

- T6.2 完成前，不写任何带租户数据的 CRUD（T6.6/T6.7 串行于 T6.2）。
- T6.3 与 T6.4 可并行（元数据隔离探针 vs 路由探针，两块风险面独立）。
- T6.7（渲染器品牌派生）依赖 T6.4 路由就位，但渲染器改造可与 T6.6 并行。
- 与建站腿并行：M6 整体排在 B2 整站收一段之后；M6 内部 T6.1/T6.2 可与 B2 收尾并行准备。

## 5. 验收门禁

| 门禁 | 命令/动作 | 守什么 |
|---|---|---|
| 串数据 | `probe:tenant-isolation` | 元数据漏 where / 路由错配 → 红 |
| 凭证无明文 | 单测 + grep `encrypted_secret` 路径无明文落日志 | NFR-T02 |
| 上下文强制 | 无 ctx 请求业务接口 = 403 探针 | FR-T01 |
| 品牌派生 | 渲染租户 A 站 head 品牌=A，非壶天/非 B | FR-T03 |
| 状态机 | 订阅状态转移单测 | FR-S04 |
| 类型/构建 | tsc --noemit / build 零错 | 全局 |

## 6. 风险登记

| ID | 风险 | 应对 | owner |
|---|---|---|---|
| RT1 | 漏 where tenant_id 串元数据 | ORM 基类强制注入 + 串数据探针 + code review 必查 | 执行+review |
| RT2 | siteBase 实例路由错配串业务数据 | 映射表强校验 + 路由探针 | 执行 |
| RT3 | 凭证明文泄露 | envelope 加密 + 明文禁日志单测 | 执行 |
| RT4 | 渲染器兜底仍挂壶天牌 | workspace 派生 + 品牌派生探针 | 执行+review |
| RT5 | 生产 rewrites 旁路多租户鉴权 | NFR-T01 红线 + 部署校验 | 执行 |
| RT6 | 1:N workspace 下 siteBase 实例成本线性涨 | M6 预置+映射，容器化/共享实例留 v2 | 产品+运维 |

## 7. 致 Trae · 开工要点与 reviewer 盯防点

- **先读后排**：本补充可与当前 B2 整站扩展并行准备，**不要求停下手头活**；B2 整站收一段后再接 M6，按 T6.1→T6.2→T6.3 顺序起。
- **开工铁律**：T6.2 中间件 + T6.3 串数据探针**先于一切业务 CRUD**。别先写 CRUD 后补隔离。
- **混合隔离别搞混**：壶天元数据加 tenant_id；siteBase 表**一个字段都不加**，靠实例隔离。
- **brand 派生是硬需求不是 nice-to-have**：T6.7 把 reader.ts 兜底品牌从全局 env 切到 workspace，否则多租户上线=所有客户站挂壶天牌。
- **reviewer（我）会盯的四条**：① 串数据探针是否真在业务 CRUD 之前立、是否覆盖元数据+路由两块；② ORM 基类是否真强制 tenant_id、有无旁路；③ 凭证有无明文泄露路径；④ 渲染器品牌是否真从 workspace 取、生产 rewrites 是否被禁。这四条任一不过，M6 不封箱。
- **诚实边界**：表结构为新设计，siteBase 实例供给方式 M6 用预置+映射，容器化留 v2；订阅与桌面授权共用模型但授权服务另立文档，字段差异待对齐——遇歧义停下回报，别猜。

---

三份到此，构成 多租户 PRD（隔离/订阅/安全/验收）→ 数据库设计（混合隔离 ADR + 9 表 + 加密 + 边界）→ 开发计划（M6 + T6.x + 开工铁律 + 串数据探针门禁）的可追溯闭环，`FR-T/FR-S/NFR-T` 贯穿三者，并显式接住了 trace §5/§6 的单租户事实与 brand 单源第三段。

转交时跟 Trae 补一句即可："多租户文档先读、排进 M6，先收你手头的 B2 整站导航扩展，不冲突。" 我这边等你或 Trae 的下一份产出——B2 整站收一段发我截图/事件流，我做建站腿整站那一锤；M6 真开工后，串数据探针立起来那天发我，我盯多租户隔离的第一道门。这一轮我不另派活、不抢 Trae 当前的活——文档备齐、决策讲清、诚实边界标好，球在节奏，我待命。
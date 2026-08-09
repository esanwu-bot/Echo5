# ADR · 开放能力 API（把 SEO/GEO 能力封装为对外 API）

| 项 | 值 |
|---|---|
| 状态 | **Accepted（已拍板，D2 确认 MVP 不开放 trace_citations）** |
| 关联 | `ADR-cross-lang-tenant-context` · `ADR-cms-adapter` · 多租户 `tenant-api` · review报告 P1-1/P2-9 · PRD DATA-05 |
| 背景 | 把壶天确定性 SEO/GEO 能力（诊断/schema/收录/引用）封装为对外 API，让任何现有网站后端接入；这是"能力 SDK"三步（API→插件→SDK）的第一步 |
| 上游调研 | Trae 实码摸底 `tenant-api`：usage_meters 只读不写、plan_quotas 只展示不拦截、无 API key、无限流、4 工具确定性无 LLM 未暴露 HTTP、席位 seats_limit 有 TOCTOU |

## 背景

壶天当前是"平台"：用户在 portal/workbench 里用对话式 Agent。本 ADR 要开一条新腿——**把确定性 SEO/GEO 能力做成对外 API**，让任何现有网站（WordPress/Shopify/自建站）的后端接入，无需进壶天平台。这是从"平台"到"能力层"的跃迁，市场参照是 Semrush/Ahrefs API，差异点是双评分（含 GEO）+ AI 引用追踪。

**与 cms-adapter 的方向区别（别混）**：cms-adapter 是"壶天→CMS"（壶天主动往 CMS 写内容，为了建站）；本 ADR 是"网站→壶天"（网站主动调壶天能力，为了优化）。互补两条腿。

**Trae 实码调研的关键发现（本 ADR 的地基坐标）**：
- `usage_meters` 表结构在，但 tenant-api **从不写**（无 RecordUsage）
- `plan_quotas` 的 `OveragePolicy`(reject/degrade/allow) **从未被代码分支判断**——配额是纯声明式
- **无 API key 概念**（无 api_keys 表、User/Tenant 无 key 字段）
- **无限流**（无 token bucket/滑动窗口）
- 4 个工具（`run_diagnosis`/`check_schema`/`trace_citations`/`submit_sitemap`）**全是确定性、无 LLM、未暴露 HTTP**，现走 stdio MCP
- 席位 `seats_limit` 是 `Count→比较→Create` 的 TOCTOU 竞态

**核心判断**：表结构的地基在，但**执行链路的地基不在**——配额这条链是声明式的（呼应 review 报告"多处机制声明式而非运行式"）。所以开放 API 的真正核心不是"加个 API key"，而是**把从未运行的"检查→调用→记录"配额链路第一次跑起来**。

## 决策总览（待拍板，本 ADR 给倾向）

| # | 决策点 | 选项 | 本 ADR 倾向 | 状态 |
|---|---|---|---|---|
| D1 | 工具执行层承载 | A Go重写 / B bridge兼 / C Python加REST / D 独立服务 | **C 起步、D 演进；否决 A/B**（理由见方案选择）| 待确认 |
| D2 | trace_citations mock 红线 | 接真后端 / 标注mock / 不开放 | **MVP 不开放**，待 DATA-05 真实化（产品红线，卖 mock=卖假数据）| **需你拍板** |
| D3 | 配额执行原子性 | ON DUPLICATE KEY / 事务FOR UPDATE | 事务+FOR UPDATE 检查 + ON DUPLICATE KEY 原子递增 | 待确认 |
| D4 | submit_sitemap 归属 | 校验 / 不校验 | **必须校验** host 属该 workspace（防 A 提交 B 的站点）| 待确认 |
| D5 | API key 模型 | 独立 api_keys 表 | 独立表 + hash存储 + scope + 吊销；**不加 access_kind 到 Tenant** | 待确认 |
| D6 | access_kind 计费维度 | 加 / 不加 | MVP 不加，标开放问题 | 开放问题 |
| D7 | 用量记录责任方 | tenant-api / bridge | **tenant-api**（API 网关层，鉴权/配额/计量同处）| 待确认 |

## 方案选择 · D1 工具执行层承载（最关键，定 agent-bridge 职责边界）

**前提洞察**：4 个工具是**无状态纯函数**——诊断任意外部公网 URL，不碰 hutian 库、不碰 siteBase、不需要租户数据。租户上下文只用于**鉴权和配额计量**，不进入工具逻辑本身。

| 方案 | 描述 | 否决/采纳 |
|---|---|---|
| A. Go 重写工具逻辑 | tenant-api 用 Go 重写 run_diagnosis 等 | **否决**：工作量大，Python 侧 PageSpeed/bs4/IndexNow 细节多，重写易漏，双份逻辑漂移 |
| B. tenant-api 调 agent-bridge 同步端点 | bridge 加 `POST /tools/:name`，tenant-api 转发 | **否决**：① 调用方向反转——tenant-api 是信任源（ADR-cross-lang 的上游），反过来调下游 bridge，信任源成了下游调用方；② agent-bridge 职责膨胀——它本是"对话式 Agent 宿主"（runAgentLoop+LLM+SSE，按会话生命周期设计），兼"无状态同步工具网关"两种模型混在一个服务 |
| C. Python 侧加 REST 端点，tenant-api 直连 | MCP server 同进程加轻量 REST（复用工具函数），tenant-api 用普通 HTTP 调用 | **采纳（起步）**：工具零改动、调用方向正确、agent-bridge 不膨胀、tenant-api 不用懂 MCP 协议 |
| D. 独立能力服务 | 把工具抽成独立服务 | **演进方向**：C 的 HTTP 服务未来独立部署即成 D |

**起步形态（C）说明**：Python 侧在 MCP server 同进程加普通 REST 端点（`/diagnose` 等，复用 `tools.py` 的函数），tenant-api(Go) 用普通 HTTP client 调用，**不走 MCP 协议**。具体 transport（同进程 REST vs FastMCP HTTP transport）由 T9.0 探路定，倾向"不让 tenant-api 懂 MCP 协议"的那个。

**调用链对比（开放 API vs 对话式 workbench）**：
```
开放 API（确定性，无 LLM，无 session）：
客户后端 → POST /open/v1/diagnose + Bearer hsk_xxx
  → tenant-api: ApiKeyContext → RateLimit → QuotaEnforce → 调工具执行层 → RecordUsage → writeAudit
  → 工具执行层(Python): run_diagnosis(url)
  → 返回 JSON

对话式 workbench（有 LLM，有 session）：
前端 → BFF → agent-bridge(runAgentLoop + LLM) → MCP(stdio) → 工具
```
开放 API **不经过 agent-bridge、不经过 LLM**——它是"能力的 API 化"，不是"对话的 API 化"。

## 核心设计

### 5.1 能力分层（哪些开放，哪些不开放）

| 层 | 能力 | 开放？ | 理由 |
|---|---|---|---|
| ① 分析/查询 | `run_diagnosis`、`check_schema` | ✅ MVP 开放 | 确定性、真数据、输入URL→输出报告 |
| ② 提交/动作 | `submit_sitemap` | ✅ MVP 开放（带归属校验 D4）| 确定性，需鉴权+配额+归属 |
| ① 分析/查询 | `trace_citations` | ❌ **MVP 不开放**（D2 需拍板）| 当前返回 mock，开放=卖假数据；待 DATA-05 真实化 |
| ③ 生成/规划 | `cms_create_page` 等建站 | ❌ 不开放 | 依赖 LLM 多轮规划，是对话式能力，不适合 API 化 |

**MVP 开放端点 = 3 个**：diagnose / schema/check / sitemap/submit，全部真数据。

### 5.2 API key 模型 + 鉴权（D5）

新增 `api_keys` 表（遵守 schema 基线统一，SQL 文件为唯一基线，呼应 P1-13/14）：
```
api_keys: id, tenant_id, key_prefix, key_hash, scopes, status, last_used_at, created_at
```
- key 只存 **hash**（HMAC-SHA256 或 bcrypt），**明文仅创建时返回一次**
- key 前缀区分环境：`hsk_live_` / `hsk_test_`；`key_prefix` 存前缀用于列表展示
- `scopes` 限制能调哪些端点（如 `diagnose,schema,sitemap`）
- `status`：active / revoked；吊销立即失效
- **不加 access_kind 到 Tenant**——API 客户和 portal 用户共享同一 tenant 模型，区别只在"用什么凭证进门"（JWT cookie vs API key）

新增 `ApiKeyContext` 中间件（挂 `/open/v1/*`）：
```
从 Authorization: Bearer hsk_xxx 取 key → 查 key_hash → 验 status=active
→ 注入 tenant_id / workspace_id / scopes / api_key_id
→ 更新 last_used_at
```
鉴权模式复用 `AdminContext` 的 `crypto/subtle.ConstantTimeCompare`（防时序攻击）。

### 5.3 开放 API 路由 + 端点

用 `/open/v1/*` 顶级路由组（区别于内部 `/api/v1/*`、超管 `/admin/api/v1/*`、自服务 `/portal/api/v1/*`），挂 `ApiKeyContext + RateLimit + QuotaEnforce`：

| 端点 | 入参 | 调工具 | meter_kind |
|---|---|---|---|
| `POST /open/v1/diagnose` | `{url}` | run_diagnosis | seo_audits |
| `POST /open/v1/schema/check` | `{url, expected_type?}` | check_schema | seo_audits |
| `POST /open/v1/sitemap/submit` | `{host, urls, indexnow_key}` | submit_sitemap | seo_audits（或新增 api_calls，D6 相关）|

对外 API 规范：统一错误码（不泄露内部 err.Error()，呼应 P1-22）、版本 `/v1`、`submit_sitemap` 幂等。

### 5.4 工具执行层（D1 采纳 C）

tenant-api 通过普通 HTTP 调 Python 侧 REST 端点。工具执行层**无租户状态**（工具只处理外部 URL），tenant-api 只把"要诊断的 url/brand"传过去，不传租户上下文（租户上下文留在 tenant-api 做鉴权配额）。

### 5.5 配额执行链路（D3+D7，本 ADR 的核心，把声明式配额第一次运行化）

**核心算法：先递增后读回**（防空窗口首调竞态，T9.3 落地确认）

> 为什么不用"先查 FOR UPDATE 再递增"：FOR UPDATE 锁不住"不存在的行"。
> 两个并发首调同一 `tenant+meter+window`（行还不存在）时，SELECT FOR UPDATE 都读到"无行"、
> 都通过检查、都递增——READ COMMITTED 下静默超额，REPEATABLE READ 下可能 gap-lock 死锁。
> "先递增后读回"与隔离级别无关，始终正确。

```
ApiKeyContext 注入 tenant_id + scopes
  → RateLimit: per-tenant 频率限流，超了 429
  → QuotaEnforce（短事务，先递增后读回）:
      BEGIN
      ① INSERT INTO usage_meters (...) VALUES (...,count=1)
           ON DUPLICATE KEY UPDATE count = count + 1        ← 原子递增+行锁串行化
           （行不存在时 INSERT 创建并锁；行存在时 ON DUPLICATE KEY 获取排他锁）
      ② SELECT count FROM usage_meters ... FOR UPDATE       ← 读回递增后的值
      ③ SELECT limit_per_window, overage_policy FROM plan_quotas
      ④ IF limit >= 0 AND count > limit:                     ← 注意是 >（已递增）
           overage_policy=reject  → UPDATE count=count-1（递减）→ 429
           overage_policy=degrade → 同 reject（MVP，T9.7 细化降级）→ 429
           overage_policy=allow   → 放行（已递增，保留用量）
      ⑤ ELSE: COMMIT 放行
      COMMIT
  → handler 调工具执行层（事务外，不持锁）
  → writeAudit(access_kind=api)
```

**显式决策（T9.3 落地，不再标开放问题）**：

| # | 决策 | 值 | 理由 |
|---|---|---|---|
| Q1 | 配额检查原子性 | 先递增后读回（INSERT ON DUPLICATE KEY + FOR UPDATE 读回） | FOR UPDATE 锁不住空行；先递增获取行锁，与隔离级别无关 |
| Q2 | plan_quotas 缺席语义 | **缺席=无限**（放行，仍记用量） | 宁可多服务不可打断；但 0006 seed 写全 plan×meter 是配套护栏，生产不依赖隐式语义 |
| Q3 | 预扣后工具失败退配额 | **不退**（预扣已 commit，记为 failed 调用） | 工具失败是"已服务但失败"消耗了资源；reject 是"拒绝服务"不消耗配额（递减回去） |
| Q4 | 超额 vs 服务故障状态码 | 超额=429（客户端不重试）；配额服务故障=503（客户端可重试） | 语义不同，客户端重试策略不同 |
| Q5 | reject 后配额 | 递减 count-1（被拒绝的请求不消耗配额） | 未到工具层，未提供服务 |

- 工具调用在事务提交后（handler 层），不持 DB 锁
- 顺手修 **席位 seats_limit TOCTOU**（review P2-9）：`Count→Create` 改事务+FOR UPDATE 锁 subscription 行（portal.go `TenantInviteSeat` + admin.go `CreateSeat` 两处）
- **0006 migration seed**（plan_quotas 配额护栏）：free/pro/enterprise × 4 meters 全写全，free=reject / pro=degrade / enterprise=allow

### 5.6 限流（开放 API 刚需，补 review 报告"无限流"空白）

per-tenant per-minute 固定窗口限流（T9.4 落地）：

- **算法**：固定窗口（fixed window），key=tenantID，window=1 分钟
- **实现**：进程内单例 `RateLimiter`（内存 map[int64]*bucket + sync.Mutex）
- **配置**：`TENANT_API_RATE_LIMIT_RPM` env，默认 60
- **响应**：超限 → 429 + `Retry-After` 头（到下个窗口的秒数）
- **挂载顺序**：`ApiKeyContext → RateLimit → QuotaEnforce → handler`（RateLimit 在 QuotaEnforce 之前，挡掉刷量请求不消耗配额计数）
- **清理**：后台 goroutine 每 5 分钟扫一次，删掉 10 分钟未用的桶（防内存泄漏）
- **与配额分层**：限流=防瞬时刷（per-minute，429）；配额=防月度超额（per-month，429）

MVP 单实例内存 map；多实例部署换 Redis + 滑动窗口（标开放问题）。呼应 review P1-1 的 rate limiter 诉求。

### 5.7 审计

`writeAudit` 时记 `access_kind=api` + `api_key_id`（用 meta_json 记，不动 actor_kind 枚举，轻量）。开放 API 每次调用都要记审计：哪个 key、调了什么、何时、结果。

### 5.8 安全（fail-closed + 密钥 + 归属）

- **fail-closed**：API key 验证失败、配额服务不可用、工具执行层不可用 → 一律拒绝，**绝不 fail-open**（呼应 review 报告"fail-open 断点"教训和 P0-3/P1-11）
- **密钥安全**：api_keys 只存 hash；客户后端存 key，**客户前端永远碰不到**（这也是"不做纯前端 JS SDK"的原因）
- **归属校验（D4）**：`submit_sitemap` 必须校验 `host` 属该 API key 绑定的 workspace（查 cms_instances 该 workspace 的域名），否则 A 客户能提交 B 客户的站点 → 403
- `diagnose`/`schema/check` 诊断的是任意外部公开 URL，无需归属校验（诊断公开网页合法），靠限流+配额防滥用

## 纪律保障（这程纪律在开放 API 的落地）

- **单一信任源**：鉴权/配额/归属校验只在 tenant-api（Go），工具执行层无租户逻辑
- **真实数据红线**：MVP 只开放真数据端点，trace_citations 的 mock 不对外（假成功要自报家门的对外版——卖 mock 给客户=欺骗）
- **fail-closed**：所有断点拒绝不降级放行
- **配额运行式**：把声明式的 OveragePolicy 第一次真正执行（呼应 review"声明式 vs 运行式"）
- **探针守卫**：开放 API 每条安全属性都有探针（见验收）

## 探针 / 验收要求

| 探针 | 验什么 |
|---|---|
| API key 鉴权 | 有效 key→200；无效/吊销 key→401 |
| 配额拦截 | 超配额→429（reject 策略）；OveragePolicy 分支真被执行 |
| TOCTOU 原子性 | 并发调用不超额（检查+递增原子）|
| 归属校验 | A 的 key 提交 B 的 host→403 |
| 限流 | 超频率→429 |
| fail-closed | 工具执行层挂→503，不 fail-open |
| 工具正确性 | diagnose 返回 scores 结构对（traditional_seo/generative_geo）|
| 席位竞态回归 | seats_limit 并发不超限 |

## 渐进任务（T9.x，接 cms-adapter T8.x 之后）

| ID | 任务 | 依赖 |
|---|---|---|
| T9.0 | **探路**：Python 侧加 REST 端点，tenant-api 调通 run_diagnosis 单端点（验证 D1 transport 形态）| — |
| T9.1 | api_keys 表 + SQL migration + ApiKeyContext 中间件 + key 创建/列出端点（portal）| — |
| T9.2 | `/open/v1` 路由组 + diagnose + schema/check + sitemap/submit 端点 | T9.0, T9.1 |
| T9.3 | 配额执行链路（QuotaEnforce + RecordUsage 原子）+ 席位 TOCTOU 修复 | T9.1 |
| T9.4 | 限流中间件 | T9.1 |
| T9.5 | submit_sitemap host 归属校验 | T9.2 |
| T9.6 | 审计 access_kind=api | T9.2 |
| T9.7 | 探针全绿（上表 8 条）| T9.2-T9.6 |

> 铁律：**T9.0 先探路验证工具执行层 transport**，跑通 run_diagnosis 单端点再做全套。要快速验证可行性，可先做"diagnose 单端点最小切片"（一个端点、dev key、暂不接配额），但 D1 transport 必须先定。

## 改动文件清单（预估）

- `apps/tenant-api/models/models.go` — api_keys 模型
- `apps/tenant-api/migrations/0005_api_keys.sql` — 新表（SQL 基线）
- `apps/tenant-api/middleware/api_key_context.go` — 新建
- `apps/tenant-api/middleware/rate_limit.go` — 新建
- `apps/tenant-api/middleware/quota_enforce.go` — 新建
- `apps/tenant-api/handlers/open.go` — 新建（开放 API handler）
- `apps/tenant-api/handlers/portal.go` — key 管理端点
- `apps/tenant-api/main.go` — 注册 `/open/v1`
- `apps/tenant-api/repo/` — usage 原子递增、配额查询
- `hutian-seo-plugin/mcp-server/.../http_api.py` — 新建（REST 端点，复用 tools.py 函数）

## 开放问题

- ~~D1 transport 具体形态（同进程 REST vs FastMCP HTTP），T9.0 定~~ → **已定：C 方案，Python 侧 http.server REST**
- ~~配额预扣后工具失败是否退还~~ → **已定：不退**（5.5 Q3）
- 限流单实例内存 vs 多实例 Redis
- D6 access_kind 计费维度（API 调用和 portal 使用是否分开计费）
- trace_citations 何时真实化开放（DATA-05 引用监测后端）
- API key 轮换机制
- 多实例部署时配额/限流的共享状态
- 对外 API 的 SLA/超时（工具抓外部 URL 可能慢）

## 诚实边界

本 ADR 基于 Trae 实码调研（usage 只读不写、quota 不拦截、无 API key/限流、4 工具确定性、席位 TOCTOU），未亲自读实码，改造量与现状以实码为准。D1 transport 形态待 T9.0 探路。工具执行层独立部署的资源/进程模型未细设计（C 起步暂复用 MCP server 进程）。"开放 API 改造量 ~1020 行"是 Trae 估算，含上述漏块（审计/归属/错误规范）后实际偏高。

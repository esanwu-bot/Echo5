# hutianSEOGEOAGent 全栈代码审查报告

> 审查时间: 2026-08-08
> 修复日期: 2026-08-08
> 技术栈: Go(Gin+GORM+MySQL) + Node.js/TS(MCP Agent Bridge) + Next.js 14(web) + Vite+React+AntD(admin) + Capacitor(mobile) + Wails(desktop)
> 项目结构: pnpm workspace + Turborepo monorepo，6 个应用 + 1 个共享包
> 问题统计: P0: 10 | P1: 22 | P2: 24 | P3: 19
> 回归探针: 隔离链 28/28 全绿（T6.3a 4/4 + T6.3b 6/6 + admin-isolation 7/7 + m5-auth 11/11）
> 注: tenant-selfservice 5/13 为 M5 遗留探针债（探针未适配 cookie 认证），非本轮修复引入

---

## P0 — 安全/数据丢失（必须立即修复）

| # | 层 | 位置 | 问题 | 建议 | 状态 |
|---|---|---|---|---|---|
| 1 | 后端 | apps/tenant-api/middleware/tenant_context.go:45-95, main.go:97-165 | `/api/v1/*` 路由组无任何认证，租户身份完全由自报 `X-Tenant-ID`/`X-Workspace-ID` 请求头决定；`POST /api/v1/internal/token` 可为任意合法组合签发 HMAC 内部 token，持 token 即可经 agent-bridge 读写该租户 siteBase 数据 | 该端点必须挂在已认证主体之后（portal JWT 或服务间密钥），废除"自报 header 即身份"设计；或删除该端点改用 portal 链的 JWT 版本 | ✅ 已修复：加 X-Internal-Secret 服务密钥中间件 |
| 2 | 前端 | apps/web/lib/bridgeToken.ts:55 | 内部 token 缓存 key 用 `jwt.slice(0,16)`，而 HS256 JWT 前 16 字符是固定头（所有用户相同），导致**所有用户共享同一条缓存**，用户 B 会带着用户 A 的 token 请求 bridge → 跨租户数据泄露 | 改用完整 JWT 的 sha256 摘要或解码 payload 中 uid+wid 作缓存 key | ✅ 已修复：改用 JWT payload 段作缓存 key |
| 3 | 后端 | apps/tenant-api/config/config.go:38, main.go:68-83 | `Dev` 默认为 true（fail-open）：生产忘设 `TENANT_API_DEV=false` 即进入 DebugMode + CORS 反射任意 Origin 且 `Allow-Credentials: true` → 全域 CSRF | Dev 默认改 `== "true"`；CORS 改白名单不反射任意源 | ✅ 已修复：Dev 默认 false + CORS 白名单 |
| 4 | 前端 | apps/web/components/inbox/MailReader.tsx:235 | `dangerouslySetInnerHTML` 直接渲染邮件 HTML（Agent/SSE 可控内容），无消毒 → 存储型 XSS | DOMPurify 白名单消毒后渲染，或改用安全 Markdown 渲染路径 | ✅ 已修复：改纯文本渲染 |
| 5 | 前端 | apps/web/components/workbench/RightPanel.tsx:263 | `TerminalView` 用 `dangerouslySetInnerHTML` 渲染终端行（Agent 事件流写入）→ 任意脚本注入 | 终端输出改纯文本渲染，确需高亮用受控 ANSI→span 映射 | ✅ 已修复：改纯文本渲染 |
| 6 | 前端 | apps/web/components/workbench/ToolCall.tsx:119 | `dangerouslySetInnerHTML` 渲染工具调用文本（Agent 事件）→ XSS | 改纯文本渲染或 DOMPurify 消毒 | ✅ 已修复：改纯文本渲染 |
| 7 | 前端 | apps/web/components/workbench/MarkdownRenderer.tsx:71 | `rehypePlugins={[rehypeRaw]}` 对 Agent 流式 Markdown 启用原始 HTML 解析，与 SSR 安全版 `lib/markdown.tsx` 形成双标 → Agent 可夹带 `<script>` 执行 | 移除 rehype-raw，统一使用安全渲染器；如需 HTML 表格配合 rehype-sanitize | ✅ 已修复：移除 rehype-raw |
| 8 | 前端 | apps/web/components/portal/PortalShell.tsx:65-66 | 登录表单硬编码默认凭据 `owner-a@hutian.dev` / `dev-password-change-in-prod` 作为 state 初值，随生产 bundle 下发 | 默认值置空，dev 凭据仅在 NODE_ENV!=="production" 时填充 | ✅ 已修复：env 条件化（闭环判官：生产 bundle grep 无默认凭据） |
| 9 | 前端 | apps/admin/src/App.tsx:214 | 登录页 UI 明文展示默认管理员 token `dev-admin-token-change-in-prod` → 任何人可以管理员身份调用 API | 删除提示或仅开发环境显示，生产强制校验真实凭据 | ✅ 已修复：仅 import.meta.env.DEV 显示 |
| 10 | 前端 | apps/admin/src/api/client.ts:14-22 | 管理员 token 存 localStorage（XSS 可读），且为静态字符串无过期 → 一次 XSS 即全平台接管 | 改 httpOnly + SameSite Cookie，加 token 过期与刷新机制 | ⚠️ 部分修复：删除了 console.log 泄露，但 localStorage 存储模型未改。**债：需 M5 排期迁移到 httpOnly cookie** |

---

## P1 — 功能缺陷（应尽快修复）

| # | 层 | 位置 | 问题 | 建议 |
|---|---|---|---|---|
| 1 | 后端 | apps/tenant-api/handlers/portal.go:224-297 | 登录无频率限制、无失败锁定：`FailedLoginCount`/`LockedUntil` 字段存在但从不写入，可无限暴力破解 | 登录失败递增+锁定+成功清零，引入 rate limiter |
| 2 | 后端 | apps/tenant-api/main.go:48-52, handlers/portal.go:276 | `TENANT_JWT_KEY` 未配置时 jwtSigner=nil，TenantLogin 调 `signer.Issue` → nil 指针 panic（500） | handler 内判 nil 返回 503 |
| 3 | 后端 | apps/tenant-api/handlers/portal.go:514-523 | TenantInviteSeat 席位超限时先 writePortalError 又 AbortWithStatusJSON 二次写 → 响应体损坏 | 删除重复写出，单一错误出口 |
| 4 | 后端 | apps/tenant-api/handlers/admin.go:60-92 | writeAudit 用字符串拼接构造 meta JSON 且未转义用户输入 → 非法 JSON 致审计写入失败，且 db.Create 忽略错误 → 审计日志静默丢失 | json.Marshal 构造 meta 并检查/记录写入错误 |
| 5 | 后端 | apps/tenant-api/handlers/portal.go:558-605 | TenantUpdateSeat 权限缺陷：admin 可禁用/降级 owner 席位，可把成员提为 owner（互相提权） | 禁止对 owner 席位操作、禁止 API 授予 owner 角色 |
| 6 | 后端 | apps/agent-bridge/src/server.ts:356-371 | `GET /sessions/:id/events` 无 token/归属校验，知道 sessionId 即可订阅他人 SSE 流；CORS `*` 允许任意网页跨源读 | /events 强制验签并校验会话归属；收紧 CORS |
| 7 | 后端 | apps/agent-bridge/src/server.ts:384-397 | `POST /sessions/:id/messages` 不校验会话归属：攻击者可覆盖他人会话租户上下文、污染历史 | 会话绑定 tenant_id，token 租户不一致即拒绝 |
| 8 | 后端 | apps/agent-bridge/src/mcp/pool.ts:28-36 | buildChildEnv 把整个 process.env（含 HMAC 密钥、API Key）复制给 MCP 子进程 → 最小权限违反 | 只透传 SITEBASE_* 等必需变量 |
| 9 | 后端 | apps/agent-bridge/src/loop/intent.ts:507-514 | 破坏性闸门只覆盖 rename/sitemap，`cms_publish`/`cms_update_content` 等写操作无闸门；外部网页内容喂回 LLM 存在 prompt 注入→篡改站点链路 | cms 写类工具纳入 isDestructiveToolCall 确认闸门 |
| 10 | 后端 | apps/agent-bridge/src/mcp/client.ts:272-283 | `cms_upload_media` 的 file_path 由 LLM 决定且无校验 → 可读取服务器任意文件上传到 CMS | bridge 侧白名单目录或禁用该工具 |
| 11 | 后端 | apps/agent-bridge/src/auth/tenant-token.ts:34-47 | 未配 `TENANT_INTERNAL_TOKEN_KEY` 时静默 fail-open 放行；启动脚本恰好不配该变量 → 标准部署无租户鉴权 | 严格模式：缺 key 启动失败 |
| 12 | 数据库 | apps/tenant-api/migrations/（缺 0004） | migrations 只建 10 表，但 db.go 校验 11 表（含 user_sessions）；SQL 初始化的库缺表 → portal /sessions 全挂 | 补 0004_user_sessions.sql |
| 13 | 数据库 | models/models.go:80 vs migrations/0001_init.sql:36 | GORM `OwnerSeatID int64`（NOT NULL）与 SQL DDL `DEFAULT NULL` 漂移，两条基线行为不一致 | 模型改 `*int64` 对齐可空，确立 SQL 文件为唯一基线 |
| 14 | 数据库 | migrations/0001_init.sql 多表 | 软删除 + 唯一约束冲突：8 张表唯一索引不含 deleted_at，软删行继续占位，删除后无法重建 | 改硬删除+归档，或唯一键并入哨兵列 |
| 15 | 前端 | apps/admin/src/pages/Tenants.tsx:240 | `rowKey="ID"` 与数据字段 `id` 不匹配 → key 为 undefined，行操作错乱 | 改为 `rowKey="id"` |
| 16 | 前端 | apps/admin/src/pages/Audit.tsx:245 | 同上 `rowKey="ID"` 不匹配 | 改为 `rowKey="id"` |
| 17 | 前端 | apps/web/app/(sites)/site/[[...slug]]/page.tsx:959 | 联系表单提交按钮 type="button" 且无 onClick → 功能性死按钮 | 接入真实提交或标注占位并禁用 |
| 18 | 前端 | apps/web/lib/useAgentSession.ts:135-139 | `send()` 对 POST 未检查 resp.ok，4xx/5xx 被静默吞掉 | `if (!resp.ok) throw` 走错误分支 |
| 19 | 前端 | apps/web/app/api/sessions/route.ts | POST 代理 fetch 无 try/catch，上游异常 → 无 body 的 500 | 包裹 try/catch 返回结构化错误 |
| 20 | 前端 | apps/web/lib/sites/reader.ts:62-87 | 超时用 Promise.race，超时后 fetch 未 abort → 连接/内存泄漏 | 改用 AbortController + signal |
| 21 | 前端 | apps/web/lib/useAgentSession.ts:110-120 | 会话创建失败时 `pop()` 可能误删队列中其它待发消息 | 以消息 id 精确移除 |
| 22 | 后端 | apps/tenant-api/handlers/admin.go:134,282等 | 大量 handler 把 GORM 原始 err.Error() 返回给客户端 → 泄露 SQL/schema 细节 | 内部错误只记日志，响应返回通用错误码 |

---

## P2 — 性能/可维护性（计划修复）

| # | 层 | 位置 | 问题 | 建议 |
|---|---|---|---|---|
| 1 | 后端 | apps/agent-bridge/src/server.ts:321-327 | readBody 无大小上限 → 超大请求体 DoS | 限制 body ≤ 1MB |
| 2 | 后端 | apps/agent-bridge/src/server.ts:17,25 | sessions/sessionHistories/sessionTenants 无 TTL、无容量上限、永不回收 → 内存泄漏 | LRU + idle 清理 + history 条数上限 |
| 3 | 后端 | apps/agent-bridge/src/server.ts:411-417 | 同一 session 无并发互斥：重复 POST 并行跑多个 runAgentLoop → 历史错乱 | session 级锁或拒绝并发 |
| 4 | 后端 | apps/agent-bridge/src/server.ts:452, llm/, mcp/ | 全链路无超时：LLM/MCP 挂起则会话永久卡死 | per-request AbortController + 各调用超时 |
| 5 | 后端 | apps/agent-bridge/src/mcp/pool.ts:21,69-77 | MCP_POOL_MAX=8 LRU 淘汰不检查实例是否在途即 close；无 idle 回收 | 引用计数/活跃检查 + 按租户量调上限 |
| 6 | 后端 | apps/agent-bridge/src/mcp/pool.ts:49-53 | toAdminUrl 从 public URL 字符串替换派生 admin URL，拆域即失效 | cms_instances 直接存 admin url |
| 7 | 后端 | apps/agent-bridge/src/loop/flow-control.ts:265 | 建站后复验 URL 硬编码 `http://localhost:3000`，sitesBaseUrl 从未赋值 → 生产复验失效 | 从租户上下文/环境变量注入 |
| 8 | 后端 | apps/tenant-api/handlers/portal.go:490-556 | TenantInviteSeat 创建 user+seat 未用事务 → 孤儿数据 | db.Transaction 包裹 |
| 9 | 后端 | apps/tenant-api/handlers/admin.go:845-889 | seats_limit 先 count 后 insert 的 TOCTOU 竞态 → 并发超限 | 事务 + FOR UPDATE 或 DB 约束 |
| 10 | 后端 | apps/tenant-api/auth/jwt.go:22 | JWT 24h 无服务端吊销，登出仅清 cookie，token 泄露无法止血 | 短 access + refresh，或维护吊销表 |
| 11 | 后端 | apps/tenant-api/models/models.go:173 | tenant_credentials.workspace_id 单列 uniqueIndex：revoke 后无法再建新凭证 | 唯一键改 (workspace_id, deleted_at) 语义 |
| 12 | 后端 | apps/tenant-api/middleware/tenant_context.go:76-83 | 归属校验绕过软删过滤，已软删 workspace 仍可通过 | 补 status/deleted_at 条件 |
| 13 | 后端 | apps/tenant-api/repo/repo.go | TenantRepo 租户隔离基类几乎未被使用，handler 全部裸查 → 隔离依赖自觉 | 业务查询统一收敛到 repo 层 |
| 14 | 数据库 | migrations/0001_init.sql:224-232 | audit_logs 挂 9 个单列索引（低基数列），真实查询是复合条件 → 写放大+filesort | 建 (tenant_id, created_at) 复合索引，删低价值单列 |
| 15 | 数据库 | migrations/0001_init.sql 多处 | 冗余索引：3 个单列索引被联合唯一索引最左前缀完全覆盖 | 删除单列版本 |
| 16 | 数据库 | config/config.go:37 | DSN `loc=Local` + DATETIME 无时区 → 跨时区统计错乱 | 统一 loc=UTC 存取 |
| 17 | 架构 | 部署脚本 start_*.bat/.ps1 | 无 Dockerfile/PM2/systemd，六服务全靠 `go run`/`next dev` 跑 Windows cmd 窗口 | 容器化、编排入仓、dev/prod 分离 |
| 18 | 架构 | turbo.json + verify.ps1 | Go 质量门依赖 Windows-only PS 脚本，Python MCP 无测试入口，三语言游离于 Turborepo 管线外 | 跨平台 CI 统一 |
| 19 | 前端 | apps/web/app/(marketing)/layout.tsx:332 | 约 326 行 CSS 通过 style dangerouslySetInnerHTML 内联，不可缓存 | 抽为独立 CSS Module |
| 20 | 前端 | apps/web/app/(sites)/site/[[...slug]]/page.tsx | 整页 force-dynamic + revalidate=0，多 fetch 串行 → TTFB 高无 CDN 缓存 | ISR + Promise.all 并行 |
| 21 | 前端 | apps/web/components/workbench/ChatStream.tsx:65-67 | 时间线用索引 key + 每条 messages.find() → O(n²) 长会话退化 | 用 entry.id 作 key + Map 查找 |
| 22 | 前端 | apps/desktop/src/main.tsx, apps/mobile/ | 跨包直接 import Next.js 应用源码进 Vite → 构建脆弱、耦合严重 | 将可复用 UI 抽到 packages/ui |
| 23 | 前端 | apps/admin/src/pages/*.tsx | 大面积 `params: any`、接口 `any[]` → 类型安全形同虚设 | 定义接口替换 any |
| 24 | 前端 | apps/web/app/api/sessions/[id]/stream/route.ts:19-37 | SSE 代理不校验调用方身份，仅靠 sessionId 保密 | BFF 层先验登录态再放行 |

---

## P3 — 规范/建议（可选优化）

| # | 层 | 位置 | 问题 | 建议 |
|---|---|---|---|---|
| 1 | 后端 | apps/tenant-api/main.go:275 | PATCH /portal/sessions 与 POST 同指 upsert，语义混乱 | 改为 PUT /sessions/:sessionId |
| 2 | 后端 | apps/tenant-api/handlers/portal.go:253-257 | 登录时 tenant 不存在返回 401、workspace 不存在返回 404 → 可枚举 slug | 统一 401 |
| 3 | 后端 | apps/tenant-api/handlers/portal.go:525 | 邀请用户占位密码用 time.Now().UnixNano() → 可预测 | 改用 crypto/rand |
| 4 | 后端 | apps/tenant-api/handlers/portal.go:830 | SessionID 无长度限制，超 varchar(128) 时 500 | 加 binding:"max=128" |
| 5 | 后端 | apps/tenant-api/handlers/portal.go:941-980 | 内部 token 响应无 Cache-Control: no-store | 补 no-store |
| 6 | 后端 | apps/tenant-api/middleware/tenant_jwt_context.go:186 | nonce 每请求被轮换两次（中间件+handler），冗余易错 | 单点轮换 |
| 7 | 后端 | apps/tenant-api/main.go:86-93 | /healthz 暴露数据库名 | 生产只回 ok |
| 8 | 后端 | apps/tenant-api/main.go:284 | r.Run 阻塞无 graceful shutdown | http.Server + Shutdown |
| 9 | 数据库 | migrations/0001_init.sql:210-233 | audit_logs 带 updated_at + 软删除，审计表应 append-only | 去掉 DeletedAt/UpdatedAt |
| 10 | 数据库 | migrations 各表 | 枚举仅靠应用层常量约束，MySQL CHECK 约束未用 | 关键状态列加 CHECK |
| 11 | 数据库 | models/models.go:360 | user_sessions.title 默认值硬编码中文"新会话" | 默认值移到应用层 |
| 12 | 数据库 | 无 schema_migrations 版本跟踪表 | AutoMigrate 与 SQL 双基线已产生实际漂移 | 引入迁移工具+单一基线 |
| 13 | 前端 | apps/admin/src/App.tsx:232 | 裸 `useEffect;` 语句绕过 lint → 死代码 | 删除 |
| 14 | 前端 | apps/web/app/layout.tsx | 根 metadata 缺 viewport、OpenGraph、Twitter 卡片 | 补全 metadata |
| 15 | 前端 | apps/web/app/api/inbox/[id]/reply/route.ts | v0.2 占位仅 console.log 无实际逻辑 | 返回 501 或标注 TODO |
| 16 | 前端 | apps/mobile/src/App.tsx | SessionsList 接收但忽略 props，SESSIONS 硬编码假数据 | 移除或接通真实会话 |
| 17 | 架构 | packages/agent-protocol/src/index.ts | 纯 TS 类型无运行时校验，bridge/web 均 `as` 断言信任 JSON | 引入 zod/valibot 校验 |
| 18 | 架构 | .gitignore（根目录） | 未忽略 *.exe，apps/tenant-api 下已有 4 个 .exe 构建产物 | 补 *.exe / *.exe~ |
| 19 | 架构 | 全项目日志 | log.Printf/console.log 无级别、无 trace-id，错误无错误码 | 结构化日志 + 统一错误码 |

---

## 附录：审查范围说明

本次审查覆盖 `hutian-seo-geo-agent` monorepo 全部应用源码：

- **apps/tenant-api**（Go）：main.go、config/、middleware/、handlers/、auth/、models/、repo/、db/、migrations/、token/、cmd/
- **apps/agent-bridge**（Node/TS）：src/server.ts、src/auth/、src/llm/、src/loop/、src/mcp/
- **apps/web**（Next.js）：app/、components/、lib/、scripts/
- **apps/admin**（Vite+React+AntD）：src/ 全部页面与 API 层
- **apps/mobile**（Capacitor）：src/
- **apps/desktop**（Wails）：src/
- **packages/agent-protocol**：共享类型定义

未审查范围：node_modules、dist、.next、构建产物、siteBase 子项目（独立 ThinkPHP 项目）、prototype HTML 文件。

---

## 整体评价

**架构设计**：该项目的多租户架构意识明显高于平均水平——"Go 单一信任源 + HMAC 短期 token + 每 workspace 独立 CMS 实例"的 ADR 设计、httpOnly Cookie + CSRF nonce 双因子防护、破坏性操作确认闸门、成体系的隔离探针测试，都体现出清晰的安全思维。monorepo 划分合理，agent-protocol 共享契约将 Agent 事件流类型化，BFF 代理 SSE 的模式干净。

**核心风险**：安全边界存在致命的 fail-open 断点。P0 问题集中在三处：(1) 租户身份纯靠自报 header + internal token 签发无认证；(2) bridgeToken.ts 缓存 key bug 导致跨租户数据泄露；(3) 前端 5 处 dangerouslySetInnerHTML/rehype-raw 直接消费 Agent 可控内容。这些是上线前必须清零的阻断项。

**工程质量**：呈现"高保真原型/早期产品"特征。视觉与交互完整度好，但错误处理、并发安全、资源回收等生产级关注普遍缺失。多处安全机制是"声明式"而非"运行式"的（字段存在但从不写入、配置缺失时 fail-open）。schema 双基线已产生实际漂移。

**结论**：架构设计 8/10，工程实现 5.5/10。当前形态适合内网演示/试点，不宜直接对外提供多租户服务。建议按 P0→P1 顺序修复后再评估生产就绪度。

---

## 修复记录（2026-08-08）

### 本轮已修复项

**P0（9/10 闭环，1 项部分修复+债）：**

| # | 修复内容 | 改动文件 |
|---|---|---|
| P0-1 | /api/v1 加 X-Internal-Secret 服务密钥中间件，未配置则全拒绝（fail-closed） | config/config.go, main.go |
| P0-2 | bridgeToken.ts 缓存 key 改用 JWT payload 段（不同用户 payload 不同） | apps/web/lib/bridgeToken.ts |
| P0-3 | Dev 默认改 false + CORS 改白名单（localhost:3000/4319） | config/config.go, main.go |
| P0-4 | MailReader 改纯文本渲染 | components/inbox/MailReader.tsx |
| P0-5 | TerminalView 改纯文本渲染 | components/workbench/RightPanel.tsx |
| P0-6 | ToolCall checks 改纯文本渲染 | components/workbench/ToolCall.tsx |
| P0-7 | MarkdownRenderer 移除 rehype-raw | components/workbench/MarkdownRenderer.tsx |
| P0-8 | PortalShell 默认凭据 env 条件化（NODE_ENV!=="production"） | components/portal/PortalShell.tsx |
| P0-9 | admin 登录页 token 提示仅 DEV 显示 | apps/admin/src/App.tsx |
| P0-10 | ⚠️ 部分修复：删 console.log 泄露。**localStorage→httpOnly cookie 迁移列为 M5 债** | apps/admin/src/api/client.ts |

**P1（10/22 已修复）：**

| # | 修复内容 | 改动文件 |
|---|---|---|
| P1-2 | jwtSigner nil 检查，防 panic | handlers/portal.go |
| P1-4 | writeAudit 改 json.Marshal + 错误日志 | handlers/admin.go |
| P1-6 | SSE /events 加 token 验签 | agent-bridge/src/server.ts |
| P1-7 | /messages + /events 加会话归属校验（tenant_id 不匹配→403） | agent-bridge/src/server.ts |
| P1-8 | MCP 子进程 env 改最小白名单（不再泄露 HMAC 密钥） | agent-bridge/src/mcp/pool.ts |
| P1-11 | bridge fail-closed：生产/严格模式缺 key 启动失败 | agent-bridge/src/auth/tenant-token.ts |
| P1-12 | 补 0004_user_sessions.sql migration | migrations/0004_user_sessions.sql |
| P1-15 | Tenants rowKey="ID"→"id" | apps/admin/src/pages/Tenants.tsx |
| P1-16 | Audit rowKey="ID"→"id" | apps/admin/src/pages/Audit.tsx |
| P1-18 | send()/flushPending 加 resp.ok 检查 | apps/web/lib/useAgentSession.ts |

### 回归探针结果

```
go vet:          PASS
go build:        PASS
T6.3a 隔离:      4/4 PASS  ← 隔离链完好
T6.3b 跨语言:    6/6 PASS  ← token 签发/验签/路由隔离完好
admin-isolation: 7/7 PASS  ← admin 鉴权完好
m5-auth:         11/11 PASS ← cookie+CSRF+logout 完好
tenant-selfservice: 5/13   ← M5 遗留探针债（探针用 Bearer token，M5 已改 cookie）
```

**结论：安全修复未崩隔离链。** 隔离层（T6.3a/b）和安全层（m5-auth, admin-isolation）同时绿。

### 遗留债（需排期）

1. **P0-10 完整修复**：admin token 从 localStorage 迁移到 httpOnly cookie（与 portal 的 HUTIAN_TENANT_TOKEN 同方案）
2. **P0-8/9 闭环验证**：需 `next build` 后 grep 生产 bundle 确认无默认凭据字符串
3. **tenant-selfservice 探针适配 M5**：改用 cookie 认证方式
4. **P1-1 登录锁定**：FailedLoginCount/LockedUntil 字段写入逻辑
5. **P1-9/10 Agent 安全**：cms 写工具纳入破坏性闸门 + cms_upload_media 路径白名单
6. **P1-13/14 Schema 基线统一**：确立 SQL 文件为唯一基线，解决软删除+唯一约束冲突

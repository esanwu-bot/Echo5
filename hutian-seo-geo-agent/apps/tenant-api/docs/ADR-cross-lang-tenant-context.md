# ADR · 跨语言租户上下文传递

| 项 | 值 |
|---|---|
| 状态 | Accepted |
| 关联 | 多租户-PRD补充 FR-T01/T04/T05 · 多租户-开发计划 T6.2/T6.3 |
| 背景 | Go 独立 tenant-api 服务把租户上下文从单进程中间件变成跨服务传递 |

## 背景

多租户元数据用 Go tenant-api 服务（T6.1-T6.2），业务逻辑在 Node bridge + Python MCP。租户上下文必须跨语言传递：

```
用户请求(带 tenant token)
  → web BFF (Node)
  → tenant-api (Go) 验租户 + 解析 tenant/workspace
  → bridge (Node) agent loop
  → MCP (Python) 工具调 siteBase
  → siteBase 实例（按 workspace 路由）
```

**风险（P0）**：若上下文传递没显式设计，T6.3 探针在 Go 层全绿，但 bridge/MCP 调 siteBase 时没带 tenant，业务数据照样串——假隔离。

## 决策：Go 当多租户网关 + HMAC 签名内部 token

### 方案选择

| 方案 | 描述 | 否决/采纳 |
|---|---|---|
| A. 多语言共享元数据库 | bridge/MCP 各自连 hutian 库验租户 | 否决：隔离逻辑在三种语言各实现一遍，重复 + 易漏；DB 凭证散布 |
| **B. Go 网关 + HMAC 签名 token** | Go 验完租户签发短期内部 token，下游验签即可 | **采纳**：单一信任源，隔离逻辑只在 Go，下游只验签不连 hutian |

### token 设计

```json
{
  "tenant_id": 1,
  "workspace_id": 10,
  "sitebase_instance_id": 100,
  "sitebase_base_url": "http://localhost:8001/api/v1",
  "seat_id": 0,
  "exp": 1735689600,
  "iat": 1735689300
}
```

- payload 明文（非敏感）+ HMAC-SHA256 签名
- 下游（bridge/MCP）用共享密钥验签，验签后信任 payload 里的 tenant/workspace/sitebase 路由
- 短期（5 分钟），过期重签
- 密钥从 env `TENANT_INTERNAL_TOKEN_KEY` 读，不进仓库

### 上下文流

1. web BFF 收用户请求，带用户 JWT
2. web BFF 调 `tenant-api POST /internal/token`，传用户 JWT
3. tenant-api 验用户 JWT → 解析 tenant/workspace → 查 DB 确认归属 → 签发内部 token
4. web BFF 把内部 token 放 `X-Tenant-Token` 头传给 bridge
5. bridge 调 MCP 工具时，内部 token 透传
6. MCP 工具验签 → 从 payload 取 `sitebase_base_url` → 路由到正确 siteBase 实例

### 隔离保障

- **单一信任源**：隔离逻辑（workspace 归属校验、siteBase 路由）只在 Go tenant-api
- **下游不连 hutian 库**：bridge/MCP 不知 hutian DSN，无法绕过 Go 直查元数据
- **签名防篡改**：下游无法伪造 tenant/workspace，改 payload 签名失效
- **短期 token**：5 分钟过期，泄露窗口小

## 跨语言探针要求（T6.3b）

Go 层探针（T6.3a）只验 Go 进程内隔离。跨语言探针（T6.3b）必须验：

1. **token 签发**：A 的 ctx 签发的 token，payload 含 A 的 tenant/workspace/sitebase_instance
2. **token 验签**：篡改 payload → 验签失败
3. **workspace 路由**：A 的 token 里的 sitebase_base_url ≠ B 的（防 A 调到 B 的 siteBase）
4. **越权 token 签发**：A 用 B 的 workspace 请求签发 → 403（Go 层中间件已挡，跨语言层再验一次）

## 开放问题

- 用户 JWT（外部身份）如何映射到 tenant/workspace：M6 起步用请求头直传，正式用 OAuth/OIDC 后另立 ADR
- token 撤销：短期 + 不维护撤销列表，泄露靠过期；高敏操作另加 audit
- 密钥轮换：env 支持多版本密钥（TENANT_INTERNAL_TOKEN_KEY_v2），验签时按 kid 选

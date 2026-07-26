# Grok 经 CLIProxyAPI 接入方案

## 定位

Grok 在壶天架构中**只是 LLM 后端之一**，不是 agent host：

- 自建 agent loop 仍是唯一主线（写在 bridge 里）
- Grok 通过本地 CLIProxyAPI 暴露的 OpenAI 兼容端点接入
- `GrokClient` 实现 `LLMClient` 接口，loop 零改动
- 默认 LLM 仍是 CodeBuddy；Grok 优先级需本地探针 GREEN 后显式启用

## 架构

```
用户输入 → bridge → runAgentLoop → GrokClient ──HTTP──> CLIProxyAPI ──> xAI Grok
                              │
                              └────── StdioMcpClient ──> hutian-seo-mcp

事件流：runAgentLoop 产出 AgentEvent → bridge 推 SSE → 前端
```

## 本地启动 CLIProxyAPI

1. 安装并登录 grok CLI / grok-build（按 xAI 官方文档）
2. 启动本地代理（示例，具体命令以 grok 官方为准）：

```bash
grok proxy --port 52415
```

默认暴露 `http://localhost:52415/v1`，与 `GrokClient` 默认值一致。

## 环境变量

复制 `hutian-seo-geo-agent/.env.example` 为 `.env`，按需配置：

```bash
# 供应商优先级
# "codebuddy" (默认) | "grok" | "auto"
LLM_PROVIDER=grok

# Grok 代理端点
GROK_PROXY_BASE=http://localhost:52415/v1
GROK_MODEL=grok-3-latest      # 需确认该 model 支持 function calling
GROK_API_KEY=                 # CLIProxyAPI 多数不要求，可留空
GROK_TIMEOUT_MS=30000
GROK_RETRIES=1
```

## 探针验证（启用前必须跑绿）

```bash
cd hutian-seo-geo-agent/apps/agent-bridge

# 探针 1：派生 schema + 结构化 tool_calls
pnpm run probe:grok-derived

# 探针 2：真 LLM + 真 MCP 跑完整 loop
pnpm run probe:grok-loop
```

两条都 GREEN 后，才把 `LLM_PROVIDER=grok` 当作生产默认值。

## 降级与护栏

`GrokClient` 内置：

- **30s 超时**：单次 `chat` 调用 30s，避免本地代理 hang 导致 loop 卡死
- **1 次重试**：网络/代理抖动时重试
- **快速失败**：CLIProxyAPI 未启动或崩溃时，`ping` 失败，bridge 启动时自动降级到 CodeBuddy → Mock
- **业务错误不重试**：4xx / "function calling not supported" 等直接抛错

`buildLLM` 行为：

| LLM_PROVIDER | 行为 |
|---|---|
| `codebuddy` | 只用 CodeBuddy，不探测 Grok（默认，启动最快） |
| `grok` | Grok 优先，ping 失败降级到 CodeBuddy → Mock |
| `auto` | Grok 活着就用（1s 超时探测），否则 CodeBuddy → Mock |

## 风险与开放问题（不阻塞本地开发，阻塞对外发布）

1. **xAI OAuth 凭据存储**：grok CLI 的登录态是否明文落盘、是否多租户共享，需审计
2. **供应链评估**：CLIProxyAPI 作为数据经手中间人，流量是否经过 xAI 日志/审计
3. **成本与限速**：Grok API 免费/付费档的 RPM/TPM 限制，需在生产环境实测
4. **model 支持度**：`grok-3-latest` 是否稳定支持 function calling，需随版本重新跑探针

## 与自建loop.md 的关系

- `自建loop.md` 是主线设计文档：loop 位置、事件契约、流程控制硬编码
- `grok-setup.md` 是可选后端的部署/验证手册
- 两者不打架：Grok 是 LLM 后端可选实现之一，不是替代 loop 的方案

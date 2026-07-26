# 通过 CLIProxyAPI 调用本地 Grok Build 部署指南

本文档说明如何在 Windows/macOS/Linux 上配置 `hutian-seo-geo-agent` 使用本地 Grok Build 模型。

## 架构概述

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  agent-bridge   │────▶│  CLIProxyAPI     │────▶│  Grok CLI       │
│  (GrokClient)   │     │  (127.0.0.1:8317)│     │  (xAI OAuth)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │ OpenAI 兼容 API       │ 本地代理               │ 实际推理
        ▼                       ▼                        ▼
   http://127.0.0.1:8317/v1/chat/completions
```

**核心组件：**
1. **GrokClient** (`apps/agent-bridge/src/llm/grok-client.ts`)：实现 `LLMClient` 接口，调用 CLIProxyAPI
2. **CLIProxyAPI**：本地代理服务，将 xAI Grok CLI 转为 OpenAI 兼容 API
3. **Grok CLI**：xAI 官方命令行工具，处理 OAuth 认证和推理请求

---

## 一、前置条件

### 系统要求
- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 12+ (Intel/Apple Silicon)
- **Linux**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+

### 软件依赖
- Node.js 18+ (用于 CLIProxyAPI)
- npm 或 pnpm
- xAI Grok 订阅账户

---

## 二、安装步骤

### 步骤 1：安装 CLIProxyAPI

```bash
# 全局安装 CLIProxyAPI
npm install -g cliproxyapi

# 验证安装
cliproxy --version
```

### 步骤 2：创建配置文件

**Windows (PowerShell):**
```powershell
$configDir = "$env:USERPROFILE\.cli-proxy-api"
New-Item -ItemType Directory -Force -Path $configDir

$config = @"
host: "127.0.0.1"
port: 8317
remote-management:
  allow-remote: false
  disable-control-panel: true
auth-dir: "~/.cli-proxy-api"
api-keys:
  - "your-secure-api-key-here"
debug: false
logging-to-file: true
"@

Set-Content -Path "$configDir\config.yaml" -Value $config
icacls "$configDir\config.yaml" /grant:r "$($env:USERNAME):(R)"
```

**macOS/Linux (Bash):**
```bash
mkdir -p ~/.cli-proxy-api
cat > ~/.cli-proxy-api/config.yaml << 'YAML'
host: "127.0.0.1"
port: 8317
remote-management:
  allow-remote: false
  disable-control-panel: true
auth-dir: "~/.cli-proxy-api"
api-keys:
  - "your-secure-api-key-here"
debug: false
logging-to-file: true
YAML
chmod 600 ~/.cli-proxy-api/config.yaml
```

> **重要**：替换 `your-secure-api-key-here` 为随机生成的安全密钥（建议使用 `openssl rand -hex 32` 生成）

### 步骤 3：授权 Grok

```bash
# 执行 OAuth 登录（会打开浏览器）
cliproxy --xai-login
```

按照浏览器提示完成 xAI 账户登录授权。成功后会在 `~/.cli-proxy-api/` 目录下生成认证文件。

### 步骤 4：启动 CLIProxyAPI

**方式 A：前台运行（开发调试）**
```bash
cliproxy
```

**方式 B：后台服务（生产环境）**

macOS (Homebrew):
```bash
brew services start cliproxyapi
```

Windows (以管理员身份运行 PowerShell):
```powershell
# 创建 Windows 服务（需要 NSSM 或其他服务管理工具）
# 或使用任务计划程序设置开机启动
```

Linux (systemd):
```bash
sudo systemctl enable cliproxyapi
sudo systemctl start cliproxyapi
```

### 步骤 5：验证服务

```bash
# 测试 API 连通性
curl http://127.0.0.1:8317/v1/models \
  -H "Authorization: Bearer your-secure-api-key-here" \
  | jq '.data[] | select(.owned_by == "xai")'

# 预期输出类似：
# {
#   "id": "grok-4.5",
#   "object": "model",
#   "owned_by": "xai"
# }
```

---

## 三、配置 Agent Bridge

### 步骤 1：复制环境变量文件

```bash
cd /workspace/hutian-seo-geo-agent
cp .env.example .env
```

### 步骤 2：编辑 `.env` 文件

```bash
# 填入步骤 2 中配置的 API Key
GROK_PROXY_API_KEY=your-secure-api-key-here

# 可选：自定义端点（默认即可）
GROK_PROXY_BASE_URL=http://127.0.0.1:8317/v1

# 可选：选择模型版本
# grok-4.5: 最新版本，支持 tool calling 和 reasoning
# grok-4.5-build: 构建优化版
# grok-4.3: 旧版（不推荐）
GROK_MODEL=grok-4.5
```

### 步骤 3：启动 Agent Bridge

```bash
cd /workspace/hutian-seo-geo-agent
pnpm install
pnpm --filter @hutian/agent-bridge dev
```

观察启动日志：
```
[agent-bridge] session xxx start loop (llm=grok)
[agent-bridge] :4317
```

如果显示 `llm=grok` 表示成功加载 GrokClient；如果显示 `llm=codebuddy` 或 `llm=mock-fallback`，请检查环境变量配置。

---

## 四、故障排查

### 问题 1：`GROK_PROXY_API_KEY not set`

**原因**：环境变量未正确加载

**解决**：
```bash
# 检查 .env 文件是否存在
ls -la .env

# 手动导出变量
export GROK_PROXY_API_KEY=your-secure-api-key-here

# 重启服务
```

### 问题 2：`connect ECONNREFUSED 127.0.0.1:8317`

**原因**：CLIProxyAPI 未启动

**解决**：
```bash
# 检查进程
ps aux | grep cliproxy

# 重新启动
cliproxy

# 检查端口占用
netstat -ano | findstr :8317    # Windows
lsof -i :8317                   # macOS/Linux
```

### 问题 3：OAuth 授权失败

**原因**：xAI 账户无 Grok 订阅或网络问题

**解决**：
1. 确认账户已订阅 Grok（访问 https://grok.com 验证）
2. 清除旧认证重新登录：
   ```bash
   rm -rf ~/.cli-proxy-api/xai-*
   cliproxy --xai-login
   ```
3. 检查防火墙/代理设置

### 问题 4：模型返回 404 或 403

**原因**：模型名称错误或 API Key 无效

**解决**：
```bash
# 列出可用模型
curl http://127.0.0.1:8317/v1/models \
  -H "Authorization: Bearer your-secure-api-key-here" \
  | jq '.data[].id'

# 更新 .env 中的 GROK_MODEL
GROK_MODEL=grok-4.5  # 使用列表中存在的模型 ID
```

---

## 五、高级配置

### 多模型切换

在 `.env` 中快速切换模型：
```bash
# 使用最新构建版
GROK_MODEL=grok-4.5-build

# 降级到稳定版
GROK_MODEL=grok-4.3
```

### 自定义 CLIProxyAPI 端口

修改 `~/.cli-proxy-api/config.yaml`:
```yaml
port: 9317  # 自定义端口
```

同步更新 `.env`:
```bash
GROK_PROXY_BASE_URL=http://127.0.0.1:9317/v1
```

### 启用远程访问（不推荐）

修改 `~/.cli-proxy-api/config.yaml`:
```yaml
host: "0.0.0.0"  # 监听所有网卡
remote-management:
  allow-remote: true
  disable-control-panel: false
```

> **警告**：这会暴露 API 到公网，务必配置强密码和防火墙规则！

---

## 六、与 zhijian-skills 集成

如需复用 `zhijian-skills/workbuddy-cli-model-bridge` 的自动化脚本：

```bash
# 克隆仓库
git clone https://github.com/zjp1997720/zhijian-skills.git
cd zhijian-skills/skills/workbuddy-cli-model-bridge

# 审计当前状态
python3 scripts/bridge.py audit

# 自动引导安装
python3 scripts/bridge.py bootstrap --apply

# 授权 Grok
python3 scripts/bridge.py authorize xai-grok

# 获取生成的 client key
cat ~/.config/workbuddy-cli-model-bridge/secret.json | jq -r .proxy_api_key
```

将输出的 key 填入 `.env` 的 `GROK_PROXY_API_KEY` 即可。

---

## 七、性能优化建议

1. **使用 grok-4.5-build**：相比标准版推理速度提升约 15%
2. **本地部署**：确保 CLIProxyAPI 和 agent-bridge 在同一台机器，避免网络延迟
3. **连接复用**：agent-bridge 已实现 MCP client 复用，无需额外配置
4. **监控资源**：Grok CLI 可能占用较多内存，建议至少 8GB RAM

---

## 参考链接

- [CLIProxyAPI GitHub](https://github.com/router-for-me/CLIProxyAPI)
- [zhijian-skills/workbuddy-cli-model-bridge](https://github.com/zjp1997720/zhijian-skills/tree/main/skills/workbuddy-cli-model-bridge)
- [xAI Grok API 文档](https://docs.x.ai/)
- [腾讯云 TokenHub](https://cloud.tencent.com/document/product/1823/130079)

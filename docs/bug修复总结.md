# Bug 修复总结：Admin 登录后 Overview 401 token mismatch

## 日期

2026-07-30

## 现象

管理后台（apps/admin, localhost:4319）输入正确 token 登录后，进入 Overview 页面时 API 返回红色错误：

```
总览加载失败：401 admin token invalid — token mismatch
```

随后被重定向回登录页。

## 根因

`start_all_web_with_sitebase.ps1` 通过 `Start-ServiceWindow` 在 cmd.exe 子窗口中启动 tenant-api，命令为：

```bat
set TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod && set TENANT_JWT_KEY=... && go run .
```

cmd.exe 的 `set` 命令会把 `&&` 前的空格也吃进变量值，导致后端实际持有的 token 为 `"dev-admin-token-change-in-prod "`（末尾多一个空格）。而 Go net/http 读取 HTTP Header 时会自动 trim 首尾空白，前端发来的 token 永远不带尾随空格，`subtle.ConstantTimeCompare` 恒定时间比较永远不等 → 401。

## 修复

### 1. 后端入参 trim（防御性）

`apps/tenant-api/middleware/admin_context.go`：

```go
got := strings.TrimSpace(c.GetHeader("X-Admin-Token"))
```

### 2. 配置加载 trim（防御性）

`apps/tenant-api/config/config.go`：

```go
AdminToken: strings.TrimSpace(os.Getenv("TENANT_ADMIN_TOKEN")),
JWTKey:     strings.TrimSpace(os.Getenv("TENANT_JWT_KEY")),
```

### 3. 启动脚本修正（根源）

`start_all_web_with_sitebase.ps1` 中 `set` 改为引号包裹写法，cmd.exe 的 `set "VAR=value"` 不会吃尾随空格：

```powershell
-Command "set `"TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod`" && set `"TENANT_JWT_KEY=dev-jwt-key-change-in-prod`" && go run ."
```

### 4. 清理废弃脚本

- 删除 `start_super_admin.bat`（内容为 PowerShell 语法但扩展名 .bat，从未正确工作）
- 删除 `setup.ps1`（早期脚手架生成脚本，已无用）

## 经验教训

- Windows cmd.exe 的 `set VAR=value && next` 是经典陷阱，`&&` 前空格会被纳入值。始终用 `set "VAR=value"` 引号包裹。
- 环境变量、用户输入等外部来源的字符串，在使用前应做 TrimSpace 防御。
- 恒定时间比较（防时序攻击）不会帮你容忍空白差异，必须在比较前归一化。

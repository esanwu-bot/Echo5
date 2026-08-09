# ============================================================================
# tenant-api CI gate script (Windows / PowerShell 5.1)
# ============================================================================
# Reviewer P1: Go service go vet/test/build + isolation probes must enter CI,
# not float outside the pnpm + Turborepo Node/TS pipeline.
#
# Orchestration: go vet -> go build -> probe:schema-baseline -> start tenant-api -> run 8 probes -> start tool-executor -> run 3 probes (tenant-api+tool-executor both up) -> kill both -> exit
#   - probe:schema-baseline       (P1-13/14 模型↔SQL migration 对齐，静态检查，4 asserts)
#   - probe:tenant-isolation      (T6.3a Go layer, 4 asserts)
#   - probe:cross-lang            (T6.3b cross-lang boundary, 6 asserts)
#   - probe:admin-isolation       (P0-1 admin auth seam, 7 asserts)
#   - probe:tenant-selfservice    (T7.4 portal self-service, 13+ asserts)
#   - probe:m5-auth               (M5 收口：httpOnly cookie / CSRF / 404 UX / logout)
#   - probe:login-lockout         (P1-1 登录失败锁定：N 次失败→423、成功清零)
#   - probe:api-keys              (T9.1 开放 API key 管理：创建/列表/吊销/鉴权/越权，8 asserts)
#   - probe:open-api              (T9.2 开放 API 工具端点：diagnose/schema/check/sitemap/submit，6 asserts)
#   - probe:quota                 (T9.3 配额执行链路：拦截/空窗口并发首调TOCTOU/无配额放行/allow策略，4 asserts)
#   - probe:rate-limit            (T9.4 限流：限额内放行/超限429/Retry-After头，3 asserts)
#   - probe:t9-tool-executor      (T9.0 工具执行层 Go→Python REST 调通，4 asserts)
#
# Run from repo root:
#   pnpm probe:tenant
#   # or directly:
#   powershell -ExecutionPolicy Bypass -File apps/tenant-api/verify.ps1
#
# Prereqs:
#   - hutian db created + migration applied (0001_init.sql/0002_users.sql or tenant-api -migrate)
#   - M6 seed loaded: mysql hutian < cmd/probe_tenant_isolation/seed.sql
#   - portal seed loaded: go run ./cmd/seed_portal_user
# ============================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path (Join-Path $PSScriptRoot "..") "..")
$apiDir   = Join-Path $repoRoot "apps\tenant-api"

Write-Host "=== [1/16] go vet ===" -ForegroundColor Cyan
Push-Location $apiDir
go vet ./...
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: go vet" -ForegroundColor Red; Pop-Location; exit 1 }
Write-Host "PASS: go vet" -ForegroundColor Green

Write-Host "=== [2/16] go build ===" -ForegroundColor Cyan
go build ./...
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: go build" -ForegroundColor Red; Pop-Location; exit 1 }
Write-Host "PASS: go build" -ForegroundColor Green

Write-Host "=== [3/16] probe:schema-baseline (P1-13/14 模型↔SQL 对齐) ===" -ForegroundColor Cyan
go run ./cmd/probe_schema_baseline
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:schema-baseline" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:schema-baseline" -ForegroundColor Green
}

# Probes need the service running. Check if 4318 is already listening; if not, start one.
# Env must be set BEFORE the check: probes read them regardless of who started the service.
$env:TENANT_INTERNAL_TOKEN_KEY = "dev-secret-key-change-in-prod"
$env:TENANT_JWT_KEY = "dev-jwt-key-change-in-prod"
$env:TENANT_ADMIN_TOKEN = "dev-admin-token-change-in-prod"
$env:TENANT_INTERNAL_API_SECRET = "dev-internal-secret-change-in-prod"
$env:TENANT_API_DEV = "true"
$env:TENANT_LOGIN_MAX_ATTEMPTS = "3"
$needStop = $false
$proc = $null
try {
    $health = Invoke-WebRequest -Uri "http://localhost:4318/healthz" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "=== [4/16] tenant-api already running (healthz=$($health.StatusCode)) ===" -ForegroundColor Cyan
} catch {
    Write-Host "=== [4/16] start tenant-api (background) ===" -ForegroundColor Cyan
    $proc = Start-Process -FilePath "go" -ArgumentList "run","." -WorkingDirectory $apiDir -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\tenant-api.verify.log" -RedirectStandardError "$env:TEMP\tenant-api.verify.err"
    $needStop = $true
    # Wait for service to be healthy (up to 20s)
    $ok = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            $h = Invoke-WebRequest -Uri "http://localhost:4318/healthz" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            if ($h.StatusCode -eq 200) { $ok = $true; break }
        } catch {
            # not up yet, keep waiting
        }
    }
    if (-not $ok) {
        Write-Host "FAIL: tenant-api did not become healthy in 20s" -ForegroundColor Red
        Write-Host "--- stderr ---"
        Get-Content "$env:TEMP\tenant-api.verify.err" -ErrorAction SilentlyContinue
        if ($null -ne $proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
        Pop-Location
        exit 1
    }
    Write-Host "tenant-api up (pid=$($proc.Id))" -ForegroundColor Green
}

$exitCode = 0

Write-Host "=== [5/16] probe:tenant-isolation (T6.3a Go layer) ===" -ForegroundColor Cyan
go run ./cmd/probe_tenant_isolation
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:tenant-isolation" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:tenant-isolation" -ForegroundColor Green
}

Write-Host "=== [6/16] probe:cross-lang (T6.3b cross-lang boundary) ===" -ForegroundColor Cyan
$env:TENANT_INTERNAL_TOKEN_KEY = "dev-secret-key-change-in-prod"
go run ./cmd/probe_cross_lang
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:cross-lang" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:cross-lang" -ForegroundColor Green
}

Write-Host "=== [7/16] probe:admin-isolation (P0-1 admin auth) ===" -ForegroundColor Cyan
$env:TENANT_ADMIN_TOKEN = "dev-admin-token-change-in-prod"
go run ./cmd/probe_admin_isolation
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:admin-isolation" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:admin-isolation" -ForegroundColor Green
}

Write-Host "=== [8/16] probe:tenant-selfservice (T7.4) ===" -ForegroundColor Cyan
$env:TENANT_JWT_KEY = "dev-jwt-key-change-in-prod"
go run ./cmd/probe_tenant_selfservice
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:tenant-selfservice" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:tenant-selfservice" -ForegroundColor Green
}

Write-Host "=== [9/16] probe:m5-auth (M5 收口：cookie+CSRF+404+logout) ===" -ForegroundColor Cyan
$env:TENANT_JWT_KEY = "dev-jwt-key-change-in-prod"
go run ./cmd/probe_m5_auth
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:m5-auth" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:m5-auth" -ForegroundColor Green
}

Write-Host "=== [10/16] probe:login-lockout (P1-1：N 次失败→423、成功清零) ===" -ForegroundColor Cyan
go run ./cmd/probe_login_lockout
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:login-lockout" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:login-lockout" -ForegroundColor Green
}

Write-Host "=== [11/16] probe:api-keys (T9.1 开放 API key 管理, 8 asserts) ===" -ForegroundColor Cyan
go run ./cmd/probe_api_keys
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:api-keys" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:api-keys" -ForegroundColor Green
}

# --- T9.0 工具执行层（Python REST，系统 Python 3.13）---
# project memory 硬约束：MCP 环境必须用系统 Python 3.13.12，TRAE 自带 3.10.11 缺 _socket
$pythonExe = $env:HUTIAN_PYTHON
if (-not $pythonExe) { $pythonExe = "D:\Program Files (x86)\python\python.exe" }
$mcpDir = Join-Path $repoRoot "hutian-seo-plugin\mcp-server"
$toolProc = $null
$needStopTool = $false

Write-Host "=== [12/16] start tool-executor (T9.0 Python REST :4320) ===" -ForegroundColor Cyan
try {
    $h2 = Invoke-WebRequest -Uri "http://127.0.0.1:4320/healthz" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "tool-executor already running (healthz=$($h2.StatusCode))" -ForegroundColor Cyan
} catch {
    $toolProc = Start-Process -FilePath $pythonExe -ArgumentList "-m","hutian_seo_mcp.http_api","--port","4320" -WorkingDirectory $mcpDir -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\tool-executor.verify.log" -RedirectStandardError "$env:TEMP\tool-executor.verify.err"
    $needStopTool = $true
    $ok2 = $false
    # python 冷启动 import mcp/requests/bs4 较慢，给 30s 窗口
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $h2 = Invoke-WebRequest -Uri "http://127.0.0.1:4320/healthz" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            if ($h2.StatusCode -eq 200) { $ok2 = $true; break }
        } catch { }
    }
    if (-not $ok2) {
        Write-Host "FAIL: tool-executor did not become healthy in 30s" -ForegroundColor Red
        Get-Content "$env:TEMP\tool-executor.verify.err" -ErrorAction SilentlyContinue
        $exitCode = 1
    } else {
        Write-Host "tool-executor up (pid=$($toolProc.Id))" -ForegroundColor Green
    }
}

Write-Host "=== [13/16] probe:open-api (T9.2 开放 API 工具端点, 6 asserts) ===" -ForegroundColor Cyan
go run ./cmd/probe_open_api
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:open-api" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:open-api" -ForegroundColor Green
}

Write-Host "=== [14/16] probe:quota (T9.3 配额执行链路, 4 asserts) ===" -ForegroundColor Cyan
go run ./cmd/probe_quota
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:quota" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:quota" -ForegroundColor Green
}

Write-Host "=== [15/16] probe:rate-limit (T9.4 限流中间件, 3 asserts) ===" -ForegroundColor Cyan
go run ./cmd/probe_rate_limit
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:rate-limit" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:rate-limit" -ForegroundColor Green
}

Write-Host "=== [16/16] probe:t9-tool-executor (T9.0 Go→Python REST 调通, 4 asserts) ===" -ForegroundColor Cyan
go run ./cmd/probe_t9_tool_executor
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:t9-tool-executor" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:t9-tool-executor" -ForegroundColor Green
}

# Cleanup: kill the service if we started it
# Note: `go run .` spawns a child binary (hutian-tenant-api.exe); killing only the
# go parent leaks the child and poisons the next run ("already running" + stale code).
if ($needStop -and $null -ne $proc) {
    Write-Host "=== cleanup: stop tenant-api (go pid=$($proc.Id)) ===" -ForegroundColor DarkGray
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($proc.Id)" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
    }
    if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    Get-Process -Name "hutian-tenant-api*","tenant-api*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

if ($needStopTool -and $null -ne $toolProc -and -not $toolProc.HasExited) {
    Write-Host "=== cleanup: stop tool-executor (pid=$($toolProc.Id)) ===" -ForegroundColor DarkGray
    Stop-Process -Id $toolProc.Id -Force -ErrorAction SilentlyContinue
}

Pop-Location

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "=== verify: ALL GREEN ===" -ForegroundColor Green
} else {
    Write-Host "=== verify: FAILED (exit $exitCode) ===" -ForegroundColor Red
}
exit $exitCode

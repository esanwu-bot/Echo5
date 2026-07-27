# ============================================================================
# tenant-api CI gate script (Windows / PowerShell 5.1)
# ============================================================================
# Reviewer P1: Go service go vet/test/build + isolation probes must enter CI,
# not float outside the pnpm + Turborepo Node/TS pipeline.
#
# Orchestration: go vet -> go build -> start tenant-api -> run 4 probes -> kill -> exit
#   - probe:tenant-isolation      (T6.3a Go layer, 4 asserts)
#   - probe:cross-lang            (T6.3b cross-lang boundary, 6 asserts)
#   - probe:admin-isolation       (P0-1 admin auth seam, 7 asserts)
#   - probe:tenant-selfservice    (T7.4 portal self-service, 13+ asserts)
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

Write-Host "=== [1/6] go vet ===" -ForegroundColor Cyan
Push-Location $apiDir
go vet ./...
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: go vet" -ForegroundColor Red; Pop-Location; exit 1 }
Write-Host "PASS: go vet" -ForegroundColor Green

Write-Host "=== [2/6] go build ===" -ForegroundColor Cyan
go build ./...
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: go build" -ForegroundColor Red; Pop-Location; exit 1 }
Write-Host "PASS: go build" -ForegroundColor Green

# Probes need the service running. Check if 4318 is already listening; if not, start one.
$needStop = $false
$proc = $null
try {
    $health = Invoke-WebRequest -Uri "http://localhost:4318/healthz" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "=== [3/6] tenant-api already running (healthz=$($health.StatusCode)) ===" -ForegroundColor Cyan
} catch {
    Write-Host "=== [3/6] start tenant-api (background) ===" -ForegroundColor Cyan
    $env:TENANT_INTERNAL_TOKEN_KEY = "dev-secret-key-change-in-prod"
    $env:TENANT_JWT_KEY = "dev-jwt-key-change-in-prod"
    $env:TENANT_ADMIN_TOKEN = "dev-admin-token-change-in-prod"
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

Write-Host "=== [4/6] probe:tenant-isolation (T6.3a Go layer) ===" -ForegroundColor Cyan
go run ./cmd/probe_tenant_isolation
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:tenant-isolation" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:tenant-isolation" -ForegroundColor Green
}

Write-Host "=== [5/6] probe:cross-lang (T6.3b cross-lang boundary) ===" -ForegroundColor Cyan
$env:TENANT_INTERNAL_TOKEN_KEY = "dev-secret-key-change-in-prod"
go run ./cmd/probe_cross_lang
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:cross-lang" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:cross-lang" -ForegroundColor Green
}

Write-Host "=== [6/7] probe:admin-isolation (P0-1 admin auth) ===" -ForegroundColor Cyan
$env:TENANT_ADMIN_TOKEN = "dev-admin-token-change-in-prod"
go run ./cmd/probe_admin_isolation
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:admin-isolation" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:admin-isolation" -ForegroundColor Green
}

Write-Host "=== [7/7] probe:tenant-selfservice (T7.4) ===" -ForegroundColor Cyan
$env:TENANT_JWT_KEY = "dev-jwt-key-change-in-prod"
go run ./cmd/probe_tenant_selfservice
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: probe:tenant-selfservice" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: probe:tenant-selfservice" -ForegroundColor Green
}

# Cleanup: kill the service if we started it
if ($needStop -and $null -ne $proc -and -not $proc.HasExited) {
    Write-Host "=== cleanup: stop tenant-api (pid=$($proc.Id)) ===" -ForegroundColor DarkGray
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    # go run spawns a child process, kill that too
    Get-Process -Name "tenant-api*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

Pop-Location

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "=== verify: ALL GREEN ===" -ForegroundColor Green
} else {
    Write-Host "=== verify: FAILED (exit $exitCode) ===" -ForegroundColor Red
}
exit $exitCode

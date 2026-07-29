# 一键启动完整 B1 真链路 + 租户自服务：siteBase + tenant-api + agent-bridge + web
# 四个窗口保持开启即可。
# 入口：
#   - workbench:   http://localhost:3000/workbench
#   - 租户自服务：  http://localhost:3000/portal   (与 workbench 共享登录态)
#   - siteBase:    http://localhost:8000

# ─────────────────────────────────────────────
# 中文不乱码 · 四锁齐下（Windows PowerShell 5.x 必需）
#   1) 控制台代码页切 65001(UTF-8) —— 对 cmd/PS 宿主同时生效
#   2) System.Console 读写编码统一 UTF-8
#   3) PowerShell 管道输出编码（发往外部程序）统一 UTF-8
#   4) 每个 Start-Process cmd 子窗口开头再切一次 65001，
#      这样 php think run / go run / pnpm dev 输出到子 cmd 也不烂
# ─────────────────────────────────────────────
$null = chcp 65001
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING     = "utf-8"

$root = $PSScriptRoot

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )
    # 子 cmd 窗口先切 UTF-8 代码页，再执行目标命令（php/go/node/pnpm 都继承）
    $arguments = "/k title $Title && chcp 65001>nul && cd /d `"$WorkingDirectory`" && $Command"
    Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -WindowStyle Normal
}

Write-Host "[1/5] 启动 siteBase backend (http://localhost:8000) ..."
Start-ServiceWindow -Title "siteBase" `
    -WorkingDirectory "$root\siteBase\backend\ElectronicPart" `
    -Command "php think run --host 0.0.0.0 --port 8000"

Write-Host "[2/5] 等待 siteBase 就绪 ..."
Start-Sleep -Seconds 5

Write-Host "[3/5] 启动 tenant-api (port 4318) ..."
Write-Host "    TENANT_ADMIN_TOKEN = dev-admin-token-change-in-prod"
Write-Host "    TENANT_JWT_KEY     = dev-jwt-key-change-in-prod"
Start-ServiceWindow -Title "tenant-api" `
    -WorkingDirectory "$root\hutian-seo-geo-agent\apps\tenant-api" `
    -Command "set TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod && set TENANT_JWT_KEY=dev-jwt-key-change-in-prod && go run ."

Write-Host "[4/5] 等待 tenant-api 就绪 ..."
Start-Sleep -Seconds 4

Write-Host "[5/5] 启动 agent-bridge (http://localhost:4317) + web (http://localhost:3000) ..."
Start-ServiceWindow -Title "agent-bridge" `
    -WorkingDirectory "$root\hutian-seo-geo-agent" `
    -Command "pnpm --filter @hutian/agent-bridge run dev"

Start-ServiceWindow -Title "web" `
    -WorkingDirectory "$root\hutian-seo-geo-agent" `
    -Command "pnpm --filter @hutian/web run dev"

Write-Host ""
Write-Host "等待服务就绪后打开浏览器 ..."
Start-Sleep -Seconds 8
Start-Process "http://localhost:3000/workbench"

Write-Host ""
Write-Host "完成。四个窗口保持开启："
Write-Host "  - siteBase 窗口：    ThinkPHP 内置服务器 (8000)"
Write-Host "  - tenant-api 窗口：  租户元数据 / 自服务接口 (4318)"
Write-Host "  - agent-bridge 窗口：MCP / LLM 调用日志 (4317)"
Write-Host "  - web 窗口：         Next.js 开发服务器，workbench + portal 同 app (3000)"
Write-Host ""
Write-Host "按 Enter 键退出此窗口（服务窗口不受影响）..."
Read-Host
@echo off
REM 一键启动完整 B1 真链路 + 租户自服务：siteBase + tenant-api + agent-bridge + web
REM 四个窗口保持开启即可。
REM 入口：
REM   - workbench:   http://localhost:3000/workbench
REM   - 租户自服务：  http://localhost:3000/portal   (与 workbench 共享登录态)
REM   - siteBase:    http://localhost:8000

cd /d %~dp0

echo [1/5] 启动 siteBase backend (http://localhost:8000) ...
start "siteBase" cmd /k "cd /d %~dp0\siteBase\backend\ElectronicPart && php think run --host 0.0.0.0 --port 8000"

echo [2/5] 等待 siteBase 就绪 ...
timeout /t 5 /nobreak >nul

echo [3/5] 启动 tenant-api (port 4318) ...
echo     TENANT_ADMIN_TOKEN = dev-admin-token-change-in-prod
echo     TENANT_JWT_KEY     = dev-jwt-key-change-in-prod
start "tenant-api" cmd /k "cd /d %~dp0\hutian-seo-geo-agent\apps\tenant-api && set TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod && set TENANT_JWT_KEY=dev-jwt-key-change-in-prod && go run ."

echo [4/5] 等待 tenant-api 就绪 ...
timeout /t 4 /nobreak >nul

echo [5/5] 启动 agent-bridge (http://localhost:4317) + web (http://localhost:3000) ...
start "agent-bridge" cmd /k "cd /d %~dp0\hutian-seo-geo-agent && pnpm --filter @hutian/agent-bridge run dev"
start "web" cmd /k "cd /d %~dp0\hutian-seo-geo-agent && pnpm --filter @hutian/web run dev"

echo.
echo 等待服务就绪后打开浏览器 ...
timeout /t 8 /nobreak >nul
start http://localhost:3000/workbench

echo.
echo 完成。四个窗口保持开启：
echo   - siteBase 窗口：    ThinkPHP 内置服务器 (8000)
echo   - tenant-api 窗口：  租户元数据 / 自服务接口 (4318)
echo   - agent-bridge 窗口：MCP / LLM 调用日志 (4317)
echo   - web 窗口：         Next.js 开发服务器，workbench + portal 同 app (3000)
echo.
pause

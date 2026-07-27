@echo off
REM 启动壶天 SEO/GEO Agent 浏览器端（tenant-api + agent-bridge + web）
REM 双击即可：tenant-api 4318, bridge 4317, web 3000，自动打开工作台
REM 额外入口：
REM   - 租户自服务： http://localhost:3000/portal  (与 workbench 共享登录态)
REM   - tenant-api healthz: http://localhost:4318/healthz

cd /d %~dp0

echo [1/4] 启动 tenant-api (port 4318) ...
echo     TENANT_ADMIN_TOKEN = dev-admin-token-change-in-prod
echo     TENANT_JWT_KEY     = dev-jwt-key-change-in-prod
start "tenant-api" cmd /k "cd /d %~dp0\hutian-seo-geo-agent\apps\tenant-api && set TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod && set TENANT_JWT_KEY=dev-jwt-key-change-in-prod && go run ."

echo [2/4] 等待 tenant-api 就绪 ...
timeout /t 4 /nobreak >nul

cd /d %~dp0\hutian-seo-geo-agent

echo [3/4] 启动 agent-bridge (port 4317) + web (port 3000) ...
start "agent-bridge" cmd /k "pnpm --filter @hutian/agent-bridge run dev"
start "web" cmd /k "pnpm --filter @hutian/web run dev"

echo [4/4] 等待服务就绪后打开浏览器 ...
timeout /t 8 /nobreak >nul
start http://localhost:3000/workbench

echo.
echo 完成。三个窗口保持开启即可使用。
echo   - tenant-api 窗口：  租户元数据 / 自服务接口 (4318)
echo   - agent-bridge 窗口：MCP / LLM 调用日志 (4317)
echo   - web 窗口：         Next.js 开发服务器，workbench + portal 同 app (3000)
echo.
pause

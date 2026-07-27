@echo off
REM 一键启动完整 B1 真链路：siteBase + agent-bridge + web
REM 三个窗口保持开启即可。访问 http://localhost:3000/workbench

cd /d %~dp0

echo [1/4] 启动 siteBase backend (http://localhost:8000) ...
start "siteBase" cmd /k "cd /d %~dp0\siteBase\backend\ElectronicPart && php think run --host 0.0.0.0 --port 8000"

echo [2/4] 等待 siteBase 就绪 ...
timeout /t 5 /nobreak >nul

echo [3/4] 启动 agent-bridge (http://localhost:4317) ...
start "agent-bridge" cmd /k "cd /d %~dp0\hutian-seo-geo-agent && pnpm --filter @hutian/agent-bridge run dev"

echo [4/4] 启动 web (http://localhost:3000) ...
start "web" cmd /k "cd /d %~dp0\hutian-seo-geo-agent && pnpm --filter @hutian/web run dev"

echo [5/4] 等待服务就绪后打开浏览器 ...
timeout /t 8 /nobreak >nul
start http://localhost:3000/workbench

echo.
echo 完成。三个窗口保持开启：
echo   - siteBase 窗口：ThinkPHP 内置服务器
echo   - agent-bridge 窗口：MCP / LLM 调用日志
echo   - web 窗口：Next.js 开发服务器
echo.
pause

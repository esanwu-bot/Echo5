@echo off
REM 启动壶天 SEO/GEO Agent 浏览器端（agent-bridge + web）
REM 双击即可：bridge 监听 4317，web 监听 3000，自动打开工作台

cd /d %~dp0\hutian-seo-geo-agent

echo [1/3] 启动 agent-bridge (port 4317) ...
start "agent-bridge" cmd /k "pnpm --filter @hutian/agent-bridge run dev"

echo [2/3] 启动 web (port 3000) ...
start "web" cmd /k "pnpm --filter @hutian/web run dev"

echo [3/3] 等待服务就绪后打开浏览器 ...
timeout /t 6 /nobreak >nul
start http://localhost:3000/workbench

echo.
echo 完成。两个窗口保持开启即可使用。
echo   - agent-bridge 窗口：MCP / LLM 调用日志
echo   - web 窗口：Next.js 开发服务器
echo.
pause

@echo off
REM 一键启动租户自服务后台：tenant-api (4318) + web (3000)
REM 租户 portal 路由在 apps/web 的 (portal) 组，与 workbench 共享登录态
REM 访问：
REM   - 租户自服务：http://localhost:3000/portal
REM   - 运营后台：  http://localhost:4319/ (另用 start_super_admin.bat)
REM 前置：MySQL hutian 库已初始化，users 表已迁移
REM 停止：关闭两个命令行窗口即可

cd /d %~dp0

echo [1/3] 启动 tenant-api (port 4318) ...
echo     TENANT_ADMIN_TOKEN = dev-admin-token-change-in-prod
echo     TENANT_JWT_KEY     = dev-jwt-key-change-in-prod
start "tenant-api" cmd /k "cd /d %~dp0\hutian-seo-geo-agent\apps\tenant-api && set TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod && set TENANT_JWT_KEY=dev-jwt-key-change-in-prod && go run ."

echo [2/3] 等待 tenant-api 就绪 ...
timeout /t 5 /nobreak >nul

echo [3/3] 启动 web (port 3000) ...
start "web" cmd /k "cd /d %~dp0\hutian-seo-geo-agent && pnpm --filter @hutian/web run dev"

echo.
echo 等待服务就绪后打开浏览器 ...
timeout /t 8 /nobreak >nul
start http://localhost:3000/portal

echo.
echo 完成。两个窗口保持开启：
echo   - tenant-api 窗口：租户元数据 / 自服务接口 (4318)
echo   - web 窗口：        Next.js 开发服务器，workbench + portal 同 app (3000)
echo.
echo 常用入口：
echo   - 租户登录页： http://localhost:3000/portal
echo   - workbench：   http://localhost:3000/workbench
echo   - tenant-api healthz： http://localhost:4318/healthz
echo.
pause

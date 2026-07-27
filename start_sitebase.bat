@echo off
REM 启动 siteBase backend（ThinkPHP 内置服务器，端口 8000）
REM 前置：数据库 hutian_sitebase 已创建并初始化，.env 已配好

cd /d %~dp0\siteBase\backend\ElectronicPart

echo [1/2] 检查 PHP 可用性 ...
php -v >nul 2>&1
if errorlevel 1 (
  echo [错误] 找不到 php 命令。请确认小皮面板或 PHP 已加入 PATH。
  pause
  exit /b 1
)

echo [2/2] 启动 siteBase on http://localhost:8000 ...
echo     数据库：hutian_sitebase ^(按 .env 配置^)
echo     停止：关闭本窗口或按 Ctrl+C
echo.
php think run --host 0.0.0.0 --port 8000

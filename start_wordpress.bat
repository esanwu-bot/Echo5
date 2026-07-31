@echo off
REM 启动 WordPress（PHP 内置服务器，端口 8001）
REM 与 siteBase（8000）同级目录、同 MySQL 实例（hutian_wordpress 数据库）
REM 前置：数据库 hutian_wordpress 已创建，wp-config.php 已配好

cd /d %~dp0\wordpress

echo [1/2] 检查 PHP 可用性 ...
php -v >nul 2>&1
if errorlevel 1 (
  echo [错误] 找不到 php 命令。请确认小皮面板或 PHP 已加入 PATH。
  pause
  exit /b 1
)

echo [2/2] 启动 WordPress on http://localhost:8001 ...
echo     数据库：hutian_wordpress ^(/wp-config.php 配置^)
echo     首次访问：http://localhost:8001/wp-admin/install.php
echo     停止：关闭本窗口或按 Ctrl+C
echo.
php -S 0.0.0.0:8001 -t . router.php

@echo off
chcp 65001 >nul
rem 壶天 · 移动端 workbench 开发预览
rem Capacitor 套壳 + Vite 重打 SPA（与桌面 Wails 同脉，复用 apps/web 组件）
rem 默认 mock 模式（零后端），SSE 模式请设环境变量 VITE_API_BASE=https://your-bff.example.com

cd /d "%~dp0\hutian-seo-geo-agent"

echo [mobile] install deps if needed...
call pnpm install --no-frozen-lockfile
if %errorlevel% neq 0 exit /b %errorlevel%

echo [mobile] dev server on http://localhost:1421
pnpm dev:mobile

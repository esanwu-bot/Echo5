@echo off
chcp 65001 >nul
rem 壶天 · 移动端 workbench Android 构建流程
rem 前提：已安装 Android Studio + JDK + Android SDK

cd /d "%~dp0\hutian-seo-geo-agent"

echo [mobile] build SPA dist...
call pnpm build:mobile
if %errorlevel% neq 0 exit /b %errorlevel%

echo [mobile] sync to android...
call pnpm cap:sync
if %errorlevel% neq 0 exit /b %errorlevel%

echo [mobile] open Android Studio...
cd apps\mobile
npx cap open android

@echo off
echo ========================================
echo Tianqixin Project Stop Script
echo ========================================
echo.

echo [INFO] Stopping all services...
echo.

:: Stop Backend API (Port 8000)
echo [1/3] Stopping Backend API (Port 8000)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Stop Admin Panel (Port 3001)
echo [2/3] Stopping Admin Panel (Port 3001)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Stop Frontend (Port 3000)
echo [3/3] Stopping Frontend (Port 3000)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Close related cmd windows
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq Backend-API-8000*" >nul 2>&1
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq Admin-Panel-3001*" >nul 2>&1
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq Frontend-3000*" >nul 2>&1

echo.
echo ========================================
echo All services stopped!
echo ========================================
echo.
echo Press any key to close this window...
pause >nul

@echo off
echo ========================================
echo Tianqixin Project Start Script
echo ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found, please install Node.js first
    pause
    exit /b 1
)

:: Check PHP
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PHP not found, please install PHP first
    pause
    exit /b 1
)

echo [INFO] Checking MySQL service...
echo.

:: Check if MySQL service is running
sc query MySQL >nul 2>&1
if %errorlevel% equ 0 (
    :: MySQL service exists, check if it's running
    sc query MySQL | findstr "RUNNING" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARNING] MySQL service is not running, attempting to start...
        net start MySQL >nul 2>&1
        if %errorlevel% equ 0 (
            echo [OK] MySQL service started successfully
            timeout /t 3 /nobreak >nul
        ) else (
            echo [ERROR] Failed to start MySQL service
            echo Please start MySQL manually and try again
            pause
            exit /b 1
        )
    ) else (
        echo [OK] MySQL service is running
    )
) else (
    :: Try MySQL80 service name
    sc query MySQL80 >nul 2>&1
    if %errorlevel% equ 0 (
        sc query MySQL80 | findstr "RUNNING" >nul 2>&1
        if %errorlevel% neq 0 (
            echo [WARNING] MySQL80 service is not running, attempting to start...
            net start MySQL80 >nul 2>&1
            if %errorlevel% equ 0 (
                echo [OK] MySQL80 service started successfully
                timeout /t 3 /nobreak >nul
            ) else (
                echo [ERROR] Failed to start MySQL80 service
                echo Please start MySQL manually and try again
                pause
                exit /b 1
            )
        ) else (
            echo [OK] MySQL80 service is running
        )
    ) else (
        echo [WARNING] MySQL service not found
        echo Please make sure MySQL is installed and running
        echo Continuing anyway...
    )
)

echo.
echo [INFO] Checking and cleaning ports...
echo.

:: Check and kill port 8000 if occupied
echo [1/3] Checking Backend API port 8000...
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 8000 is occupied, cleaning...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)

:: Check and kill port 3001 if occupied
echo [2/3] Checking Admin Panel port 3001...
netstat -ano | findstr :3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 3001 is occupied, cleaning...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)

:: Check and kill port 3000 if occupied
echo [3/3] Checking Frontend port 3000...
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 3000 is occupied, cleaning...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)

echo.
echo [INFO] Starting services...
echo.

:: Start Backend API (Port 8000)
echo [1/4] Starting Backend API (http://localhost:8000)
cd /d "%~dp0backend\ElectronicPart"
start "Backend-API-8000" cmd /k "php think run -p 8000"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Queue Listener (Translation Worker)
echo [2/4] Starting Queue Listener (Translation Worker)
cd /d "%~dp0backend\ElectronicPart"
start "Queue-Listener" cmd /k "php think queue:listen"

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start Admin Panel (Port 3001)
echo [3/4] Starting Admin Panel (http://localhost:3001)
cd /d "%~dp0tianqixin-admin"
start "Admin-Panel-3001" cmd /k "npm run dev -- --port 3001 --turbo"

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start Frontend (Port 3000)
echo [4/4] Starting Frontend (http://localhost:3000)
cd /d "%~dp0tianqixin-frontend"
start "Frontend-3000" cmd /k "npm run dev -- --port 3000"

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo MySQL Service:  Running (Port 3306)
echo Backend API:    http://localhost:8000
echo Queue Listener: Running (Translation Worker)
echo Admin Panel:    http://localhost:3001
echo Frontend:       http://localhost:3000
echo ========================================
echo.
echo Press any key to close this window...
pause >nul

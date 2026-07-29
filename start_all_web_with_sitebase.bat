@echo off
REM Launcher stub: all UI text and service window logic live in start_all_web_with_sitebase.ps1 (UTF-8 with BOM) to avoid cmd codepage issues.
REM Double-click this file to start all services.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_all_web_with_sitebase.ps1"
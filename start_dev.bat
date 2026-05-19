@echo off
chcp 65001 >nul
setlocal EnableExtensions

echo.
echo FANTASY REALM: DEV ENVIRONMENT
echo.
echo Ouverture de la fenetre de controle...
echo.

set "PROJECT_PATH=%~dp0"

REM Run the PowerShell script; it stays open and shows the links.
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_PATH%start_dev.ps1"

REM If PowerShell closes, keep the .bat open to show a message.
echo.
echo Fenetre de controle fermee. Les serveurs demarres par elle ont ete arretes.
echo (MySQL/Apache ne sont pas arretes automatiquement.)
echo.
pause
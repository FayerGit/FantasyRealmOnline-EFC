@echo off
REM Script to start the PHP development server
REM Double click to run

chcp 65001 >nul

echo.
echo Lancement du serveur API Fantasy Realm
echo.

setlocal
set PHP_PATH=c:\xampp\php\php.exe

REM Get the script and backend paths
for %%A in ("%~dp0..") do set BACKEND_PATH=%%~fA

echo Chemin du backend: %BACKEND_PATH%
echo.

REM Check that PHP exists
if not exist "%PHP_PATH%" (
    echo ERREUR: PHP n'a pas ete trouve a %PHP_PATH%
    echo Verifie que XAMPP est installe correctement
    pause
    exit /b 1
)

echo PHP trouve: %PHP_PATH%
echo.

REM Check that public/index.php exists
if not exist "%BACKEND_PATH%\public\index.php" (
    echo ERREUR: public/index.php n'a pas ete trouve
    pause
    exit /b 1
)

echo Demarrage du serveur sur http://localhost:8000
echo.
echo Base API: http://localhost:8000/backend
echo.
echo Tapez CTRL+C pour arreter le serveur
echo.

cd /d "%BACKEND_PATH%"
"%PHP_PATH%" -S localhost:8000 dev-router.php

echo.
echo Serveur arrete
pause

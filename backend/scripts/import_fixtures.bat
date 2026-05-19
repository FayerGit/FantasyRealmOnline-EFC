@echo off
REM Script to import fixtures into the database
REM Double click to run

setlocal
chcp 65001 >nul

echo.
echo Importation des fixtures
echo.

REM Get project path
for %%A in ("%~dp0..\..\") do set PROJECT_PATH=%%~fA
set FIXTURES_FILE=%PROJECT_PATH%database\fixtures.sql
set MYSQL_PATH=c:\xampp\mysql\bin\mysql.exe

echo Chemin du projet: %PROJECT_PATH%
echo.

set DB_HOST=127.0.0.1
set DB_USER=root
set DB_NAME=fantasy_realm

REM Check fixtures file
if not exist "%FIXTURES_FILE%" (
    echo [ERREUR] Le fichier %FIXTURES_FILE% n'existe pas
    pause
    exit /b 1
)

REM Check mysql
if not exist "%MYSQL_PATH%" (
    echo [ERREUR] MySQL n'a pas ete trouve a: %MYSQL_PATH%
    echo Assure-toi que XAMPP est installe.
    pause
    exit /b 1
)

echo [INFO] Importation des fixtures dans '%DB_NAME%'...
echo.

REM Import SQL file
"%MYSQL_PATH%" -h %DB_HOST% -u %DB_USER% %DB_NAME% < "%FIXTURES_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo Fixtures importees avec succes.
    echo.
    echo Comptes:
    echo user1@example.com / password123 (player)
    echo user2@example.com / password456 (player)
    echo employee1@example.com / employee789 (employee)
    echo admin1@example.com / admin999 (admin)
    echo.
    echo Frontend: http://localhost:5173
    echo.
) else (
    echo.
    echo [ERREUR] Erreur lors de l'importation
    echo.
    echo Solution: utilise reset_database.bat pour reinitialiser
    echo Double-clic sur: backend\scripts\reset_database.bat
    echo.
)

pause

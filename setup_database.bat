@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "MYSQL_HOST=127.0.0.1"
set "MYSQL_PORT=3307"
set "MYSQL_DB=fantasyrealm"
set "MYSQL_USER=root"
set "MYSQL_PASS="
set "MYSQL_CLIENT=C:\xampp\mysql\bin\mysql.exe"
set "ENV_FILE=%~dp0..\backend\.env"

if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
        set "KEY=%%~A"
        set "VAL=%%~B"
        if not "!KEY!"=="" if not "!KEY:~0,1!"=="#" (
            if /I "!KEY!"=="DB_HOST" set "MYSQL_HOST=!VAL!"
            if /I "!KEY!"=="DB_PORT" set "MYSQL_PORT=!VAL!"
            if /I "!KEY!"=="DB_NAME" set "MYSQL_DB=!VAL!"
            if /I "!KEY!"=="DB_USER" set "MYSQL_USER=!VAL!"
            if /I "!KEY!"=="DB_PASS" set "MYSQL_PASS=!VAL!"
        )
    )
)

set "MYSQL_AUTH=-u %MYSQL_USER%"
if defined MYSQL_PASS set "MYSQL_AUTH=-u %MYSQL_USER% -p%MYSQL_PASS%"

echo ========================================
echo Fantasy Realm - Database Setup
echo ========================================
echo.

REM Wait for the configured MySQL port to become available.
call :WaitForPort %MYSQL_PORT% 20
if errorlevel 1 (
    echo [ERROR] MySQL ne semble pas demarre (port %MYSQL_PORT% non ouvert apres attente).
    netstat -ano | findstr /r /c:":3306 .*LISTENING" >nul
    if not errorlevel 1 (
        echo [INFO] Un MySQL semble deja ecouter sur le port 3306.
        echo [INFO] Ce projet utilise 3307, donc il faut demarrer le MySQL XAMPP configure sur 3307.
    ) else (
        echo [INFO] Aucun MySQL local detecte sur 3306/3307.
    )
    echo Lance MySQL via XAMPP Control Panel puis relance ce script.
    pause
    exit /b 1
)

echo [INFO] MySQL detected on %MYSQL_HOST%:%MYSQL_PORT%
echo [INFO] Using DB=%MYSQL_DB% USER=%MYSQL_USER%
echo.

REM Create database if not exists
echo [STEP 1/3] Creating database...
"%MYSQL_CLIENT%" -h %MYSQL_HOST% -P %MYSQL_PORT% %MYSQL_AUTH% -e "CREATE DATABASE IF NOT EXISTS %MYSQL_DB% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %errorlevel% equ 0 (
    echo [SUCCESS] Database created/verified
) else (
    echo [ERROR] Failed to create database
    pause
    exit /b 1
)

REM Import schema
echo.
echo [STEP 2/3] Importing database schema...
"%MYSQL_CLIENT%" -h %MYSQL_HOST% -P %MYSQL_PORT% %MYSQL_AUTH% %MYSQL_DB% < "%~dp0schema.sql"

if %errorlevel% equ 0 (
    echo [SUCCESS] Schema imported
) else (
    echo [ERROR] Failed to import schema
    pause
    exit /b 1
)

echo.
echo [STEP 2b/3] Ensuring publication columns exist...
"%MYSQL_CLIENT%" -h %MYSQL_HOST% -P %MYSQL_PORT% %MYSQL_AUTH% %MYSQL_DB% -e "ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS published_at DATETIME NULL;"

if %errorlevel% equ 0 (
    echo [SUCCESS] Publication columns verified
) else (
    echo [ERROR] Failed to ensure publication columns
    pause
    exit /b 1
)

REM Optional migration (may not exist in all repos)
echo.
if exist "%~dp0migration_v2_characters.sql" (
    echo [STEP 3/3] Running character customization migration...
    "%MYSQL_CLIENT%" -h %MYSQL_HOST% -P %MYSQL_PORT% %MYSQL_AUTH% %MYSQL_DB% < "%~dp0migration_v2_characters.sql"

    if %errorlevel% equ 0 (
        echo [SUCCESS] Migration completed
    ) else (
        echo [ERROR] Failed to run migration
        pause
        exit /b 1
    )
) else (
    echo [STEP 3/3] Migration skipped (migration_v2_characters.sql not found)
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
echo.
echo Database: %MYSQL_DB%
echo Tables created:
echo - users
echo - characters (with 24 appearance fields)
echo - notifications
echo - comments
echo - logs
echo - and more...
echo.
pause
exit /b 0

:WaitForPort
setlocal
set "TARGET_PORT=%~1"
set "ATTEMPTS=%~2"

for /L %%I in (1,1,%ATTEMPTS%) do (
    netstat -ano | findstr /r /c:":%TARGET_PORT% .*LISTENING" >nul && (
        endlocal & exit /b 0
    )
    timeout /t 1 /nobreak >nul
)

endlocal & exit /b 1
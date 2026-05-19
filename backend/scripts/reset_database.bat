@echo off
REM Script to fully reset the database
REM Double click to run

setlocal
chcp 65001 >nul

echo.
echo Reinitialisation de la base de donnees
echo.

REM Get project path
for %%A in ("%~dp0..\..\") do set PROJECT_PATH=%%~fA
set SCHEMA_FILE=%PROJECT_PATH%database\schema.sql
set FIXTURES_FILE=%PROJECT_PATH%database\fixtures.sql
set MYSQL_PATH=c:\xampp\mysql\bin\mysql.exe

echo Chemin du projet: %PROJECT_PATH%
echo.

set DB_HOST=127.0.0.1
set DB_USER=root
set DB_NAME=fantasy_realm

REM Check required files
if not exist "%SCHEMA_FILE%" (
    echo [ERREUR] Le fichier %SCHEMA_FILE% n'existe pas
    pause
    exit /b 1
)

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

echo ATTENTION: cette action va:
echo 1. Supprimer la base de donnees '%DB_NAME%'
echo 2. La recreer a partir de zero
echo 3. Importer le schema et les fixtures
echo.
echo Toutes les donnees seront perdues.
echo.
set /p confirm="Êtes-vous sûr? (oui/non): "

if /i not "%confirm%"=="oui" (
    echo.
    echo Operation annulee
    echo.
    pause
    exit /b 0
)

echo.
echo Reinitialisation en cours...
echo.

REM Drop database
echo [1/3] Suppression de la base de données '%DB_NAME%'...
"%MYSQL_PATH%" -h %DB_HOST% -u %DB_USER% -e "DROP DATABASE IF EXISTS %DB_NAME%;"
if %errorlevel% neq 0 (
    echo ERREUR: echec lors de la suppression de la base
    pause
    exit /b 1
)

REM Recreate database
echo [2/3] Création de la base de données '%DB_NAME%'...
"%MYSQL_PATH%" -h %DB_HOST% -u %DB_USER% -e "CREATE DATABASE %DB_NAME%;"
if %errorlevel% neq 0 (
    echo ERREUR: echec lors de la creation de la base
    pause
    exit /b 1
)

REM Import schema
echo [3/3] Importation du schéma et des fixtures...
"%MYSQL_PATH%" -h %DB_HOST% -u %DB_USER% %DB_NAME% < "%SCHEMA_FILE%"
if %errorlevel% neq 0 (
    echo ERREUR: echec lors de l'importation du schema
    pause
    exit /b 1
)

"%MYSQL_PATH%" -h %DB_HOST% -u %DB_USER% %DB_NAME% < "%FIXTURES_FILE%"
if %errorlevel% neq 0 (
    echo ERREUR: echec lors de l'importation des fixtures
    pause
    exit /b 1
)

echo.
echo Base de donnees reinitialisee avec succes.
echo.
echo Comptes:
echo user1@example.com / password123 (player)
echo user2@example.com / password456 (player)
echo employee1@example.com / employee789 (employee)
echo admin1@example.com / admin999 (admin)
echo.
echo Frontend: http://localhost:5173
echo.
pause

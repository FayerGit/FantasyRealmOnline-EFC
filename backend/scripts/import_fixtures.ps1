#!/usr/bin/env powershell
# Script to import fixtures into the database
# Usage: .\scripts\import_fixtures.ps1

Write-Host ""
Write-Host "Importation des fixtures" -ForegroundColor Green
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent (Split-Path -Parent $scriptPath)
$fixturesFile = "$projectPath\database\fixtures.sql"
$mysqlPath = "c:\xampp\mysql\bin\mysql.exe"

Write-Host "Chemin du projet: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Configuration
$dbHost = "127.0.0.1"
$dbUser = "root"
$dbName = "fantasy_realm"

# Check fixtures file
if (-not (Test-Path $fixturesFile)) {
    Write-Host "Erreur: Le fichier $fixturesFile n'existe pas" -ForegroundColor Red
    exit 1
}

# Check mysql
if (-not (Test-Path $mysqlPath)) {
    Write-Host "Erreur: MySQL n'a pas été trouvé à: $mysqlPath" -ForegroundColor Red
    Write-Host "Assure-toi que XAMPP est installé." -ForegroundColor Yellow
    exit 1
}

Write-Host "Importation des fixtures dans '$dbName'..." -ForegroundColor Cyan
Write-Host ""

# Import SQL file
try {
    & $mysqlPath -h $dbHost -u $dbUser $dbName -e "SOURCE $fixturesFile"
    Write-Host ""
    Write-Host "Fixtures importées avec succès." -ForegroundColor Green
    Write-Host ""
    Write-Host "Comptes" -ForegroundColor Green
    Write-Host "user1@example.com / password123 (player)" -ForegroundColor Yellow
    Write-Host "user2@example.com / password456 (player)" -ForegroundColor Yellow
    Write-Host "employee1@example.com / employee789 (employee)" -ForegroundColor Yellow
    Write-Host "admin1@example.com / admin999 (admin)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "Erreur lors de l'importation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}


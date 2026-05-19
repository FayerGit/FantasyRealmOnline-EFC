#!/usr/bin/env powershell
# Script to fully reset the database
# Usage: .\scripts\reset_database.ps1

Write-Host ""
Write-Host "Réinitialisation de la base de données" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent (Split-Path -Parent $scriptPath)
$schemaFile = "$projectPath\database\schema.sql"
$fixturesFile = "$projectPath\database\fixtures.sql"
$mysqlPath = "c:\xampp\mysql\bin\mysql.exe"

Write-Host "Chemin du projet: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Configuration
$dbHost = "127.0.0.1"
$dbUser = "root"
$dbName = "fantasy_realm"

# Check required files
if (-not (Test-Path $schemaFile)) {
    Write-Host "Erreur: Le fichier $schemaFile n'existe pas" -ForegroundColor Red
    exit 1
}

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

Write-Host "ATTENTION: cette action va:" -ForegroundColor Yellow
Write-Host "1. Supprimer la base de données '$dbName'" -ForegroundColor Yellow
Write-Host "2. La recréer à partir de zéro" -ForegroundColor Yellow
Write-Host "3. Importer le schéma et les fixtures" -ForegroundColor Yellow
Write-Host ""
Write-Host "Toutes les données seront perdues." -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Êtes-vous sûr? (oui/non)"

if ($confirm -ne "oui") {
    Write-Host ""
    Write-Host "Opération annulée" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "Réinitialisation en cours..." -ForegroundColor Cyan
Write-Host ""

try {
    # Drop database
    Write-Host "[1/3] Suppression de la base de données '$dbName'..." -ForegroundColor Cyan
    & $mysqlPath -h $dbHost -u $dbUser -e "DROP DATABASE IF EXISTS $dbName;" 2>$null
    
    # Recreate database
    Write-Host "[2/3] Création de la base de données '$dbName'..." -ForegroundColor Cyan
    & $mysqlPath -h $dbHost -u $dbUser -e "CREATE DATABASE $dbName;" 2>$null
    
    # Import schema
    Write-Host "[3/3] Importation du schéma et des fixtures..." -ForegroundColor Cyan
    & $mysqlPath -h $dbHost -u $dbUser $dbName -e "SOURCE $schemaFile;" 2>$null
    & $mysqlPath -h $dbHost -u $dbUser $dbName -e "SOURCE $fixturesFile;" 2>$null
    
    Write-Host ""
    Write-Host "Base de données réinitialisée avec succès." -ForegroundColor Green
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
    Write-Host "Erreur lors de la réinitialisation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}


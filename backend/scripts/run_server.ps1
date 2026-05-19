#!/usr/bin/env powershell
# Script to start the PHP development server
# Usage: .\scripts\run_server.ps1

Write-Host ""
Write-Host "Lancement du serveur API Fantasy Realm" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Split-Path -Parent $scriptPath

Write-Host "Chemin du backend: $backendPath" -ForegroundColor Yellow
Write-Host ""

# Check that PHP exists
$phpPath = "c:\xampp\php\php.exe"
if (-not (Test-Path $phpPath)) {
    Write-Host "ERREUR: PHP n'a pas été trouvé à $phpPath" -ForegroundColor Red
    Write-Host "Vérifie que XAMPP est installé correctement" -ForegroundColor Yellow
    exit 1
}

Write-Host "PHP trouvé: $phpPath" -ForegroundColor Green
Write-Host ""

# Check that public/index.php exists
$indexPath = "$backendPath\public\index.php"
if (-not (Test-Path $indexPath)) {
    Write-Host "ERREUR: public/index.php n'a pas été trouvé" -ForegroundColor Red
    exit 1
}

# Start server
Write-Host "Démarrage du serveur sur http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base API: http://localhost:8000/backend" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tapez CTRL+C pour arrêter le serveur" -ForegroundColor Yellow
Write-Host ""

cd $backendPath
& $phpPath -S localhost:8000 dev-router.php

Write-Host ""
Write-Host "Serveur arrêté" -ForegroundColor Gray


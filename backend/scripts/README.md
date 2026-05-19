# Backend scripts

Scripts utilitaires pour lancer le backend en mode dev et gérer les fixtures MySQL.

Scripts
• run_server.bat, run_server.ps1
• import_fixtures.bat, import_fixtures.ps1
• reset_database.bat, reset_database.ps1

Démarrage
1) Lancer le serveur API
• Windows: double clic sur scripts/run_server.bat
• PowerShell: .\scripts\run_server.ps1

URLs
• base API: http://localhost:8000/backend
• frontend dev: http://localhost:5173
• phpMyAdmin: http://localhost/phpmyadmin

Fixtures
2) Importer les fixtures
• Windows: double clic sur scripts/import_fixtures.bat
• PowerShell: .\scripts\import_fixtures.ps1

3) Réinitialiser la base
• Windows: double clic sur scripts/reset_database.bat
• PowerShell: .\scripts\reset_database.ps1

Notes
• import_fixtures importe database/fixtures.sql dans la base fantasy_realm
• reset_database supprime la base, la recrée, puis importe schema.sql et fixtures.sql

Identifiants
• user1@example.com / password123 (player)
• user2@example.com / password456 (player)
• employee1@example.com / employee789 (employee)
• admin1@example.com / admin999 (admin)

Dépannage
• port 8000 déjà pris: arrêter php; Get-Process php | Stop-Process -Force
• Database connection failed: démarrer MySQL dans XAMPP

Hashes
• générer des hashes bcrypt: C:\xampp\php\php.exe backend\scripts\generate_password_hashes.php


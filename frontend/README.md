# Frontend README

## Utilisation de `.env.example`

1) Copier le fichier exemple en local et remplir les valeurs :

PowerShell:

```powershell
Copy-Item .env.example .env
```

cmd:

```cmd
copy .env.example .env
```

2) Modifier `VITE_API_URL` dans `.env` pour pointer vers votre backend (sans slash final).

3) Ne pas committer le fichier `.env` contenant des secrets. Les artefacts locaux et dépendances ont été déplacés vers `../frontend_private/`.

4) Si vous publiez le frontend, garder seulement les fichiers sources et le build public nécessaire.

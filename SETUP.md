# Setup Local

Le plus simple pour démarrer en local est d'utiliser le lanceur menu:

```bat
run-site.bat
```

Choix utiles:
- `1` : démarre le backend et le frontend
- `2` : arrête proprement les deux serveurs
- `3` : redémarre les deux serveurs
- `4` : affiche l'état

Pré-requis:
- XAMPP lancé avec MySQL actif
- `C:\xampp\php\php.exe` disponible
- Node.js installé pour `npm`

Base de données:
```bat
cd database
setup_database.bat
```

Si tu veux lancer à la main:
```bat
cd frontend
npm install
npm run dev

cd ..\backend
C:\xampp\php\php.exe -S localhost:8000
```

Ports attendus en local:
- Frontend: `5173`
- Backend: `8000`
- MySQL XAMPP: `3307`


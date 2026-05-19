
#  Fantasy Realm - Gestionnaire de Personnages

EFC FantasyRealmOnline (Temp total: 210h)

![Status](https://img.shields.io/badge/status-active-success.svg)
![PHP](https://img.shields.io/badge/PHP-8.0+-blue.svg)
![React](https://img.shields.io/badge/React-18.3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)

##  Fonctionnalités principales

- **Créateur de personnages**: Éditeur visuel avec customisation de l'apparence
- **Galerie communautaire**: Explorez et commentez les personnages publiés
- **Système de modération**: Staff pour valider, modérer et gérer les utilisateurs
- **Support tickets**: Canal de communication entre joueurs et staff
- **Authentification JWT**: Secure, avec rôles (player/employee/admin)
- **Gestion des bans**: Suspension temporaire ou permanente avec raison

##  Stack technique

**Frontend**
- React 18.3 + TypeScript (Vite, super rapide)
- Tailwind CSS 4 pour le design
- Radix UI + composants custom

**Backend** 
- PHP 8+
- MySQL pour les données
- MongoDB pour les logs d'activité (obligatoire pour l'audit)
- JWT pour auth sécurisée
- PHPMailer pour les notifications email


##  Démarrage rapide (local)

### Ce qu'il faut
- **Windows + XAMPP** (pour MySQL, obligatoire)
- **Node.js 18+** (pour le frontend)
- **Composer** (pour les dépendances PHP)

### Installation (5 min)

```bash
# 1) Crée la base de données MySQL
cd database
setup_database.bat

# 2) Installe les dépendances backend et frontend
cd ../backend && composer install
cd ../frontend && npm install

# 3) Lance tout avec un clic
cd .. && start_dev.bat
```

**Boom, c'est parti!**
- Frontend: `http://localhost:5173` (c'est l'UI)
- Backend API: `http://127.0.0.1:8000/backend` (si Apache n'est pas lancé)

### Comptes de test
- **Joueur**: `user1@example.com` / `password123`
- **Admin**: `admin1@example.com` / `password123`

### Notes importantes
- MongoDB doit tourner en local (sinon le dev script s'arrête)
- Le frontend pointe automatiquement vers le backend via le script `start_dev.ps1`

##  Déployer sur un serveur

Quel que soit l'hébergement, voilà la stratégie:
- **Frontend** = fichiers statiques (juste du HTML/JS/CSS)
- **Backend** = API PHP qui tourne sous `/backend`

### Build du frontend
```bash
cd frontend
npm ci        # install strict
npm run build # génère frontend/dist/
```

Upload `frontend/dist/` à la racine du domaine (Vercel, Netlify, ou serveur classique).

**Si c'est un sous-dossier** (genre `https://tld.com/myapp/`):
```bash
npm run build -- --base=/myapp/
```

### Config du backend

Déploie le dossier `backend/` et expose-le sous `/backend`.

**Variables d'environnement à setter:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` (MySQL)
- `MONGODB_URI` (MongoDB - obligatoire)
- `APP_DEBUG=0` (désactiver le debug en prod, évidemment)

**Pour Apache:**
- Active `mod_rewrite` 
- Le fichier [backend/.htaccess](backend/.htaccess) fait le reste

**Aucun fichier `.env`** - tout passe par les variables d'environnement du serveur.

Le frontend va automatiquement trouver l'API sur `${domaine}/backend`. Parfait.

## Configuration Gmail/Email

Les notifications par email (password reset, tickets) passent par PHPMailer. Voilà comment le setup:

### Avec Gmail (SMTP)

**1) Préparer le compte Gmail:**
- Activer l'authentification 2-facteurs
- Créer un **mot de passe d'app** (pas le vrai mot de passe):
  - Aller sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
  - Sélectionner "Mail" et "Windows Computer"
  - Google génère un mot de passe spécial (16 caractères)

**2) Variables d'environnement à setter:**

```bash
# Sur le serveur (Apache SetEnv, variables système, ou hosting panel)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votreemail@gmail.com
MAIL_PASSWORD=abc defg hijkl mnop    # Le mot de passe d'app (16 chars)
MAIL_FROM_ADDRESS=votreemail@gmail.com
MAIL_FROM_NAME=Fantasy Realm Support
```

**3) Le backend va faire le reste** - PHPMailer utilise ces variables pour envoyer les emails.

### Localement (dev sans Gmail)

Pour tester sans vrai Gmail:
- Les emails sont juste pas envoyés (c'est safe)
- Ou: utilise [Mailhog](https://github.com/mailhog/MailHog) pour capturer les emails localement

### Autres services

- **SendGrid**: `MAIL_HOST=smtp.sendgrid.net`, `MAIL_PORT=587`, `MAIL_USERNAME=apikey`, `MAIL_PASSWORD=<api-key>`
- **Brevo** (ex-Sendinblue): `MAIL_HOST=smtp-relay.brevo.com`, `MAIL_PORT=587`

##  Scripts utiles

```bash
# Dev
start_dev.bat              # Lance frontend + backend d'un coup
start_dev.ps1              # Même chose en PowerShell

# Mode menu (interactive)
run-site.bat               # Affiche un menu pour démarrer/arrêter

# Backend seulement
backend/scripts/run_server.ps1

# Base de données
backend/scripts/reset_database.ps1      # Remet tout à zéro
backend/scripts/import_fixtures.ps1     # Ajoute les données de test
```

##  Structure du projet

```
backend/
  ├── controllers/        # Logique (Characters, Comments, Tickets, etc.)
  ├── services/           # MongoDB logging, Auth JWT, Utils
  ├── middleware/         # Vérification JWT
  ├── config/             # Database, Email, UI config
  ├── public/             # Point d'entrée API (/backend)
  └── index.php           # Routeur principal

frontend/
  ├── src/app/
  │   ├── components/     # UI (pages, modals, etc.)
  │   ├── services/       # API calls, validation, pixel art
  │   ├── hooks/          # React hooks (auth, etc.)
  │   └── config/         # API routes, i18n
  └── public/             # Assets statiques
```

##  Architecture de sécurité

- **JWT tokens** pour l'auth (stockés en localStorage côté frontend)
- **Rôles**: player, employee, admin avec permissions
- **Mots de passe**: bcrypt + règles CNIL (12+ chars, majuscule, chiffre, spécial)
- **Audit MongoDB**: chaque action utilisateur est loggée (character creation, comment, ban, etc.)
- **Bans/Suspensions**: soft delete avec date d'expiration, les utilisateurs bannis voient un modal

##  Améliorations possibles

- [ ] OAuth2 (Discord, Google login)
- [ ] Caching Redis pour la galerie
- [ ] Upload d'assets custom (images perso au lieu de pixel art)
- [ ] Notifications temps réel (WebSocket)
- [ ] API GraphQL (côté des stats)

##  Licence

AUCUNE, Il s'agit d'un project en vue de mon EFC

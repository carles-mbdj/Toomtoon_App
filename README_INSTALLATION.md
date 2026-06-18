# ToomToon - Guide d'Installation Locale

## Description
ToomToon est une application mobile de lecture de webtoons africains avec un panel d'administration web.

## Architecture
```
/app
├── backend/           # API FastAPI (Python)
│   ├── server.py     # Point d'entrée du serveur
│   └── .env          # Variables d'environnement
├── frontend/          # Application Mobile Expo (React Native)
│   ├── app/          # Écrans (file-based routing)
│   └── src/          # Composants, services, stores
└── admin-panel/       # Panel Admin Web (React/Vite)
    ├── src/          # Code source
    └── dist/         # Build de production
```

## Prérequis
- **Node.js** >= 18.x
- **Python** >= 3.10
- **MongoDB** >= 6.0 (local ou MongoDB Atlas)
- **Expo CLI** (pour le développement mobile)

---

## 1. Cloner le projet

```bash
git clone <votre-repo-url>
cd toomtoon
```

---

## 2. Configuration de la Base de Données

### Option A: MongoDB Local
1. Installez MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Démarrez le service MongoDB:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

### Option B: MongoDB Atlas (Cloud)
1. Créez un compte sur https://www.mongodb.com/atlas
2. Créez un cluster gratuit (M0)
3. Copiez l'URL de connexion

---

## 3. Configuration du Backend

```bash
cd backend
```

### Créer l'environnement virtuel
```bash
python -m venv venv

# Activer (macOS/Linux)
source venv/bin/activate

# Activer (Windows)
.\venv\Scripts\activate
```

### Installer les dépendances
```bash
pip install -r requirements.txt
```

### Configurer les variables d'environnement
Créez ou modifiez le fichier `.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=toomtoon_db
JWT_SECRET=votre_secret_jwt_tres_long_et_securise
ADMIN_EMAIL=admin@toomtoon.com
ADMIN_PASSWORD=admin123
```

### Lancer le serveur backend
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Le backend sera accessible sur: http://localhost:8001

---

## 4. Configuration du Panel Admin

```bash
cd admin-panel
```

### Installer les dépendances
```bash
npm install
```

### Configurer l'URL de l'API
Modifiez `src/api/config.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
```

### Mode Développement
```bash
npm run dev
```
Le panel sera accessible sur: http://localhost:5173

### Build de Production
```bash
npm run build
```
Le build sera dans le dossier `dist/` et sera servi automatiquement par le backend sur `/api/admin/`

---

## 5. Configuration de l'Application Mobile

```bash
cd frontend
```

### Installer les dépendances
```bash
npm install
# ou
yarn install
```

### Configurer l'URL du Backend
Modifiez le fichier `.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

**Note importante:** Si vous testez sur un appareil physique, utilisez l'adresse IP de votre ordinateur au lieu de `localhost`:
```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.XXX:8001
```

### Lancer l'application
```bash
# Mode développement web
npx expo start --web

# Mode développement avec tunnel (pour tester sur mobile)
npx expo start --tunnel

# Mode développement local
npx expo start
```

---

## 6. Initialiser les Données de Démo

Une fois le backend démarré, appelez l'endpoint de seed pour créer les données de démonstration:

```bash
curl -X POST http://localhost:8001/api/seed
```

Cela créera:
- 8 webtoons de démonstration
- 64 épisodes (8 par webtoon)
- 5 articles Toom-Mag
- Un compte administrateur

---

## 7. Accès aux Applications

| Application | URL | Identifiants |
|------------|-----|--------------|
| API Backend | http://localhost:8001/api | - |
| Panel Admin | http://localhost:8001/api/admin | admin@toomtoon.com / admin123 |
| App Mobile (Web) | http://localhost:3000 | Créer un compte utilisateur |

---

## 8. Tester sur Appareil Mobile

### Avec Expo Go
1. Installez l'app "Expo Go" sur votre smartphone
2. Lancez `npx expo start --tunnel` dans le dossier frontend
3. Scannez le QR code avec Expo Go

### Avec un Émulateur
```bash
# iOS (macOS uniquement)
npx expo run:ios

# Android
npx expo run:android
```

---

## Commandes Utiles

### Backend
```bash
# Lancer le serveur
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Vérifier l'état
curl http://localhost:8001/api/health
```

### Admin Panel
```bash
# Développement
npm run dev

# Build production
npm run build

# Preview du build
npm run preview
```

### Frontend Mobile
```bash
# Lancer en mode web
npx expo start --web

# Lancer avec tunnel (mobile)
npx expo start --tunnel

# Nettoyer le cache
npx expo start --clear
```

---

## Structure des Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/health | État de l'API |
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| GET | /api/webtoons | Liste des webtoons |
| GET | /api/webtoons/featured | Webtoons en exclusivité |
| GET | /api/genres | Liste des genres |
| GET | /api/episodes/recent | Épisodes récents |
| GET | /api/articles | Articles Toom-Mag |
| POST | /api/admin/login | Connexion admin |
| GET | /api/admin/stats | Statistiques dashboard |

---

## Dépannage

### Le backend ne démarre pas
- Vérifiez que MongoDB est en cours d'exécution
- Vérifiez l'URL MongoDB dans `.env`

### L'app mobile ne se connecte pas au backend
- Utilisez l'adresse IP de votre machine (pas localhost)
- Vérifiez que le port 8001 n'est pas bloqué par le firewall

### Le panel admin affiche une page blanche
- Reconstruisez le panel: `cd admin-panel && npm run build`
- Redémarrez le backend

---

## Support

Pour toute question ou problème, consultez les logs:
- Backend: Terminal où uvicorn est lancé
- Frontend: Console du navigateur (F12)
- Mobile: Terminal Expo ou Expo Dev Tools

---

**ToomToon © 2025 - Webtoons Africains**

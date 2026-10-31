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

### Build
```bash
npm run build
```
Le build est généré dans `dist/` et servi automatiquement par le backend sur `/api/admin/`.

### ⚠️ Comment se connecter au panel admin (lire avant de se connecter)

**Utilisation normale** : une fois le build fait, le panel admin n'a besoin d'aucun serveur séparé. Démarrez juste le backend (section 3) et ouvrez :

```
http://localhost:8001/api/admin
```

Connectez-vous avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` tels que définis dans `backend/.env`.

**Ne lancez pas `npm run dev` pour vous connecter au panel admin.** Cette commande démarre un serveur Vite séparé sur le port 3001, **sans backend derrière** — toute tentative de connexion échoue avec une erreur, même avec des identifiants corrects, car la requête ne part jamais vers le vrai serveur (port 8001). `npm run dev` ne sert qu'au développement actif du code du panel admin lui-même (rechargement à chaud), et nécessiterait un proxy vers le backend pour fonctionner — non configuré aujourd'hui.

**Si vous modifiez le code du panel admin** (fichiers dans `admin-panel/src/`), il faut relancer `npm run build` avant que le changement soit visible sur `http://localhost:8001/api/admin` — le backend sert le dossier `dist/` déjà construit, pas le code source en direct.

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

L'endpoint de seed est protégé (réservé aux administrateurs) depuis le durcissement de sécurité du backend — un simple `curl` sans authentification renverra une erreur 401/403. Récupérez d'abord un token admin, puis utilisez-le :

```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"VOTRE_ADMIN_EMAIL\",\"password\":\"VOTRE_ADMIN_PASSWORD\"}" \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -X POST http://localhost:8001/api/seed -H "Authorization: Bearer $TOKEN"
```

(remplacez `VOTRE_ADMIN_EMAIL`/`VOTRE_ADMIN_PASSWORD` par les valeurs de `ADMIN_EMAIL`/`ADMIN_PASSWORD` dans `backend/.env`)

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
| Panel Admin | http://localhost:8001/api/admin | `ADMIN_EMAIL` / `ADMIN_PASSWORD` depuis `backend/.env` (jamais `npm run dev` / port 3001, voir section 4) |
| App Mobile (Web) | http://localhost:8081 (`npx expo start --web`) | Créer un compte utilisateur |

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

# Lancer les tests (base MongoDB en mémoire, aucune base réelle requise)
pytest -v
```

### Admin Panel
```bash
# Build (à refaire après chaque modification du code du panel admin)
npm run build
```
Pas de `npm run dev` pour un usage normal — voir l'avertissement de la section 4.

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

### "Erreur de connexion" au panel admin alors que les identifiants sont corrects
- Vérifiez l'URL dans la barre d'adresse : elle doit être `http://localhost:8001/api/admin`, **pas** `http://localhost:3001/...`.
- Le port 3001 est celui de `npm run dev` (Vite) — il n'a pas de backend derrière, donc toute connexion y échoue quels que soient les identifiants. Fermez ce serveur s'il tourne et utilisez le port 8001.

---

## Support

Pour toute question ou problème, consultez les logs:
- Backend: Terminal où uvicorn est lancé
- Frontend: Console du navigateur (F12)
- Mobile: Terminal Expo ou Expo Dev Tools

---

**ToomToon © 2025 - Webtoons Africains**

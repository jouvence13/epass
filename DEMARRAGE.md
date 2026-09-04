# 🚀 Guide de Démarrage Complet (Frontend + Backend) — UAC-BusPass

Bienvenue sur le projet **UAC-BusPass**, le système complet de billetterie numérique, de gestion de flotte et de suivi géospatial pour l'Université d'Abomey-Calavi (UAC).

---

## 🏗️ Architecture Globale du Projet

```text
epass/
├── backend/                       # API REST FastAPI, PostGIS, Redis, Celery & WebSockets
│   ├── app/                       # Modèles, Schémas, Services métier, Endpoints
│   ├── docker/                    # Dockerfile & Docker Compose Dev / Prod
│   ├── seed.py                    # Seeder autonome avec tous les comptes de test
│   └── GUIDE_LANCEMENT_ET_TESTS.md # Guide technique détaillé de l'API
│
├── frontend/                      # Application Mobile & Web Expo / React Native
│   ├── src/                       # Écrans (Étudiant, Chauffeur, Contrôleur, Admin)
│   ├── package.json               # Dépendances React Native / Expo
│   └── Dockerfile                 # Conteneur pour Expo Web
│
├── docker-compose.yml             # Orchestration Fullstack (Frontend + Backend + BDD + Redis + Celery)
└── DEMARRAGE.md                   # Ce guide de démarrage rapide
```

---

## 👥 Comptes de Test Pré-configurés (Seeders)

Tous ces comptes sont déjà initialisés dans la base de données de test :

| Rôle | Numéro de Téléphone | Mot de Passe | Profil & Données Associées |
| :--- | :--- | :--- | :--- |
| **SUPERADMIN** | `+22990000000` | `SuperAdmin1234` | Super Administrateur (Accès total) |
| **ADMIN_CROUS** | `+22997000000` | `Admin1234` | Directeur CROUS (Flotte, KYC, Audit financier) |
| **DRIVER** | `+22997000001` | `Driver1234` | Chauffeur CROUS (Bus `#402`, Manifeste passagers) |
| **CONTROLLER** | `+22997000002` | `Controller1234` | Contrôleur CROUS (Validation à bord) |
| **STUDENT (1)** | `+22997001122` | `Student1234` | **Koffi Alain** : Ticket Actif `A7B9-X2M4` (Route 4) |
| **STUDENT (2)** | `+22995443322` | `Student1234` | **Sena Dossou** : Ticket Validé `B8C2-D9E1` |
| **STUDENT (3)** | `+22961229988` | `Student1234` | **Aminata Sylla** : Compte KYC Approuvé |
| **STUDENT (4)** | `+22966123456` | `Student1234` | **Marius Adjovi** : Compte KYC En attente |

---

## ⚡ Méthode 1 : Démarrage Global avec Docker (1 seule commande)

Cette méthode démarre automatiquement **l'ensemble des briques logicielles** :
- Base de Données **PostgreSQL 16 + PostGIS 3.4**
- Cache & PubSub **Redis 7**
- **Backend FastAPI & WebSockets** (Port `8001`)
- **Tâches d'arrière-plan Celery Worker & Beat**
- **Seeder automatique** (Génération des utilisateurs, arrêts, bus, tickets)
- **Frontend Expo Web** (Port `8081`)

### Commande :
Depuis la racine du projet `epass/` :

```bash
# 1. Démarrer tous les services en arrière-plan
docker compose up --build -d

# 2. Suivre les logs de l'API et du Frontend
docker compose logs -f api frontend
```

### Accès direct aux applications :
- 📱 **Frontend Web & Mobile** : [http://localhost:8081](http://localhost:8081)
- 🌐 **Documentation Swagger Backend** : [http://localhost:8001/docs](http://localhost:8001/docs)
- 🩺 **Vérification de santé API** : [http://localhost:8001/health](http://localhost:8001/health)

### Arrêt des services :
```bash
docker compose down
```

---

## 🛠️ Méthode 2 : Démarrage Manuel (Développement Pas-à-Pas)

Si vous souhaitez lancer le Backend et le Frontend dans des terminaux séparés :

### Étape A : Lancement du Backend

Dans un premier terminal :
```bash
cd backend

# 1. Activer l'environnement virtuel Python
python3 -m venv venv
source venv/bin/activate   # Sur Linux/macOS (ou .\venv\Scripts\activate sur Windows)

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Initialiser la base de données et les seeders
python seed.py

# 4. Lancer le serveur FastAPI avec rechargement à chaud
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> L'API backend est accessible sur [http://localhost:8000](http://localhost:8000).

---

### Étape B : Lancement du Frontend (Expo / React Native)

Dans un second terminal :
```bash
cd frontend

# 1. Installer les dépendances Node.js
npm install --legacy-peer-deps

# 2. Lancer Expo en mode Web (ou Mobile)
npm run web
# ou pour le menu Expo complet : npx expo start
```

> Le frontend s'ouvre dans votre navigateur sur [http://localhost:8081](http://localhost:8081).
> Vous pouvez aussi flasher le QR Code affiché dans le terminal avec l'application **Expo Go** sur votre smartphone (Android ou iPhone) !

---

## 📱 Comment tester les différents écrans

### 1. Sélection du Rôle (Écran d'accueil)
À l'ouverture du Frontend, vous pouvez choisir votre profil :
- **Espace Étudiant (Student)** :
  - **Active Ticket** : Affiche le billet actif de Koffi Alain avec son QR Code dynamique, le code SMS `A7B9-X2M4`, la bannière de retard et l'estimation de temps (ETA).
  - **Book Ticket** : Visualisez les créneaux disponibles (`07:30 - Ligne A`, `32/50 places`) et réservez via MTN / Moov Mobile Money.
  - **KYC Onboarding** : Formulaire de dépôt de la carte étudiant et de la pièce d'identité (CIP).
- **Espace Chauffeur (Driver Hub)** :
  - **Driver Hub** : Vue du bus `#402`, jauge de remplissage passagers en direct.
  - **Passenger Lookup** : Liste des passagers réservés (Koffi Alain, Sena Dossou) avec filtrage (Tous / En attente / Validés).
  - **Scan Boarding Pass** : Validation d'un titre de transport par QR Code ou saisie du code SMS `A7B9-X2M4`.
  - **Report Delay** : Signalement d'un retard (+15 min, bouchons carrefour) diffusé en temps réel aux passagers.

---

## 🧪 Comment tester l'API Backend avec Swagger UI

1. Ouvrez [http://localhost:8001/docs](http://localhost:8001/docs) (ou `http://localhost:8000/docs` en mode local).
2. Rendez-vous sur `POST /api/v1/auth/login`.
3. Cliquez sur **Try it out** et entrez par exemple :
   ```json
   {
     "phone_number": "+22997001122",
     "password": "Student1234"
   }
   ```
4. Cliquez sur **Execute**. Copiez la valeur de `access_token`.
5. Remontez tout en haut de la page Swagger et cliquez sur le bouton vert **Authorize**.
6. Collez votre jeton et validez : vous pouvez désormais exécuter n'importe quel endpoint protégé selon votre rôle !

---

## 🏭 Lancement en Production (Docker Prod)

Pour déployer la version de production (Gunicorn multi-workers, sécurité renforcée, sans rechargement de code) :

```bash
docker compose -f backend/docker/docker-compose.prod.yml up --build -d
```

---

## ❓ FAQ & Dépannage

- **Le port 8000 ou 8081 est déjà utilisé** : Vérifiez si un autre serveur tourne déjà (`lsof -i :8000`) et libérez-le.
- **Réinitialiser complètement la base de données** :
  - Avec Docker : `docker compose down -v && docker compose up --build -d`
  - En local : `python backend/seed.py`
- **Connexion depuis un smartphone physique** : Assurez-vous que votre smartphone et votre PC sont sur le même réseau Wi-Fi, et configurez l'IP de votre PC dans `frontend/src/config/api.ts`.

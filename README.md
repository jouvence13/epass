# 🚌 UAC-BusPass - Backend API & WebSockets

Plateforme SaaS de billetterie numérique, gestion de flotte de bus et suivi géospatial temps réel pour l'**Université d'Abomey-Calavi (UAC)**.

---

## 🛠️ Stack Technologique Backend

- **Langage & Framework** : Python 3.11+, [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/) (Asyncio)
- **Base de Données & Moteur SIG** : PostgreSQL 16 + [PostGIS](https://postgis.net/) 3.4
- **ORM & Migrations** : SQLAlchemy 2.0 (Async) + GeoAlchemy2 + Alembic
- **Cache & Message Broker** : Redis 7 (Pub/Sub WebSockets & Sessions)
- **Gestionnaire de Tâches Distribuées** : Celery + Celery Beat (Planification Crons J-3..J+7 & KYC 90j)
- **Passerelles de Paiement Mobile Money** : FedaPay & KkiaPay (MTN MoMo, Moov Money Bénin)
- **Sécurité & Chiffrement** : Bcrypt, JWT (Access/Refresh), Chiffrement AES-256 (QR Codes anti-fraude)
- **Conteneurisation** : Docker & Docker-Compose Multi-Services

---

## 📂 Structure du Répertoire

```text
epass/
├── ARCHITECTURE.md                  # Documentation technique & spécifications
├── README.md                        # Documentation d'accueil et d'exécution
├── backend/                         # Code source & configuration Backend
│   ├── ARCHITECTURE.md / configs
│   ├── requirements.txt             # Dépendances Python (FastAPI, SQLAlchemy, PostGIS, Celery, Redis...)
│   ├── .env.example & .env          # Configuration des variables d'environnement
│   ├── main.py                      # Point d'entrée FastAPI avec CORS & WebSockets
│   ├── docker/
│   │   ├── Dockerfile               # Image Python 3.11 avec support GDAL/PostGIS
│   │   └── docker-compose.yml       # Multi-conteneurs (API, Postgres 16/PostGIS, Redis 7, Celery Worker & Beat)
│   ├── alembic/                     # Migrations de base de données
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── core/                    # Noyau (Config, Sécurité JWT/AES, DB Async, Redis)
│   │   ├── models/                  # Modèles relationnels & spatiaux SQLAlchemy 2.0
│   │   ├── schemas/                 # Schémas DTO Pydantic v2
│   │   ├── services/                # Logique métier pure (Auth, KYC, Booking, ETA, Recycling...)
│   │   ├── api/                     # REST Endpoints & WebSockets
│   │   └── tasks/                   # Tâches asynchrones Celery & Crons Beat
│   └── tests/                       # Tests unitaires & de conformité
```

---

## 📖 Guides & Documentation
- 📘 **Guide de Lancement & Tests Rapides** : [backend/GUIDE_LANCEMENT_ET_TESTS.md](file:///mnt/3CCAC8AFCAC866AC/Projet%20global/Repository/epass/backend/GUIDE_LANCEMENT_ET_TESTS.md) *(Instructions pas-à-pas, comptes de test pré-configurés et requêtes cURL)*
- 📐 **Architecture & Modèle Relationnel** : [ARCHITECTURE.md](file:///mnt/3CCAC8AFCAC866AC/Projet%20global/Repository/epass/ARCHITECTURE.md)
- 🐍 **Livre d'Apprentissage Python** : `backend/GUIDE_APPRENTISSAGE_PYTHON.md`

---

## 👥 Comptes de Test Pré-configurés (Seeders)

| Rôle | Téléphone | Mot de Passe | Nom / Statut |
| :--- | :--- | :--- | :--- |
| **SUPERADMIN** | `+22990000000` | `SuperAdmin1234` | Super Admin |
| **ADMIN_CROUS** | `+22997000000` | `Admin1234` | Directeur CROUS |
| **DRIVER** | `+22997000001` | `Driver1234` | Chauffeur CROUS |
| **CONTROLLER** | `+22997000002` | `Controller1234` | Contrôleur CROUS |
| **STUDENT (1)** | `+22997001122` | `Student1234` | Koffi Alain (Ticket Actif `A7B9-X2M4`) |
| **STUDENT (2)** | `+22995443322` | `Student1234` | Sena Dossou (Ticket Validé `B8C2-D9E1`) |

---

## 🚀 Démarrage Rapide du Backend

### Option A : Démarrage avec Docker Compose (Recommandé)

```bash
# 1. Démarrer tous les conteneurs (API, PostGIS, Redis, Celery, Auto-seeder)
docker compose up --build -d

# 2. Consulter les logs de l'API
docker compose logs -f api
```

Les services suivants seront automatiquement démarrés :
- 🌐 **API FastAPI + WebSockets** : [http://localhost:8000](http://localhost:8000)
- 📖 **Documentation Interactive Swagger UI** : [http://localhost:8000/docs](http://localhost:8000/docs)
- 📑 **ReDoc** : [http://localhost:8000/redoc](http://localhost:8000/redoc)
- 🗄️ **PostgreSQL 16 + PostGIS** : `localhost:5432`
- ⚡ **Redis 7** : `localhost:6379`
- ⚙️ **Celery Worker & Celery Beat** : Tâches asynchrones et crons en cours d'exécution

---

### Option B : Démarrage Local (Sans Docker)

```bash
cd backend

# 1. Créer et activer un environnement virtuel
python3 -m venv venv
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer les variables d'environnement
cp .env.example .env

# 4. Lancer le serveur de développement avec rechargement à chaud
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📡 Contrats d'Intégration Frontend (Pour le Binôme Frontend)

Consultez le fichier [`ARCHITECTURE.md`](file:///mnt/3CCAC8AFCAC866AC/Projet%20global/Repository/epass/ARCHITECTURE.md) pour les contrats JSON détaillés, les modèles de données relationnels et les spécifications complètes.

### Résumé des Endpoints Clés :

#### 1. Authentification & KYC
- `POST /api/v1/auth/register` : Inscription étudiant / chauffeur / admin
- `POST /api/v1/auth/login` : Connexion (retourne JWT access + refresh token)
- `POST /api/v1/auth/refresh` : Rafraîchir le jeton expiré
- `GET /api/v1/auth/me` : Profil utilisateur connecté
- `POST /api/v1/kyc/upload` : Téléversement Carte Étudiant UAC + CIP/CNI
- `GET /api/v1/kyc/pending` *(Admin)* : Liste des demandes KYC en attente
- `PUT /api/v1/kyc/verify` *(Admin)* : Validation ou rejet avec renouvellement 90 jours

#### 2. Trajets & Réservation
- `GET /api/v1/trips/available` : Liste des trajets disponibles avec sièges restants
- `POST /api/v1/trips/{trip_id}/book` : Initialisation réservation avec verrouillage anti-surréservation
- `POST /api/v1/webhooks/fedapay` & `POST /api/v1/webhooks/kkiapay` : Webhooks de paiement

#### 3. Opérations Chauffeur & Recyclage
- `POST /api/v1/driver/validate-ticket` : Validation du ticket (Scan QR Code AES ou code SMS)
- `GET /api/v1/driver/active-trip` : Trajet actuellement assigné au chauffeur
- `POST /api/v1/recycle/execute` : Recyclage du pass vers un nouveau trajet (Délai strict J+7, max 1 fois)

#### 4. WebSockets Temps Réel
- `WS /ws/driver/track/{trip_id}` : Flux d'ingestion GPS Chauffeur (toutes les 10s)
- `WS /ws/student/track/{trip_id}` : Diffusion télémétrie + ETA dynamique aux étudiants

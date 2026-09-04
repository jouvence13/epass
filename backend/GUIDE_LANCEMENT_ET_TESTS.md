# 🚀 Guide Complet de Lancement, Déploiement et Tests (UAC-BusPass)

Bienvenue dans le guide de démarrage et de test du backend **UAC-BusPass** (Plateforme de billetterie numérique et de gestion de flotte pour le campus universitaire).

---

## 📑 Sommaire
1. [Comptes de Test Pré-configurés (Seeders & Rôles)](#-1-comptes-de-test-pré-configurés-seeders)
2. [Méthode 1 : Lancement avec Docker (Recommandé)](#-2-méthode-1--lancement-avec-docker-recommandé)
3. [Méthode 2 : Lancement Local (Sans Docker)](#-3-méthode-2--lancement-local-sans-docker)
4. [Déploiement en Production (Docker Prod)](#-4-déploiement-en-production-docker-prod)
5. [Guide des Scénarios de Test Pas-à-Pas](#-5-scénarios-de-test-pas-à-pas)
6. [Matrice de Sécurité & Droits d'Accès (RBAC)](#-6-matrice-de-sécurité-rbac)
7. [Dépannage et Résolution de Problèmes](#-7-dépannage-et-faq)

---

## 👥 1. Comptes de Test Pré-configurés (Seeders)

Le script de seeding initialise automatiquement tous les profils utilisateurs, arrêts géographiques, lignes de bus et tickets nécessaires aux tests :

| Rôle | Numéro de Téléphone | Mot de Passe | Nom / Matricule | Données Associées |
| :--- | :--- | :--- | :--- | :--- |
| **SUPERADMIN** | `+22990000000` | `SuperAdmin1234` | Super Admin (`SUP-2024-001`) | Accès complet sans restriction |
| **ADMIN_CROUS** | `+22997000000` | `Admin1234` | Directeur CROUS (`ADM-2024-001`) | Gestion flotte, KYC, audit financier |
| **DRIVER** | `+22997000001` | `Driver1234` | Chauffeur CROUS (`DRV-2024-001`) | Bus `#402`, Manifeste passagers, validation |
| **CONTROLLER** | `+22997000002` | `Controller1234` | Contrôleur CROUS (`CTR-2024-001`) | Validation QR / SMS à bord |
| **STUDENT (1)** | `+22997001122` | `Student1234` | Koffi Alain (`UAC-2022-8492`) | **Ticket Actif** : `A7B9-X2M4` (Route 4) |
| **STUDENT (2)** | `+22995443322` | `Student1234` | Sena Dossou (`UAC-2021-3310`) | **Ticket Validé** : `B8C2-D9E1` |
| **STUDENT (3)** | `+22961229988` | `Student1234` | Aminata Sylla (`UAC-2023-1102`) | Compte étudiant KYC Approuvé |
| **STUDENT (4)** | `+22966123456` | `Student1234` | Marius Adjovi (`UAC-2020-5521`) | Compte étudiant KYC En attente |

---

## 🐳 2. Méthode 1 : Lancement avec Docker (Recommandé)

Docker démarre l'ensemble de l'infrastructure en **une seule commande** :
- **PostgreSQL 16 + PostGIS 3.4** (Port `5432`)
- **Redis 7** (Port `6379`)
- **API FastAPI & WebSockets** (Port `8000` avec rechargement à chaud)
- **Celery Worker** (Traitement des SMS et alertes)
- **Celery Beat** (Planificateur du recyclage J+7 et KYC 90j)
- **Auto-Seeder** (Insertion automatique des données de test)

### Lancement en mode Développement :
Depuis la racine du projet ou depuis le dossier `backend` :

```bash
# 1. Démarrer tous les services en arrière-plan
docker compose up --build -d

# 2. Vérifier les logs du backend et du seeder
docker compose logs -f api

# 3. Vérifier l'état de santé de l'API
curl http://localhost:8000/health
```

### URLs d'accès immédiat :
- **Documentation interactive Swagger UI** : [http://localhost:8000/docs](http://localhost:8000/docs)
- **Documentation ReDoc** : [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Point de contrôle de santé** : [http://localhost:8000/health](http://localhost:8000/health)

### Arrêt des conteneurs :
```bash
docker compose down
```

---

## 💻 3. Méthode 2 : Lancement Local (Sans Docker)

Si vous disposez déjà de PostgreSQL (avec PostGIS) et de Redis installés sur votre machine :

### 1. Préparer l'environnement Python
```bash
cd backend

# Créer l'environnement virtuel
python3 -m venv venv

# Activer l'environnement virtuel
source venv/bin/activate  # Sur Linux/macOS
# ou: .\venv\Scripts\activate  # Sur Windows

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Configurer le fichier `.env`
Assurez-vous que les variables dans `backend/.env` correspondent à vos identifiants PostgreSQL et Redis locaux :
```ini
DATABASE_URL="postgresql+asyncpg://uac_buspass_user:uac_buspass_password@localhost:5432/uac_buspass_db"
SYNC_DATABASE_URL="postgresql://uac_buspass_user:uac_buspass_password@localhost:5432/uac_buspass_db"
REDIS_URL="redis://localhost:6379/0"
```

### 3. Exécuter le Seeder de Base de Données
```bash
python seed.py
```

### 4. Démarrer le Serveur FastAPI
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. (Optionnel) Démarrer les Workers Celery (dans d'autres terminaux)
```bash
# Terminal 2 - Worker Celery
celery -A app.tasks.celery_app.celery_app worker --loglevel=info

# Terminal 3 - Celery Beat
celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

---

## 🏭 4. Déploiement en Production (Docker Prod)

La configuration de production est optimisée pour la haute disponibilité, les performances et la sécurité :
- Serveur multi-processus **Gunicorn** avec workers asynchrones **Uvicorn** (`4 workers`).
- Désactivation du rechargement de code et du mode debug (`DEBUG=False`, `APP_ENV=production`).
- Volumes nommés persistants et redémarrage automatique (`restart: unless-stopped`).

### Commande de lancement en production :
```bash
docker compose -f backend/docker/docker-compose.prod.yml up --build -d
```

---

## 🧪 5. Scénarios de Test Pas-à-Pas

### Test 1 : Authentification & Obtention du Token JWT

#### Requête (Connexion Étudiant Koffi Alain) :
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "phone_number": "+22997001122",
       "password": "Student1234"
     }'
```
#### Réponse attendue :
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user_id": "...",
  "role": "STUDENT",
  "kyc_status": "APPROVED"
}
```

> 💡 **Astuce** : Copiez la valeur de `access_token` pour l'utiliser dans l'en-tête `Authorization: Bearer <TOKEN>` ou cliquez sur le bouton **Authorize** vert dans Swagger UI (`http://localhost:8000/docs`).

---

### Test 2 : Écran du Ticket Actif & GPS (Aligné Frontend Mobile)

#### Requête (avec le Token de Koffi Alain) :
```bash
curl -X GET "http://localhost:8000/api/v1/trips/student/active-ticket" \
     -H "Authorization: Bearer <STUDENT_TOKEN>"
```
#### Réponse attendue :
```json
{
  "ticket_id": "...",
  "route_name": "Campus Express Route 4",
  "student_name": "Koffi Alain",
  "student_id": "Student ID: UAC-2022-8492",
  "matricule_uac": "UAC-2022-8492",
  "qr_code_token": "CROUS-UAC-TICKET-A7B9X2M4",
  "code": "A7B9-X2M4",
  "status": "Valid Ticket",
  "available_for_days": 6,
  "avail_for_label": "Available for 6 more days",
  "has_delay": true,
  "delay_minutes": 15,
  "delay_title": "Delay: +15 min",
  "delay_reason": "Due to heavy traffic near the central campus roundabout.",
  "bus_code": "BUS-UAC-01",
  "capacity_percentage": 36,
  "eta_minutes": 8,
  "eta_label": "8 min",
  "latitude": 6.4474,
  "longitude": 2.3557,
  "speed_kmh": 38.5
}
```

---

### Test 3 : Hub Chauffeur & Manifeste Passagers (DriverHubScreen)

#### 1. Consultation du trajet actif du chauffeur (Token Chauffeur `+22997000001` / `Driver1234`) :
```bash
curl -X GET "http://localhost:8000/api/v1/driver/active-trip" \
     -H "Authorization: Bearer <DRIVER_TOKEN>"
```

#### 2. Consultation de la liste d'embarquement (PassengerLookupScreen) :
```bash
curl -X GET "http://localhost:8000/api/v1/driver/passengers" \
     -H "Authorization: Bearer <DRIVER_TOKEN>"
```

#### Réponse :
```json
{
  "trip_id": "...",
  "trip_title": "Trip #... - Campus Express Route 4",
  "counts": {
    "all": 2,
    "pending": 1,
    "checked": 1
  },
  "passengers": [
    {
      "id": "...",
      "name": "Koffi Alain",
      "matricule": "UAC-2022-8492",
      "phone": "+22997001122",
      "stop": "Portail Principal",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "...",
      "name": "Sena Dossou",
      "matricule": "UAC-2021-3310",
      "phone": "+22995443322",
      "stop": "Portail Principal",
      "status": "checked",
      "checkedAt": "09:00 AM"
    }
  ]
}
```

---

### Test 4 : Validation d'un Passager à Bord (ScanBoardingPassScreen)

#### Validation par scan QR ou saisie du Code SMS `A7B9-X2M4` :
```bash
curl -X POST "http://localhost:8000/api/v1/driver/validate-ticket" \
     -H "Authorization: Bearer <DRIVER_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "sms_backup_code": "A7B9X2M4",
       "scan_mode": "manual"
     }'
```
#### Réponse :
```json
{
  "validation_status": "ACCESS_GRANTED",
  "message": "Ticket validé avec succès. Accès autorisé à bord.",
  "student_name": "Koffi Alain",
  "matricule_uac": "UAC-2022-8492",
  "ticket_id": "...",
  "line_name": "Campus Express Route 4",
  "validated_time": "09:05 AM"
}
```

---

### Test 5 : Signalement de Retard par le Chauffeur (ReportDelayScreen)

```bash
curl -X POST "http://localhost:8000/api/v1/driver/report-delay" \
     -H "Authorization: Bearer <DRIVER_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
       "delay_minutes": 20,
       "incident_type": "traffic",
       "custom_message": "Embouteillage majeur au carrefour IITA."
     }'
```

---

### Test 6 : Audit Financier & Gestion de Flotte (Admin CROUS)

#### Requête (Token Admin `+22997000000` / `Admin1234`) :
```bash
curl -X GET "http://localhost:8000/api/v1/admin/audit-fin" \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
```
#### Réponse :
```json
{
  "total_revenue_xof": 500.0,
  "total_tickets_issued": 2,
  "total_tickets_validated": 2,
  "total_tickets_recycled": 0,
  "currency": "XOF (FCFA)"
}
```

---

## 🔒 6. Matrice de Sécurité (RBAC)

Le système applique un contrôle d'accès strict basé sur les rôles :

| Endpoint | Méthode | STUDENT | DRIVER | CONTROLLER | ADMIN_CROUS | SUPERADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/v1/auth/login` | POST | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/v1/trips/available` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/v1/trips/student/active-ticket` | GET | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/api/v1/trips/{id}/book` | POST | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/api/v1/recycle/execute` | POST | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/api/v1/driver/active-trip` | GET | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/api/v1/driver/passengers` | GET | ❌ | ✅ | ✅ | ❌ | ✅ |
| `/api/v1/driver/validate-ticket` | POST | ❌ | ✅ | ✅ | ❌ | ✅ |
| `/api/v1/driver/report-delay` | POST | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/api/v1/kyc/pending` | GET | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/api/v1/kyc/verify` | PUT | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/api/v1/admin/fleet` | GET | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/api/v1/admin/audit-fin` | GET | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🛠️ 7. Dépannage et FAQ

### 1. Erreur `401 Unauthorized`
- Vérifiez que vous avez bien inclus l'en-tête `Authorization: Bearer <votre_token_jwt>`.
- Les tokens expirent au bout de 24h (renouvelable via `/api/v1/auth/refresh`).

### 2. Erreur `403 Forbidden`
- Vous tentez d'accéder à une route réservée à un autre rôle (ex: un étudiant appelant une route `/driver/` ou `/admin/`). Connectez-vous avec le compte du rôle approprié.

### 3. Erreur de connexion à la base de données
- Avec Docker : vérifiez l'état des conteneurs avec `docker compose ps`.
- En local : vérifiez que PostgreSQL est démarré et que l'extension PostGIS est activée (`CREATE EXTENSION IF NOT EXISTS postgis;`).

### 4. Réinitialiser la base de données de test
Pour repartir d'une base neuve :
```bash
# Avec Docker
docker compose down -v
docker compose up --build -d

# En local
python seed.py
```

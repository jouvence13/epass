# Architecture Technique & Spécifications - UAC-BusPass

Plateforme de billetterie numérique et de gestion de flotte de bus universitaires pour l'Université d'Abomey-Calavi (UAC).

---

## 1. STACK TECHNOLOGIQUE DÉTAILLÉE PAR COUCHE

| Couche | Technologie Retenue | Justification Technique |
| :--- | :--- | :--- |
| **Backend API & WebSockets** | **Python (FastAPI + Uvicorn)** | Traitement asynchrone natif (`asyncio`), haute performance, validation stricte via Pydantic v2, gestion native des WebSockets pour le tracking GPS. |
| **Moteur Spatial & BDD** | **PostgreSQL 16 + PostGIS 3.4** | Stockage relationnel ACID, types géométriques (`GEOMETRY(Point, 4326)`), calculs d'itinéraires et distances sphériques en temps réel via fonctions spatiales. |
| **Cache & Message Broker** | **Redis 7** | Broker de messages pour les workers, cache de session et publication/abonnement (Pub/Sub) pour la diffusion des positions GPS. |
| **Gestionnaire de Tâches (Cron)** | **Celery + Celery Beat** | Exécution distribuée de la cascade d'alertes de recyclage (J-3, J-2, J-1, H-1, J+7) et du contrôle KYC trimestriel (90 jours). |
| **ORM & Migrations** | **SQLAlchemy 2.0 (Async) + GeoAlchemy2 + Alembic** | Requêtage asynchrone sécurisé, gestion des entités géospatiales et versioning de schéma. |
| **Frontend Admin (Web)** | **Vue.js 3 (Composition API) + Pinia + TailwindCSS** | Réactivité fine, modularité, cartographie interactive avec **Leaflet.js** ou **MapLibre GL**. |
| **Frontend Mobile (Étudiant & Chauffeur)** | **React Native (Expo bare workflow / RN CLI)** | Cross-platform (iOS/Android), accès aux modules natifs (Caméra pour scan QR Code, Background Geolocation, Stockage sécurisé hors-ligne). |
| **Passerelles Paiement** | **API FedaPay / KkiaPay SDK** | Intégration directe des flux Mobile Money locaux (MTN MoMo & Moov Money Bénin). |
| **Notifications Push / SMS** | **Firebase Cloud Messaging (FCM) + Passerelle SMS locale (Twilio ou Infobip)** | Alertes push temps réel et SMS de secours pour les codes de pass dual-format. |

---

## 2. STRUCTURE COMPLÈTE DU PROJET BACKEND (PYTHON)

```text
UAC_BUSPASS_BACKEND/
│
├── alembic/                             # Gestion des migrations de base de données
│   ├── versions/                        # Fichiers de migration séquentiels
│   └── env.py
│
├── app/
│   ├── core/                            # Noyau de l'application
│   │   ├── config.py                    # Variables d'environnement & paramètres globaux
│   │   ├── security.py                  # Hachage (Bcrypt), JWT, chiffrement QR Code (AES-256)
│   │   ├── database.py                  # Session SQLAlchemy Async & connexion PostGIS
│   │   └── redis.py                     # Client Redis & Pool de connexions
│   │
│   ├── models/                          # Modèles SQLAlchemy (Définition BDD)
│   │   ├── base.py                      # Classe de base déclarative & mixins (Timestamp)
│   │   ├── user_model.py                # Utilisateurs, Rôles, Données KYC
│   │   ├── fleet_model.py               # Bus, Lignes, Arrêts géographiques
│   │   ├── trip_model.py                # Trajets, Horaires, Disponibilité des sièges
│   │   ├── ticket_model.py              # Tickets, Pass, Historique de recyclage
│   │   ├── payment_model.py             # Transactions FedaPay/KkiaPay
│   │   └── notification_model.py        # Journal des alertes envoyées
│   │
│   ├── schemas/                         # Schémas de validation Pydantic (DTOs API)
│   │   ├── user_schema.py
│   │   ├── fleet_schema.py
│   │   ├── trip_schema.py
│   │   ├── ticket_schema.py
│   │   ├── payment_schema.py
│   │   └── gps_schema.py
│   │
│   ├── api/                             # Routes REST & WebSockets
│   │   ├── v1/
│   │   │   ├── api_router.py            # Routeur principal agrégeant tous les sous-modules
│   │   │   ├── endpoints/
│   │   │   │   ├── auth_endpoint.py     # Inscription, Login, Refresh Token
│   │   │   │   ├── kyc_endpoint.py      # Upload pièces, modération CROUS
│   │   │   │   ├── trip_endpoint.py     # Recherche de trajets, état du trafic
│   │   │   │   ├── booking_endpoint.py  # Réservation & Initialisation Paiement
│   │   │   │   ├── webhook_endpoint.py  # Webhooks FedaPay / KkiaPay (Sécurisés)
│   │   │   │   ├── driver_endpoint.py   # Prise de service, validation pass, alertes
│   │   │   │   ├── admin_endpoint.py    # Gestion flotte, reporting financier
│   │   │   │   └── recycle_endpoint.py  # Moteur de recyclage des tickets
│   │   └── websockets/
│   │       ├── gps_tracker_ws.py        # Réception flux GPS Chauffeur & Broadcast Étudiants
│   │       └── connection_manager.py    # Gestionnaire des sockets et channels de rooms
│   │
│   ├── services/                        # Logique métier pure (Business Logic)
│   │   ├── auth_service.py
│   │   ├── kyc_service.py               # Traitement et vérification 90 jours
│   │   ├── payment_service.py           # Communication API FedaPay/KkiaPay
│   │   ├── ticket_engine_service.py     # Génération QR Code, Token SMS, Verrouillage sièges
│   │   ├── eta_calculator_service.py    # Algorithme vectoriel et spatial ETA
│   │   ├── recycling_service.py         # Validation des 7 jours & annulation/réémission
│   │   └── notification_service.py      # Envoi Push (FCM) & SMS
│   │
│   └── tasks/                           # Tâches asynchrones et périodiques (Celery)
│       ├── celery_app.py                # Instance et configuration Celery
│       ├── recycle_cron_tasks.py        # Tâches planifiées : J-3, J-2, J-1, H-1, J+7
│       └── kyc_cron_tasks.py            # Tâche planifiée : Suspension trimestrielle (90j)
│
├── tests/                               # Suite de tests unitaires et d'intégration
│   ├── test_booking.py
│   ├── test_capacity_lock.py
│   └── test_recycling.py
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml               # Multi-conteneurs (API, Postgres/PostGIS, Redis, Celery)
│
├── .env.example
├── alembic.ini
├── main.py                              # Point d'entrée de l'application FastAPI
└── requirements.txt
```

---

## 3. MODÈLE DE DONNÉES & SCHÉMA POSTGRESQL + POSTGIS

```sql
-- ACTIVATION DE L'EXTENSION GÉOSPATIALE
CREATE EXTENSION IF NOT EXISTS POSTGIS;

-- 1. TYPES ÉNUMÉRÉS (ENUMS)
CREATE TYPE USER_ROLE_ENUM AS ENUM ('STUDENT', 'DRIVER', 'CONTROLLER', 'ADMIN_CROUS', 'SUPERADMIN');
CREATE TYPE KYC_STATUS_ENUM AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE DOCUMENT_TYPE_ENUM AS ENUM ('STUDENT_CARD', 'CIP_IDENTITY', 'CNI', 'PASSPORT');
CREATE TYPE BUS_STATUS_ENUM AS ENUM ('OPERATIONAL', 'OUT_OF_SERVICE', 'MAINTENANCE');
CREATE TYPE TRIP_STATUS_ENUM AS ENUM ('SCHEDULED', 'BOARDING', 'EN_ROUTE', 'COMPLETED', 'CANCELLED');
CREATE TYPE PAYMENT_STATUS_ENUM AS ENUM ('INITIATED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED');
CREATE TYPE PAYMENT_GATEWAY_ENUM AS ENUM ('FEDAPAY', 'KKIAPAY');
CREATE TYPE TICKET_STATUS_ENUM AS ENUM ('ISSUED', 'VALIDATED', 'EXPIRED', 'RECYCLED', 'CANCELLED');

-- 2. TABLE DES UTILISATEURS
CREATE TABLE USERS (
    USER_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    MATRICULE_UAC VARCHAR(50) UNIQUE NULL,
    PHONE_NUMBER VARCHAR(20) UNIQUE NOT NULL,
    FIRST_NAME VARCHAR(100) NOT NULL,
    LAST_NAME VARCHAR(100) NOT NULL,
    PASSWORD_HASH VARCHAR(255) NOT NULL,
    ROLE USER_ROLE_ENUM NOT NULL DEFAULT 'STUDENT',
    KYC_STATUS KYC_STATUS_ENUM NOT NULL DEFAULT 'PENDING',
    LAST_KYC_VERIFICATION_DATE TIMESTAMP WITH TIME ZONE NULL,
    NEXT_KYC_DUE_DATE TIMESTAMP WITH TIME ZONE NULL,
    IS_ACTIVE BOOLEAN NOT NULL DEFAULT TRUE,
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLE DES DOCUMENTS KYC ACADÉMIQUES
CREATE TABLE KYC_DOCUMENTS (
    DOCUMENT_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    USER_ID UUID NOT NULL REFERENCES USERS(USER_ID) ON DELETE CASCADE,
    DOCUMENT_TYPE DOCUMENT_TYPE_ENUM NOT NULL,
    DOCUMENT_URL VARCHAR(500) NOT NULL,
    VERIFICATION_STATUS KYC_STATUS_ENUM NOT NULL DEFAULT 'PENDING',
    REJECTION_REASON TEXT NULL,
    VALIDATED_BY UUID NULL REFERENCES USERS(USER_ID),
    VALIDATED_AT TIMESTAMP WITH TIME ZONE NULL,
    ACADEMIC_YEAR VARCHAR(10) NOT NULL,
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLE DES VÉHICULES (BUS)
CREATE TABLE BUSES (
    BUS_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    IMMATRICULATION_NUMBER VARCHAR(30) UNIQUE NOT NULL,
    BUS_CODE VARCHAR(20) UNIQUE NOT NULL,
    MAX_CAPACITY INTEGER NOT NULL DEFAULT 50,
    STATUS BUS_STATUS_ENUM NOT NULL DEFAULT 'OPERATIONAL',
    CURRENT_DRIVER_ID UUID NULL REFERENCES USERS(USER_ID),
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLE DES ARRÊTS & LIGNES (SIG / POSTGIS)
CREATE TABLE STOPS (
    STOP_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    STOP_NAME VARCHAR(150) NOT NULL,
    GEOLOCATION GEOMETRY(POINT, 4326) NOT NULL,
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ROUTES (
    ROUTE_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    ROUTE_NAME VARCHAR(150) NOT NULL,
    ORIGIN_STOP_ID UUID NOT NULL REFERENCES STOPS(STOP_ID),
    DESTINATION_STOP_ID UUID NOT NULL REFERENCES STOPS(STOP_ID),
    BASE_PRICE NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    ESTIMATED_DURATION_MINUTES INTEGER NOT NULL,
    IS_ACTIVE BOOLEAN NOT NULL DEFAULT TRUE,
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLE DES TRAJETS PROGRAMMÉS
CREATE TABLE TRIPS (
    TRIP_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    ROUTE_ID UUID NOT NULL REFERENCES ROUTES(ROUTE_ID),
    BUS_ID UUID NOT NULL REFERENCES BUSES(BUS_ID),
    DRIVER_ID UUID NOT NULL REFERENCES USERS(USER_ID),
    DEPARTURE_TIME TIMESTAMP WITH TIME ZONE NOT NULL,
    ESTIMATED_ARRIVAL_TIME TIMESTAMP WITH TIME ZONE NOT NULL,
    ACTUAL_DEPARTURE_TIME TIMESTAMP WITH TIME ZONE NULL,
    STATUS TRIP_STATUS_ENUM NOT NULL DEFAULT 'SCHEDULED',
    TOTAL_SEATS INTEGER NOT NULL DEFAULT 50,
    AVAILABLE_SEATS INTEGER NOT NULL DEFAULT 50,
    DELAY_MINUTES INTEGER NOT NULL DEFAULT 0,
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CHECK_AVAILABLE_SEATS_NON_NEGATIVE CHECK (AVAILABLE_SEATS >= 0)
);

-- 7. TABLE DES TRANSACTIONS FINANCIÈRES
CREATE TABLE PAYMENTS (
    PAYMENT_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    USER_ID UUID NOT NULL REFERENCES USERS(USER_ID),
    TRANSACTION_REFERENCE VARCHAR(100) UNIQUE NOT NULL,
    GATEWAY PAYMENT_GATEWAY_ENUM NOT NULL,
    GATEWAY_REFERENCE VARCHAR(150) UNIQUE NULL,
    AMOUNT NUMERIC(10, 2) NOT NULL,
    PHONE_NUMBER VARCHAR(20) NOT NULL,
    STATUS PAYMENT_STATUS_ENUM NOT NULL DEFAULT 'INITIATED',
    CALLBACK_PAYLOAD JSONB NULL,
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLE DES TICKETS DE PASSAGE & RECYCLAGE
CREATE TABLE TICKETS (
    TICKET_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    USER_ID UUID NOT NULL REFERENCES USERS(USER_ID),
    TRIP_ID UUID NOT NULL REFERENCES TRIPS(TRIP_ID),
    PAYMENT_ID UUID NOT NULL REFERENCES PAYMENTS(PAYMENT_ID),
    QR_CODE_TOKEN VARCHAR(500) UNIQUE NOT NULL,
    SMS_BACKUP_CODE VARCHAR(8) UNIQUE NOT NULL,
    STATUS TICKET_STATUS_ENUM NOT NULL DEFAULT 'ISSUED',
    RECYCLE_COUNT INTEGER NOT NULL DEFAULT 0,
    INITIAL_EXPIRATION_DATE TIMESTAMP WITH TIME ZONE NOT NULL,
    FINAL_EXPIRATION_DATE TIMESTAMP WITH TIME ZONE NOT NULL, -- DÉLAI STRICT J+7
    VALIDATED_AT TIMESTAMP WITH TIME ZONE NULL,
    VALIDATED_BY_DRIVER_ID UUID NULL REFERENCES USERS(USER_ID),
    CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CHECK_SINGLE_RECYCLE CHECK (RECYCLE_COUNT <= 1)
);

-- 9. HISTORIQUE DU LOG GÉOGRAPHIQUE EN TEMPS RÉEL
CREATE TABLE GPS_LOGS (
    LOG_ID BIGSERIAL PRIMARY KEY,
    BUS_ID UUID NOT NULL REFERENCES BUSES(BUS_ID),
    TRIP_ID UUID NOT NULL REFERENCES TRIPS(TRIP_ID),
    POSITION GEOMETRY(POINT, 4326) NOT NULL,
    SPEED_KMH NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    BEARING_DEGREES NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    RECORDED_AT TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOTIFICATIONS LOG
CREATE TABLE NOTIFICATIONS (
    NOTIFICATION_ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    USER_ID UUID NOT NULL REFERENCES USERS(USER_ID),
    TICKET_ID UUID NULL REFERENCES TICKETS(TICKET_ID),
    TITLE VARCHAR(150) NOT NULL,
    MESSAGE TEXT NOT NULL,
    CHANNEL VARCHAR(20) NOT NULL, -- 'PUSH', 'SMS'
    IS_SENT BOOLEAN NOT NULL DEFAULT FALSE,
    SCHEDULED_FOR TIMESTAMP WITH TIME ZONE NOT NULL,
    SENT_AT TIMESTAMP WITH TIME ZONE NULL
);

-- CRÉATION DES INDEX DE PERFORMANCE & SPATIAUX
CREATE INDEX IDX_STOPS_GEOLOCATION ON STOPS USING GIST(GEOLOCATION);
CREATE INDEX IDX_GPS_LOGS_POSITION ON GPS_LOGS USING GIST(POSITION);
CREATE INDEX IDX_GPS_LOGS_TRIP_ID_RECORDED ON GPS_LOGS (TRIP_ID, RECORDED_AT DESC);
CREATE INDEX IDX_TICKETS_USER_STATUS ON TICKETS (USER_ID, STATUS);
CREATE INDEX IDX_TICKETS_FINAL_EXPIRATION ON TICKETS (FINAL_EXPIRATION_DATE, STATUS);
CREATE INDEX IDX_TRIPS_ROUTE_STATUS ON TRIPS (ROUTE_ID, STATUS, DEPARTURE_TIME);
CREATE INDEX IDX_USERS_KYC_DUE ON USERS (NEXT_KYC_DUE_DATE, KYC_STATUS);
```

---

## 4. MATRICE D'INTÉGRATION FRONTEND / BACKEND

```text
                               ┌────────────────────────────────────────┐
                               │       UAC-BusPass BACKEND API          │
                               │          (FastAPI + PostGIS)           │
                               └──────┬──────────────────┬──────────────┘
                                      │                  │
                ┌─────────────────────┘                  └─────────────────────┐
                ▼                                                              ▼
┌───────────────────────────────┐                             ┌───────────────────────────────┐
│     ADMIN WEB (Vue.js 3)      │                             │   MOBILE (React Native / Expo)│
├───────────────────────────────┤                             ├───────────────────────────────┤
│ • GET /api/v1/admin/fleet     │                             │ • POST /api/v1/auth/register  │
│ • POST /api/v1/admin/trips    │                             │ • POST /api/v1/auth/kyc/upload│
│ • GET /api/v1/admin/kyc/list  │                             │ • GET /api/v1/trips/available │
│ • PUT /api/v1/admin/kyc/verify│                             │ • GET /api/v1/trips/student/..│
│ • GET /api/v1/admin/audit-fin │                             │ • POST /api/v1/trips/{id}/book│
│ • Leaflet Dashboard Flotte    │                             │ • GET /api/v1/driver/hub & psg│
│                               │                             │ • POST /api/v1/driver/report..│
│                               │                             │ • WS /ws/student/track/{trip} │
└───────────────────────────────┘                             └───────────────────────────────┘
```

### Contrats JSON Spécifiques Frontend Mobile (React Native) :

#### 1. Trajets Disponibles (Écran `BookTicketScreen.tsx` & `HomeScreen.tsx`)
* `GET /api/v1/trips/available`
```json
[
  {
    "trip_id": "8f3b4c10-9dad-11d1-80b4-00c04fd430c8",
    "formatted_time": "07:30 - Ligne A",
    "seats_label": "32/50 places",
    "full": false,
    "available_seats": 32,
    "total_seats": 50,
    "origin_name": "Calavi Campus",
    "destination_name": "Cotonou Centre",
    "price": 250.0,
    "duration": "35 min"
  }
]
```

#### 2. Ticket Actif & Tracking GPS Étudiant (`ActiveTicketScreen.tsx`)
* `GET /api/v1/trips/student/active-ticket`
```json
{
  "ticket_id": "a7b9x2m4-0000-0000-0000-000000000000",
  "route_name": "Campus Express Route 4",
  "student_name": "Koffi Alain",
  "student_id": "Student ID: 2023-4458",
  "qr_code_token": "CROUS-UAC-TICKET-A7B9X2M4",
  "code": "A7B9-X2M4",
  "status": "Valid Ticket",
  "avail_for_label": "Available for 6 more days",
  "available_for_days": 6,
  "has_delay": true,
  "delay_minutes": 15,
  "delay_title": "Delay: +15 min",
  "delay_reason": "Due to heavy traffic near the central campus roundabout.",
  "bus_code": "Bus #402",
  "capacity_percentage": 65,
  "eta_minutes": 8,
  "latitude": 6.447412,
  "longitude": 2.355721
}
```

#### 3. Hub Chauffeur (`DriverHubScreen.tsx`)
* `GET /api/v1/driver/active-trip`
```json
{
  "trip_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "route_title": "Campus Express Route 4",
  "next_stop_name": "Science Block",
  "next_stop_eta_minutes": 5,
  "capacity_num": 32,
  "capacity_total": 50,
  "capacity_percentage": 64,
  "bus_code": "BUS-UAC-01",
  "is_live": true
}
```

#### 4. Manifeste Passagers (`PassengerLookupScreen.tsx`)
* `GET /api/v1/driver/passengers`
```json
{
  "trip_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "trip_title": "Trip #4022 - Campus to Cotonou",
  "counts": { "all": 4, "pending": 2, "checked": 2 },
  "passengers": [
    {
      "id": "1",
      "name": "Koffi Alain",
      "matricule": "UAC-2022-8492",
      "phone": "+229 97 00 11 22",
      "stop": "Portail Principal",
      "status": "pending",
      "checkedAt": null
    },
    {
      "id": "2",
      "name": "Sena Dossou",
      "matricule": "UAC-2021-3310",
      "phone": "+229 95 44 33 22",
      "stop": "Godomey",
      "status": "checked",
      "checkedAt": "07:42 AM"
    }
  ]
}
```

#### 5. Signalement Retard / Incident Chauffeur (`ReportDelayScreen.tsx`)
* `POST /api/v1/driver/report-delay`
```json
// Request:
{
  "trip_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "delay_minutes": 30,
  "incident_type": "traffic",
  "custom_message": "Heavy Traffic near the central roundabout"
}
// Response (200 OK):
{
  "message": "Incident broadcasted successfully.",
  "trip_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "delay_minutes": 30,
  "incident_type": "traffic",
  "passengers_notified_count": 50
}
```

#### 6. Validation du Pass (Scan QR ou Code Manuel)
* `POST /api/v1/driver/validate-ticket`
```json
{
  "scan_mode": "OPTICAL_QR",
  "qr_code_token": "CROUS-UAC-TICKET-A7B9X2M4",
  "sms_backup_code": null,
  "trip_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```
* **Réponse Succès (200 OK) :**
```json
{
  "validation_status": "ACCESS_GRANTED",
  "message": "Ticket validé avec succès. Accès autorisé à bord.",
  "student_name": "Student 2023-4458",
  "matricule_uac": "2023-4458",
  "line_name": "Line 4 - Calavi",
  "validated_time": "10:42 AM",
  "timestamp": "2026-03-30T07:15:00Z"
}
```


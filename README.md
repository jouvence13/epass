# 🚌 CROUS ePass UAC - Plateforme Digitale de Transit Universitaire

Plateforme intégrée de billetterie numérique, validation par QR code anti-fraude, gestion de flotte de navettes, modération académique et contrôle d'accès pour le **Centre des Œuvres Universitaires et Sociales d'Abomey-Calavi (CROUS-UAC)**.

---

## 📱 Les 4 Espaces de l'Application Mobile / Web

| Espace & Rôle | Identifiant (Démo) | Mot de passe | Fonctionnalités Clés |
| :--- | :--- | :--- | :--- |
| 🎓 **Étudiant** (`STUDENT`) | `+22997001122` | `Student1234` | Achat instantané (100 FCFA), Portefeuille Mobile Money (MTN / Moov / Celtiis), Pass QR Code chiffré AES, Recyclage de pass sous J+7, Suivi GPS en direct. |
| 🚍 **Chauffeur** (`DRIVER`) | `+22997000001` | `Driver1234` | Poste de conduite, Déclenchement de départ/arrivée, Signalement de retard avec motif, Manifeste passagers, Scanner de billet. |
| 🛡️ **Contrôleur** (`CONTROLLER`) | `+22997000002` | `Controller1234` | Hub d'inspection assermentée, Validation de conformité KYC (Badge CROUS + CIP), Établissement de procès-verbaux d'infraction/fraude en temps réel. |
| 🏛️ **Admin CROUS** (`ADMIN_CROUS`) | `+22997000000` | `Admin1234` | Audit financier (Recettes en FCFA, taux de recyclage), Modération KYC en 1-clic (validité 90 jours), Gestion de la flotte (Bus, Lignes, Trajets), Enrôlement du personnel. |

---

## 🚀 Démarrage Complet du Projet (En Local)

### 1. Démarrer le Backend & la Base de Données
Le backend tourne avec Docker Compose (FastAPI, PostgreSQL 16 + PostGIS, Redis 7, Celery) :

```bash
# À la racine du projet
docker compose up --build -d
```
- **API Swagger UI** : [http://localhost:8001/docs](http://localhost:8001/docs)
- **Base de données** : `localhost:5433` (PostGIS)

---

### 2. Démarrer le Tunnel Public (Pour les tests mobiles à distance)
Pour que l'application mobile (APK ou Expo) puisse communiquer avec votre ordinateur depuis n'importe où (en 4G ou sur un autre réseau Wi-Fi) :

```bash
ngrok http 8001
```
> Le tunnel fournit une URL sécurisée `https://xxxx.ngrok-free.app` configurée dans `frontend/src/config/api.ts`.

---

### 3. Démarrer le Frontend (Mode Développement / Web)

```bash
cd frontend
npm install
npx expo start
```
- Appuyez sur **`w`** pour ouvrir l'application dans votre navigateur Web.
- Appuyez sur **`r`** pour recharger le code sur les appareils connectés.

---

## 📦 Guide de Compilation & Téléchargement de l'APK Android (`.apk`)

Pour générer une vraie application autonome Android installable sur n'importe quel smartphone et distribuable par **WhatsApp** :

### Étape 1 : Connexion à Expo EAS
```bash
cd frontend
npx eas-cli login
```
*(Connectez-vous avec votre compte Expo gratuit).*

### Étape 2 : Lancer la Compilation de l'APK
```bash
npx eas-cli build -p android --profile preview
```

### Étape 3 : Télécharger et Installer l'APK
1. Dès que la compilation dans le Cloud EAS est terminée, un lien de téléchargement direct ainsi qu'un QR code s'affichent dans le terminal (et sur votre tableau de bord Expo).
2. Ouvrez le lien sur votre smartphone (ou téléchargez le fichier `.apk` sur votre PC).
3. **Installation sur le téléphone** :
   - Ouvrez le fichier `.apk`.
   - Si Android demande l'autorisation *"Installer des applications inconnues"*, cliquez sur **Paramètres > Autoriser**.
   - Cliquez sur **Installer**.
4. **Partage WhatsApp** :
   - Envoyez directement le fichier `.apk` téléchargé en pièce jointe sur WhatsApp à vos collaborateurs ou amis pour leurs tests !

---

## 📁 Architecture du Code Source

```text
epass/
├── README.md                          # Guide global et instructions de déploiement
├── ARCHITECTURE.md                    # Architecture technique et modèles de données
├── docker-compose.yml                 # Multi-conteneurs (API, Postgres/PostGIS, Redis, Celery)
│
├── backend/                           # API FastAPI Python (Asynchrone)
│   ├── app/
│   │   ├── api/v1/endpoints/          # Routes REST (Auth, KYC, Trips, Driver, Controller, Admin)
│   │   ├── core/                      # Sécurité JWT, chiffrement AES-256, DB Async
│   │   ├── models/                    # Modèles SQLAlchemy 2.0 & PostGIS (Users, Tickets, Fleet...)
│   │   ├── schemas/                   # Schémas DTO Pydantic v2
│   │   └── services/                  # Logique métier (Auth, KYC 90j, Réservation, Recyclage)
│   └── main.py                        # Point d'entrée FastAPI
│
└── frontend/                          # Application Mobile React Native (Expo SDK 54)
    ├── app.json                       # Métadonnées, package (com.crous.epass) et icônes
    ├── eas.json                       # Profils de compilation EAS (buildType: apk)
    └── src/
        ├── config/api.ts              # URLs et endpoints API / Tunnel
        ├── navigation/                # RootNavigator (RBAC 4 rôles) et TabNavigators
        ├── screens/
        │   ├── auth/                  # Connexion (LoginScreen) et Inscription (RegisterScreen)
        │   ├── student/               # Billetterie, Pass actif, Portefeuille, Suivi, KYC
        │   ├── driver/                # Poste de conduite, Retards, Manifeste, Scanner QR
        │   ├── controller/            # Hub d'inspection, PV de fraude, Contrôle assermenté
        │   └── admin/                 # Audit financier, Modération KYC, Gestion Flotte & Personnel
        └── theme/                     # Charte graphique & Design System CROUS-UAC
```

---

## 🔒 Sécurité & Anti-Fraude
- **Horodatage & Validité Dynamique** : Les QR codes intègrent une signature à rotation temporelle pour empêcher les captures d'écran frauduleuses.
- **Règle de Recyclage Unique (J+7)** : Un billet non utilisé ne peut être recyclé qu'une seule fois dans la limite de 7 jours après l'heure initiale.
- **Cycle de Recertification KYC 90 jours** : Les statuts étudiants et badges agents font l'objet d'un audit automatique avec notification de rappel avant expiration.

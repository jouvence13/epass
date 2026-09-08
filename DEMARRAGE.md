# 🚀 Guide de Démarrage Complet (Frontend + Backend) — ePass Campus Bénin

Bienvenue sur le projet **ePass Campus Bénin**, la plateforme nationale et moderne de billetterie numérique, de gestion de flotte et de suivi géospatial pour l'ensemble des campus universitaires du Bénin (UAC Abomey-Calavi, Université de Parakou UP, UNA, UNSTIM et centres universitaires régionaux).

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
├── frontend/                      # Application Mobile (Android / iOS) & Web Expo / React Native
│   ├── src/                       # Écrans (Étudiant, Chauffeur, Contrôleur, Admin)
│   ├── src/utils/storage.ts       # Service de persistance locale & Mode Hors-ligne
│   ├── app.json                   # Configuration Mobile (com.campusbenin.epass)
│   ├── eas.json                   # Profils de compilation EAS (APK Android & IPA iOS)
│   └── package.json               # Dépendances React Native / Expo
│
├── docker-compose.yml             # Orchestration Fullstack (Frontend + Backend + BDD + Redis + Celery)
└── DEMARRAGE.md                   # Ce guide de démarrage rapide
```

---

## 👥 Comptes de Test Pré-configurés (Seeders)

Tous ces comptes sont déjà initialisés dans la base de données de test :

| Rôle | Numéro de Téléphone | Mot de Passe | Profil & Données Associées |
| :--- | :--- | :--- | :--- |
| **SUPERADMIN** | `+22990000000` | `SuperAdmin1234` | Super Administrateur National (Accès total) |
| **ADMIN_CAMPUS** | `+22997000000` | `Admin1234` | Direction des Transports Universitaires (Flotte, KYC, Audit) |
| **DRIVER** | `+22997000001` | `Driver1234` | Chauffeur Campus (Bus `#402`, Manifeste passagers) |
| **CONTROLLER** | `+22997000002` | `Controller1234` | Contrôleur Campus (Validation à bord & PV de contrôle) |
| **STUDENT (1)** | `+22997001122` | `Student1234` | **Koffi Alain** : Ticket Actif `A7B9-X2M4` (Ligne Campus Express) |
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

## 📱 Mode Hors-Ligne & Persistance de Session (Offline Pass)

L'application **ePass Campus Bénin** intègre un moteur de persistance locale ultra-sécurisé :
1. **Auto-Login instantané** : Dès que l'utilisateur s'est connecté une première fois, sa session et ses données sont sauvegardées en local via `@react-native-async-storage/async-storage`.
2. **Affichage du Ticket sans Réseau** : Même en zone blanche ou sans forfait data à l'arrêt de bus, l'étudiant peut ouvrir l'application sans re-saisir son mot de passe.
3. **Scan Immédiat par les Chauffeurs/Contrôleurs** : Le QR code et le code de secours restent disponibles et lisibles immédiatement sur l'écran d'accueil et l'onglet Titres.

---

## 📦 Génération des Applications Mobiles (Android APK & iOS)

Le frontend est entièrement configuré avec **Expo Application Services (EAS)** pour créer des builds autonomes :

### 1. Générer le fichier APK Android (Installable sur tout smartphone Android) :
```bash
cd frontend
npx eas-cli build -p android --profile preview
```
*Le lien de téléchargement direct du fichier `.apk` vous sera fourni dans le terminal dès la fin de la compilation cloud.*

### 2. Générer l'application iOS :
```bash
cd frontend
# Pour simulateur iOS (.tar.gz) :
npx eas-cli build -p ios --profile preview

# Pour appareil physique iPhone (fichier .ipa Ad-hoc) :
npx eas-cli build -p ios --profile preview-device
```

### 3. Tester en direct avec Expo Go sur mobile (Android & iPhone) :
```bash
cd frontend
npx expo start --clear
```
*Scannez simplement le QR Code affiché dans le terminal avec l'application Expo Go ou l'appareil photo de votre smartphone.*

---

## 🧪 Comment tester l'API Backend avec Swagger UI

1. Ouvrez [http://localhost:8001/docs](http://localhost:8001/docs).
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
6. Collez votre jeton et validez pour tester les endpoints protégés.

---

## 🏭 Lancement en Production

```bash
docker compose -f backend/docker/docker-compose.prod.yml up --build -d
```

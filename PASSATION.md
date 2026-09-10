# 📋 Document de Passation & Guide Technique — ePass Campus UAC

> **Projet** : ePass Campus UAC — Plateforme Numérique de Billetterie et Gestion de Transport Universitaire (Bénin)  
> **Date de passation** : Septembre 2026  
> **Branche Git principale** : `main` (`github.com:jouvence13/epass.git`)  
> **Auteur / Équipe** : Antigravity Pair-Programming & Daiki  

---

## 📌 1. Vue d'Ensemble & Objectifs du Projet

**ePass Campus UAC** est une solution complète de billetterie électronique, gestion de flotte et contrôle d'accès pour les navettes et bus universitaires de l'Université d'Abomey-Calavi (UAC, Bénin).

### Acteurs & Rôles :
1. **Étudiant (`STUDENT`)** :
   - Inscription et certification du statut académique (KYC : Carte d'étudiant & CIP/CNI).
   - Achat de tickets de bus dématérialisés (100 FCFA tarif subventionné) via Portefeuille étudiant ou Mobile Money (MTN MoMo, Moov Money, Celtiis Cash).
   - Affichage du QR Code sécurisé dynamique (fonctionnel même hors-ligne).
   - Suivi en temps réel des rotations disponibles, des arrêts et de l'état du trajet.
   - Historique des voyages, gestion des moyens de paiement et centre de notifications.
2. **Chauffeur / Contrôleur (`DRIVER`)** :
   - Démarrage et clôture des rotations / trajets de bus.
   - Scan et validation instantanée des QR Codes des étudiants (vérification cryptographique HMAC hors-ligne + validation API en ligne).
   - Suivi du taux d'occupation en direct (ex: 32/50 places occupées).
3. **Administrateur (`ADMIN`)** :
   - Gestion de la flotte (bus, capacités, immatriculations).
   - Gestion des lignes, arrêts, itinéraires et prix de base.
   - Programmation et supervision des rotations / trajets quotidiens.
   - Validation des dossiers KYC étudiants.

---

## 🏗️ 2. Architecture & Stack Technique

### Frontend (`/frontend`)
- **Framework** : React Native avec **Expo SDK 52** (TypeScript).
- **Navigation** : React Navigation v6 (Native Stack + Bottom Tabs).
- **Gestion d'état** : React Context API (`AuthContext`, `NotificationContext`).
- **Persistance locale** : `@react-native-async-storage/async-storage`.
- **UI & Design System** : Palette de couleurs nationale béninoise (Vert #008751, Jaune #FCD116, Rouge #E8112D) avec tokens HSL, typographie moderne et retour haptique/visuel fluide.
- **Génération / Scan QR** : `react-native-qrcode-svg`, `expo-camera`.
- **Build Mobile** : EAS Build (profil `preview` pour génération d'APK autonome Android).

### Backend (`/backend`)
- **Framework** : FastAPI (Python 3.11).
- **Base de données** : PostgreSQL 15+ avec **SQLAlchemy 2.0 (mode 100% asynchrone)** + migrations **Alembic**.
- **Driver DB** : `asyncpg`.
- **Validation & Sérialisation** : Pydantic v2.
- **Cache & Message Broker** : Redis 7.
- **Tâches de fond** : Celery.
- **Sécurité** : JWT (JSON Web Tokens), Argon2 / Passlib, signatures HMAC-SHA256 pour les tickets hors-ligne.

### Infrastructure & Déploiement
- **Docker Compose** :
  - `uac_buspass_db` (PostgreSQL sur port `5433:5432`).
  - `uac_buspass_redis` (Redis sur port `6379:6379`).
  - `uac_buspass_api` (FastAPI sur port `8001:8000`).
  - `uac_buspass_worker` (Celery worker).
- **Tunneling Mobile** : Ngrok (pour exposer `http://localhost:8001` via une URL HTTPS publique accessible par l'APK Android et Expo Go).

---

## ✅ 3. Réalisations & Fonctionnalités Implémentées

### A. Authentification & Profil
- Inscription & Connexion avec gestion automatique des tokens JWT stockés de manière sécurisée.
- Gestion du statut KYC (`NOT_SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`).
- Blocage automatique des départs subventionnés si le compte n'est pas encore certifié KYC.

### B. Rotations & Départs Campus (100% Dynamique)
- Récupération dynamique depuis la base de données (`GET /api/v1/trips/available`).
- Affichage dans `HomeScreen` (*Prochains Départs Campus*) et `BookTicketScreen` (*Rotations Disponibles*).
- Support du Pull-to-Refresh (`RefreshControl`) sur tous les écrans pour rafraîchir en temps réel.
- Achat direct de ticket depuis la modale de départ avec choix du moyen de paiement.

### C. Gestion des Billets & QR Code Hybride
- Achat de ticket avec débit du portefeuille ou simulation Mobile Money (MTN, Moov, Celtiis).
- Génération d'un QR code contenant un token signé (HMAC) permettant la validation sans connexion Internet.
- Écran `ActiveTicketScreen` complet :
  - Affichage dynamique de l'état du bus et de la progression des arrêts (Passé, Actuel, À venir).
  - Possibilité de modifier l'horaire ou la rotation du billet actif en sélectionnant un autre départ disponible.
  - Résumé du trajet, terminus et heure estimée d'arrivée.

### D. Moyens de Paiement & Portefeuille
- Écran `PaymentMethodsScreen` permettant d'enregistrer et de mémoriser les numéros de téléphone pour chaque opérateur (MTN, Moov, Celtiis).
- Persistance locale dans `AsyncStorage` et rechargement dynamique du portefeuille.

### E. Flotte, Lignes & Arrêts (Admin & Backend)
- Endpoints complets dans `admin_endpoint.py` et `trip_endpoint.py` pour créer/gérer :
  - Les arrêts (`Stop` : Calavi Campus, Godomey, Étoile Rouge, Akpakpa, Porto-Novo Gare, etc.).
  - Les lignes de bus (`Route` : Campus Express, Ligne Calavi - Porto-Novo, etc.).
  - Les bus (`Bus` : Immatriculations, capacités, statuts opérationnels).
  - Les rotations (`Trip` : Heures de départ, prix, chauffeur et bus assignés).

---

## ⚠️ 4. Pièges Critiques & Erreurs à Éviter Absolument (Gotchas)

### 🔴 1. SQLAlchemy 2.0 Async & `MissingGreenlet`
- **Problème** : Lors de l'accès à une relation (ex: `trip.route.route_stops` ou `trip.bus`) non préchargée avec `selectinload`, SQLAlchemy lève une erreur `MissingGreenlet: greenlet_spawn has not been called`.
- **Règle d'or** : 
  - Toujours précharger les relations avec `options(selectinload(...))` dans les requêtes SQLAlchemy.
  - Dans les endpoints (ex: `trip_endpoint.py`), sérialiser explicitement les sous-objets Pydantic (`RouteOutSchema(...)`, `BusOutSchema(...)`) au lieu de passer des instances SQLAlchemy non chargées directement à des schémas imbriqués.

### 🔴 2. Configuration EAS Build & Expo Slug
- **Problème** : `Slug for project identified by extra.eas.projectId does not match the slug field`.
- **Règle d'or** : 
  - Le champ `"slug"` dans `frontend/app.json` **doit correspondre exactement** au nom du projet Expo sur expo.dev (ex: `"slug": "epass-uac"` ou `"slug": "epass-campus-benin"`).
  - L'ID dans `"extra.eas.projectId"` doit être synchronisé avec le projet déclaré.

### 🔴 3. Communication Mobile ↔ Backend (Ngrok / IP)
- **Problème** : L'APK Android ne peut **jamais** contacter `http://localhost:8001` ou `http://127.0.0.1:8001` car `localhost` sur le téléphone désigne le téléphone lui-même.
- **Règle d'or** :
  - Lancer le tunnel Ngrok sur le port 8001 : `ngrok http 8001`.
  - Mettre à jour `frontend/.env` avec l'URL publique HTTPS :
    ```env
    EXPO_PUBLIC_API_URL=https://<votre-id-ngrok>.ngrok-free.app/api/v1
    ```
  - Lors d'un build EAS (`npm run build:preview`), la variable `EXPO_PUBLIC_API_URL` est intégrée dans l'APK.

### 🔴 4. Données Dynamiques vs Mocks Codés en Dur
- **Règle d'or** : 
  - Ne jamais réintroduire de faux tableaux en dur dans les contextes ou composants.
  - Toutes les rotations, tous les tickets et toutes les lignes doivent provenir de l'API via `refreshTrips()`, `refreshTickets()` et `refreshProfile()`.

---

## 🚀 5. Commandes Utiles & Guide de Démarrage Rapide

### 1. Démarrer l'infrastructure Backend & DB
```bash
cd "/mnt/3CCAC8AFCAC866AC/Projet global/Repository/epass"

# Lancer les conteneurs Docker en arrière-plan
docker compose up -d

# Vérifier que l'API et la DB fonctionnent
docker compose ps
curl -s http://localhost:8001/api/v1/health | jq .
```

### 2. Démarrer le Tunnel Ngrok (pour l'accès mobile / APK)
```bash
# Dans un terminal dédié ou en tâche de fond
ngrok http 8001
# Récupérer l'URL générée (ex: https://abc-123.ngrok-free.app)
# et la reporter dans frontend/.env (sans slash final) :
# EXPO_PUBLIC_API_URL=https://abc-123.ngrok-free.app/api/v1
```

### 3. Démarrer le Frontend en Développement (Expo)
```bash
cd "/mnt/3CCAC8AFCAC866AC/Projet global/Repository/epass/frontend"

# Vérifier la compilation TypeScript
npx tsc --noEmit

# Lancer Metro Bundler
npx expo start --tunnel
```

### 4. Compiler une nouvelle version APK Android (EAS Preview)
```bash
cd "/mnt/3CCAC8AFCAC866AC/Projet global/Repository/epass/frontend"
npm run build:preview
```

### 5. Tester l'API des Rotations Disponibles
```bash
curl -s http://localhost:8001/api/v1/trips/available | jq .
```

---

## 🧭 6. Travaux en Cours & Prochaines Étapes (Roadmap)

1. **Vérification terrain sur l'APK** :
   - Tester l'achat complet de tickets sur smartphone réel connecté via Ngrok.
   - Tester le scan de billet par le chauffeur (`DriverScanScreen`) en mode connecté et déconnecté.
2. **Télémétrie GPS en direct** :
   - Implémentation du streaming de géolocalisation des bus (WebSocket ou Server-Sent Events) pour animer le bus en direct sur la carte du trajet.
3. **Push Notifications Expo** :
   - Enregistrement du token de notification push Expo lors du login pour envoyer des alertes réelles lors du départ du bus ou de la validation KYC.
4. **Dashboard d'Administration Web** :
   - Interface de gestion globale pour les responsables de transport UAC (statistiques de fréquentation, gestion des subventions de l'État).

---

*Ce document sert de référence officielle pour reprendre le développement sans perte de contexte.*

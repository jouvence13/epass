"""
================================================================================
SCRIPT D'INITIALISATION ET SEEDER DE BASE DE DONNÉES (UAC-BUSPASS)
================================================================================
Ce script initialise le schéma de base de données PostgreSQL / PostGIS et
insère un jeu complet de données de test pour tous les rôles du système :
- SuperAdmin & Admin CROUS
- Chauffeurs & Contrôleurs
- Étudiants avec comptes validés et tickets actifs (compatible avec le Frontend)
- Arrêts géographiques (PostGIS Point 4326), Lignes de bus, Flotte et Trajets

UTILISATION :
    python seed.py
================================================================================
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Assurer que le répertoire parent est dans sys.path pour les imports app.*
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, select, func
from app.core.database import async_engine, AsyncSessionLocal
from app.core.security import hash_password
from app.models.base import Base
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum, KycDocuments, DocumentTypeEnum
from app.models.fleet_model import Buses, Stops, Routes, RouteStops, BusStatusEnum
from app.models.trip_model import Trips, TripStatusEnum, GpsLogs
from app.models.payment_model import (
    Payments,
    PaymentStatusEnum,
    PaymentGatewayEnum,
    Wallets,
    UserPaymentMethods,
)
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.models.notification_model import Notifications
from app.models.campus_model import Campuses
from app.models.fraud_model import InfractionTypes, FraudReports


async def run_seed():
    print("\n" + "=" * 80)
    print("🚀 DÉMARRAGE DU SEEDER DE BASE DE DONNÉES UAC-BUSPASS")
    print("=" * 80)

    async with async_engine.begin() as conn:
        print("📦 1. Activation de l'extension spatiale PostGIS...")
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            print("   ✅ Extension PostGIS prête.")
        except Exception as e:
            print(f"   ⚠️ Remarque PostGIS : {e}")

        print("🔨 2. Création et synchronisation des tables SQLAlchemy...")
        await conn.run_sync(Base.metadata.create_all)
        
        # Migrations dynamiques de colonnes pour les tables existantes
        migration_statements = [
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS support_phone VARCHAR(30);",
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS support_whatsapp VARCHAR(30);",
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS support_email VARCHAR(100);",
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS office_location VARCHAR(200);",
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS office_hours VARCHAR(100);",
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS subsidized_price FLOAT DEFAULT 100.0;",
            "ALTER TABLE campuses ADD COLUMN IF NOT EXISTS landmarks JSONB DEFAULT '[]'::jsonb;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_id UUID;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_code VARCHAR(50) DEFAULT 'UAC';",
        ]
        for stmt in migration_statements:
            try:
                await conn.execute(text(stmt))
            except Exception as ex:
                pass
        print("   ✅ Schéma de tables et colonnes synchronisés.")

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # ----------------------------------------------------------------------
        # CAMPUS UNIVERSITAIRES DU BÉNIN (CAMPUSES)
        # ----------------------------------------------------------------------
        print("\n🏛️ 3. Création des Campus Universitaires Nationaux...")
        campuses_data = [
            {
                "code": "UAC",
                "name": "Université d'Abomey-Calavi",
                "city": "Abomey-Calavi",
                "latitude": 6.4474,
                "longitude": 2.3557,
                "zoom_level": 15.0,
                "support_phone": "+2290121360100",
                "support_whatsapp": "+2290197000000",
                "support_email": "support.transport@uac.bj",
                "office_location": "Bâtiment Administratif et d'Accueil • Campus Calavi",
                "office_hours": "Du Lundi au Vendredi : 08h00 - 17h30",
                "subsidized_price": 100.0,
                "landmarks": [
                    {"name": "Terminus Principal Bus", "lat": 6.4470, "lon": 2.3550, "type": "stop"},
                    {"name": "Bibliothèque Universitaire", "lat": 6.4485, "lon": 2.3562, "type": "library"},
                    {"name": "Amphis FASHS & FASEG", "lat": 6.4450, "lon": 2.3540, "type": "hub"},
                    {"name": "Cités Universitaires", "lat": 6.4502, "lon": 2.3580, "type": "hub"},
                ]
            },
            {
                "code": "UP",
                "name": "Université de Parakou",
                "city": "Parakou",
                "latitude": 9.3500,
                "longitude": 2.6100,
                "zoom_level": 14.5,
                "support_phone": "+2290123610000",
                "support_whatsapp": "+2290197000099",
                "support_email": "support.transport@up.bj",
                "office_location": "Rectorat UP • Service Transit Étudiant",
                "office_hours": "Du Lundi au Vendredi : 08h00 - 17h00",
                "subsidized_price": 100.0,
                "landmarks": [
                    {"name": "Rectorat & Hub Central UP", "lat": 9.3510, "lon": 2.6110, "type": "hub"},
                    {"name": "Campus Albarika", "lat": 9.3480, "lon": 2.6080, "type": "library"},
                    {"name": "Gare Navette Campus Nord", "lat": 9.3520, "lon": 2.6130, "type": "stop"},
                ]
            },
            {
                "code": "UNA",
                "name": "Université Nationale d'Agriculture",
                "city": "Porto-Novo",
                "latitude": 6.5050,
                "longitude": 2.6050,
                "zoom_level": 14.5,
                "support_phone": "+2290120210000",
                "support_whatsapp": "+2290197000088",
                "support_email": "support.transport@una.bj",
                "office_location": "Direction du Campus • Site Central UNA",
                "office_hours": "Du Lundi au Vendredi : 08h00 - 17h00",
                "subsidized_price": 100.0,
                "landmarks": [
                    {"name": "Site Central UNA", "lat": 6.5060, "lon": 2.6040, "type": "hub"},
                    {"name": "Centre d'Expérimentation", "lat": 6.5030, "lon": 2.6070, "type": "library"},
                    {"name": "Station Navette UNA", "lat": 6.5055, "lon": 2.6052, "type": "stop"},
                ]
            },
            {
                "code": "UNSTIM",
                "name": "Université Nationale des Sciences (UNSTIM)",
                "city": "Abomey",
                "latitude": 7.1850,
                "longitude": 1.9900,
                "zoom_level": 14.0,
                "support_phone": "+2290122500000",
                "support_whatsapp": "+2290197000077",
                "support_email": "support.transport@unstim.bj",
                "office_location": "Bâtiment Scolarité & Transit • Abomey",
                "office_hours": "Du Lundi au Vendredi : 08h00 - 17h00",
                "subsidized_price": 100.0,
                "landmarks": [
                    {"name": "Institut National Supérieur", "lat": 7.1860, "lon": 1.9910, "type": "hub"},
                    {"name": "Campus Principal Abomey", "lat": 7.1840, "lon": 1.9890, "type": "stop"},
                ]
            },
        ]
        campuses_map = {}
        for c in campuses_data:
            existing_c = (await db.execute(select(Campuses).where(Campuses.code == c["code"]))).scalars().first()
            if not existing_c:
                new_c = Campuses(
                    code=c["code"],
                    name=c["name"],
                    city=c["city"],
                    latitude=c["latitude"],
                    longitude=c["longitude"],
                    zoom_level=c["zoom_level"],
                    is_active=True,
                    support_phone=c.get("support_phone"),
                    support_whatsapp=c.get("support_whatsapp"),
                    support_email=c.get("support_email"),
                    office_location=c.get("office_location"),
                    office_hours=c.get("office_hours"),
                    subsidized_price=c.get("subsidized_price", 100.0),
                    landmarks=c["landmarks"]
                )
                db.add(new_c)
                await db.flush()
                campuses_map[c["code"]] = new_c
                print(f"   🏛️ Campus créé : {c['code']} - {c['name']} ({c['city']})")
            else:
                existing_c.name = c["name"]
                existing_c.city = c["city"]
                existing_c.latitude = c["latitude"]
                existing_c.longitude = c["longitude"]
                existing_c.zoom_level = c["zoom_level"]
                existing_c.support_phone = c.get("support_phone")
                existing_c.support_whatsapp = c.get("support_whatsapp")
                existing_c.support_email = c.get("support_email")
                existing_c.office_location = c.get("office_location")
                existing_c.office_hours = c.get("office_hours")
                existing_c.subsidized_price = c.get("subsidized_price", 100.0)
                existing_c.landmarks = c["landmarks"]
                campuses_map[c["code"]] = existing_c
                print(f"   🏛️ Campus mis à jour : {c['code']}")
        await db.flush()

        print("\n👥 4. Création des comptes utilisateurs & rôles...")

        # ----------------------------------------------------------------------
        # COMPTES UTILISATEURS (RBAC)
        # ----------------------------------------------------------------------
        users_to_seed = [
            {
                "matricule_uac": "SUP-2024-001",
                "phone_number": "+2290190000000",
                "first_name": "Super",
                "last_name": "Admin",
                "password": "SuperAdmin1234",
                "role": UserRoleEnum.SUPERADMIN,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UAC",
            },
            {
                "matricule_uac": "ADM-2024-001",
                "phone_number": "+2290197000000",
                "first_name": "Directeur",
                "last_name": "Transport",
                "password": "Admin1234",
                "role": UserRoleEnum.ADMIN_CROUS,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UAC",
            },
            {
                "matricule_uac": "DRV-2024-001",
                "phone_number": "+2290197000001",
                "first_name": "Chauffeur",
                "last_name": "Principal",
                "password": "Driver1234",
                "role": UserRoleEnum.DRIVER,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UAC",
            },
            {
                "matricule_uac": "CTR-2024-001",
                "phone_number": "+2290197000002",
                "first_name": "Contrôleur",
                "last_name": "Principal",
                "password": "Controller1234",
                "role": UserRoleEnum.CONTROLLER,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UAC",
            },
            {
                "matricule_uac": "UAC-2022-8492",
                "phone_number": "+2290197001122",
                "first_name": "Koffi",
                "last_name": "Alain",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UAC",
            },
            {
                "matricule_uac": "UAC-2021-3310",
                "phone_number": "+2290195443322",
                "first_name": "Sena",
                "last_name": "Dossou",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UAC",
            },
            {
                "matricule_uac": "UP-2023-1102",
                "phone_number": "+2290161229988",
                "first_name": "Aminata",
                "last_name": "Sylla",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.APPROVED,
                "campus_code": "UP",
            },
            {
                "matricule_uac": "UNA-2020-5521",
                "phone_number": "+2290166123456",
                "first_name": "Marius",
                "last_name": "Adjovi",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.PENDING,
                "campus_code": "UNA",
            },
        ]

        def _get_variants(phone: str) -> list[str]:
            clean = phone.replace(" ", "").replace("-", "")
            no_plus = clean.lstrip("+")
            variants = {clean, no_plus, "+" + no_plus}
            if no_plus.startswith("229"):
                local = no_plus[3:]
                variants.add(local)
                if local.startswith("01"):
                    variants.add(local[2:])
                    variants.add("+229" + local[2:])
                    variants.add("229" + local[2:])
                else:
                    variants.add("01" + local)
                    variants.add("+22901" + local)
                    variants.add("22901" + local)
            return list(variants)

        users_map = {}
        for u_data in users_to_seed:
            c_code = u_data.get("campus_code", "UAC")
            c_obj = campuses_map.get(c_code)
            c_id = c_obj.campus_id if c_obj else None
            variants = _get_variants(u_data["phone_number"])

            existing_candidates = (
                await db.execute(select(Users).where(
                    (Users.phone_number.in_(variants)) |
                    (Users.matricule_uac == u_data["matricule_uac"])
                ))
            ).scalars().all()

            if existing_candidates:
                # Use primary matching user and update
                user_obj = existing_candidates[0]
                user_obj.phone_number = u_data["phone_number"]
                user_obj.matricule_uac = u_data["matricule_uac"]
                user_obj.first_name = u_data["first_name"]
                user_obj.last_name = u_data["last_name"]
                user_obj.password_hash = hash_password(u_data["password"])
                user_obj.role = u_data["role"]
                user_obj.kyc_status = u_data["kyc_status"]
                user_obj.last_kyc_verification_date = now if u_data["kyc_status"] == KycStatusEnum.APPROVED else None
                user_obj.next_kyc_due_date = (now + timedelta(days=90)) if u_data["kyc_status"] == KycStatusEnum.APPROVED else None
                user_obj.is_active = True
                user_obj.campus_id = c_id
                user_obj.campus_code = c_code
                for v in variants:
                    users_map[v] = user_obj
                print(f"   ℹ️ Mis à jour : {user_obj.role.value.ljust(12)} | {user_obj.phone_number} | {user_obj.first_name} {user_obj.last_name} [{c_code}]")
            else:
                user_obj = Users(
                    matricule_uac=u_data["matricule_uac"],
                    phone_number=u_data["phone_number"],
                    first_name=u_data["first_name"],
                    last_name=u_data["last_name"],
                    password_hash=hash_password(u_data["password"]),
                    role=u_data["role"],
                    kyc_status=u_data["kyc_status"],
                    last_kyc_verification_date=now if u_data["kyc_status"] == KycStatusEnum.APPROVED else None,
                    next_kyc_due_date=(now + timedelta(days=90)) if u_data["kyc_status"] == KycStatusEnum.APPROVED else None,
                    is_active=True,
                    campus_id=c_id,
                    campus_code=c_code
                )
                db.add(user_obj)
                await db.flush()
                for v in variants:
                    users_map[v] = user_obj
                print(f"   👤 Créé : {u_data['role'].value.ljust(12)} | {u_data['phone_number']} | {u_data['first_name']} {u_data['last_name']} [{c_code}]")

        # ----------------------------------------------------------------------
        # ARRÊTS SPATIAUX POSTGIS (STOPS)
        # ----------------------------------------------------------------------
        print("\n📍 4. Création des Arrêts PostGIS...")
        stops_data = [
            ("Campus UAC Calavi", 6.4474, 2.3557),
            ("Science Block", 6.4420, 2.3600),
            ("Carrefour IITA", 6.4320, 2.3500),
            ("Carrefour KPOTA", 6.4250, 2.3480),
            ("Marché Godomey", 6.4100, 2.3420),
            ("Échangeur Godomey", 6.4000, 2.3400),
            ("Carrefour Vêdoko", 6.3850, 2.3950),
            ("Stade Général Mathieu Kérékou", 6.3880, 2.3800),
            ("Carrefour Toyota", 6.3750, 2.4100),
            ("Place Bulgarie", 6.3780, 2.4050),
            ("Cotonou Étoile Rouge", 6.3703, 2.4174),
            ("Dantokpa Grand Marché", 6.3700, 2.4300),
            ("Akpakpa Sacré-Cœur", 6.3650, 2.4450),
            ("Carrefour Le Bélier", 6.4600, 2.4500),
            ("PK 10 Route Porto-Novo", 6.4750, 2.5200),
            ("Gare Routière Ouando", 6.4900, 2.6100),
            ("Porto-Novo Gare", 6.4969, 2.6289),
        ]
        stops_map = {}
        for name, lat, lon in stops_data:
            st = (await db.execute(select(Stops).where(Stops.stop_name == name))).scalars().first()
            if not st:
                st = Stops(
                    stop_name=name,
                    geolocation=func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
                )
                db.add(st)
                await db.flush()
                print(f"   📍 Arrêt créé : {name} ({lat}, {lon})")
            stops_map[name] = st

        # ----------------------------------------------------------------------
        # LIGNES DE BUS (ROUTES)
        # ----------------------------------------------------------------------
        print("\n🛣️ 5. Création des Lignes de Bus (Routes)...")
        routes_data = [
            {
                "name": "Campus Express (Ligne A)",
                "origin": "Campus UAC Calavi",
                "destination": "Cotonou Étoile Rouge",
                "price": 250.00,
                "duration": 35,
                "stops": [
                    ("Campus UAC Calavi", 0, None),
                    ("Carrefour IITA", 7, None),
                    ("Échangeur Godomey", 13, "Ligne B"),
                    ("Stade Général Mathieu Kérékou", 21, None),
                    ("Place Bulgarie", 28, None),
                    ("Cotonou Étoile Rouge", 35, None),
                ]
            },
            {
                "name": "Navette Inter-Facultés (Ligne B)",
                "origin": "Campus UAC Calavi",
                "destination": "Échangeur Godomey",
                "price": 100.00,
                "duration": 22,
                "stops": [
                    ("Campus UAC Calavi", 0, None),
                    ("Carrefour KPOTA", 8, None),
                    ("Marché Godomey", 14, None),
                    ("Échangeur Godomey", 22, None),
                ]
            },
            {
                "name": "Ligne Calavi - Porto-Novo",
                "origin": "Campus UAC Calavi",
                "destination": "Porto-Novo Gare",
                "price": 500.00,
                "duration": 60,
                "stops": [
                    ("Campus UAC Calavi", 0, None),
                    ("Carrefour Le Bélier", 20, None),
                    ("PK 10 Route Porto-Novo", 45, None),
                    ("Gare Routière Ouando", 65, None),
                    ("Porto-Novo Gare", 85, None),
                ]
            },
            {
                "name": "Ligne Express Akpakpa",
                "origin": "Campus UAC Calavi",
                "destination": "Akpakpa Sacré-Cœur",
                "price": 300.00,
                "duration": 40,
                "stops": [
                    ("Campus UAC Calavi", 0, None),
                    ("Carrefour Vêdoko", 17, None),
                    ("Carrefour Toyota", 23, None),
                    ("Dantokpa Grand Marché", 31, None),
                    ("Akpakpa Sacré-Cœur", 40, None),
                ]
            }
        ]
        routes_map = {}
        for r_info in routes_data:
            r = (await db.execute(select(Routes).where(Routes.route_name == r_info["name"]))).scalars().first()
            if not r:
                r = Routes(
                    route_name=r_info["name"],
                    origin_stop_id=stops_map[r_info["origin"]].stop_id,
                    destination_stop_id=stops_map[r_info["destination"]].stop_id,
                    base_price=r_info["price"],
                    estimated_duration_minutes=r_info["duration"],
                    is_active=True
                )
                db.add(r)
                await db.flush()
                print(f"   🛣️ Ligne créée : {r.route_name} ({r.base_price} FCFA, {r.estimated_duration_minutes} min)")

            routes_map[r_info["name"]] = r

            # Insérer la séquence des arrêts ordonnés (RouteStops)
            for order_idx, (stop_name, eta_offset, conn_lbl) in enumerate(r_info["stops"], start=1):
                target_stop = stops_map[stop_name]
                rs_existing = (await db.execute(
                    select(RouteStops).where(RouteStops.route_id == r.route_id, RouteStops.stop_id == target_stop.stop_id)
                )).scalars().first()

                if not rs_existing:
                    rs = RouteStops(
                        route_id=r.route_id,
                        stop_id=target_stop.stop_id,
                        stop_order=order_idx,
                        estimated_minutes_from_origin=eta_offset,
                        connection_label=conn_lbl
                    )
                    db.add(rs)
                    await db.flush()

        # ----------------------------------------------------------------------
        # FLOTTE DE BUS (BUSES)
        # ----------------------------------------------------------------------
        print("\n🚌 6. Enregistrement de la Flotte de Bus...")
        driver_user = users_map["+22997000001"]
        buses_data = [
            ("BUS-UAC-01", "RB-4412-UAC", 50, BusStatusEnum.OPERATIONAL, driver_user.user_id),
            ("BUS-UAC-02", "RB-8831-UAC", 50, BusStatusEnum.OPERATIONAL, driver_user.user_id),
            ("BUS-UAC-03", "RB-1209-UAC", 30, BusStatusEnum.MAINTENANCE, None),
        ]
        buses_map = {}
        for code, immat, cap, st_bus, drv_id in buses_data:
            b = (await db.execute(select(Buses).where(Buses.bus_code == code))).scalars().first()
            if not b:
                b = Buses(
                    bus_code=code,
                    immatriculation_number=immat,
                    max_capacity=cap,
                    status=st_bus,
                    current_driver_id=drv_id
                )
                db.add(b)
                await db.flush()
                print(f"   🚌 Bus ajouté : {code} [{immat}] (Capacité: {cap} places)")
            buses_map[code] = b

        # ----------------------------------------------------------------------
        # TRAJETS PROGRAMMÉS (TRIPS)
        # ----------------------------------------------------------------------
        print("\n🗓️ 7. Programmation des Trajets (Trips)...")
        route_a = routes_map["Campus Express (Ligne A)"]
        route_b = routes_map["Navette Inter-Facultés (Ligne B)"]
        route_c = routes_map["Ligne Calavi - Porto-Novo"]
        route_d = routes_map["Ligne Express Akpakpa"]
        bus_1 = buses_map["BUS-UAC-01"]
        bus_2 = buses_map["BUS-UAC-02"]
        bus_3 = buses_map["BUS-UAC-03"]

        # Trip 1 (Ligne A - 07:30 Rotation Matin - 32/50 places)
        trip_1 = (await db.execute(
            select(Trips).where(Trips.trip_id == uuid.UUID("7a6ad347-c0fb-472d-80c7-7830ed61cdad"))
        )).scalars().first()

        if not trip_1:
            trip_1 = Trips(
                trip_id=uuid.UUID("7a6ad347-c0fb-472d-80c7-7830ed61cdad"),
                route_id=route_a.route_id,
                bus_id=bus_1.bus_id,
                driver_id=driver_user.user_id,
                departure_time=now + timedelta(hours=1),
                estimated_arrival_time=now + timedelta(hours=1, minutes=35),
                status=TripStatusEnum.SCHEDULED,
                total_seats=50,
                available_seats=32,
                delay_minutes=0,
                delay_reason=None
            )
            db.add(trip_1)
            await db.flush()
            print(f"   🗓️ Trajet 1 créé : 07:30 - Rotation Matin (32/50 places disponibles)")
        else:
            trip_1.departure_time = now + timedelta(hours=1)
            trip_1.estimated_arrival_time = now + timedelta(hours=1, minutes=35)
            trip_1.status = TripStatusEnum.SCHEDULED
            trip_1.available_seats = 32

        # Trip 2 (Ligne B - 08:15 Rotation Express - 0/50 places COMPLET)
        trip_2 = (await db.execute(
            select(Trips).where(Trips.trip_id == uuid.UUID("2a953d78-5279-4342-8d66-2a6e8b0a0a87"))
        )).scalars().first()

        if not trip_2:
            trip_2 = Trips(
                trip_id=uuid.UUID("2a953d78-5279-4342-8d66-2a6e8b0a0a87"),
                route_id=route_b.route_id,
                bus_id=bus_2.bus_id,
                driver_id=driver_user.user_id,
                departure_time=now + timedelta(hours=2),
                estimated_arrival_time=now + timedelta(hours=2, minutes=20),
                status=TripStatusEnum.SCHEDULED,
                total_seats=50,
                available_seats=0, # Complet
                delay_minutes=0,
                delay_reason=None
            )
            db.add(trip_2)
            await db.flush()
            print(f"   🗓️ Trajet 2 créé : 08:15 - Rotation Express (0/50 places - COMPLET)")
        else:
            trip_2.departure_time = now + timedelta(hours=2)
            trip_2.estimated_arrival_time = now + timedelta(hours=2, minutes=20)
            trip_2.status = TripStatusEnum.SCHEDULED
            trip_2.available_seats = 0

        # Trip 3 (Ligne A - 09:00 Rotation Campus - 18/50 places)
        trip_3 = (await db.execute(
            select(Trips).where(Trips.trip_id == uuid.UUID("3c81e9b2-6541-487a-bfa1-7f912c018a99"))
        )).scalars().first()

        if not trip_3:
            trip_3 = Trips(
                trip_id=uuid.UUID("3c81e9b2-6541-487a-bfa1-7f912c018a99"),
                route_id=route_a.route_id,
                bus_id=bus_1.bus_id,
                driver_id=driver_user.user_id,
                departure_time=now + timedelta(hours=3),
                estimated_arrival_time=now + timedelta(hours=3, minutes=35),
                status=TripStatusEnum.SCHEDULED,
                total_seats=50,
                available_seats=18,
                delay_minutes=0,
                delay_reason=None
            )
            db.add(trip_3)
            await db.flush()
            print(f"   🗓️ Trajet 3 créé : 09:00 - Rotation Campus (18/50 places disponibles)")
        else:
            trip_3.departure_time = now + timedelta(hours=3)
            trip_3.estimated_arrival_time = now + timedelta(hours=3, minutes=35)
            trip_3.status = TripStatusEnum.SCHEDULED
            trip_3.available_seats = 18

        # Trip 4 (Ligne C - 12:30 Rotation Midi - 10/50 places)
        trip_4 = (await db.execute(
            select(Trips).where(Trips.trip_id == uuid.UUID("4d92fa13-7652-498b-cfb2-8a023d129b00"))
        )).scalars().first()

        if not trip_4:
            trip_4 = Trips(
                trip_id=uuid.UUID("4d92fa13-7652-498b-cfb2-8a023d129b00"),
                route_id=route_c.route_id,
                bus_id=bus_3.bus_id,
                driver_id=driver_user.user_id,
                departure_time=now + timedelta(hours=5),
                estimated_arrival_time=now + timedelta(hours=6),
                status=TripStatusEnum.SCHEDULED,
                total_seats=50,
                available_seats=10,
                delay_minutes=0,
                delay_reason=None
            )
            db.add(trip_4)
            await db.flush()
            print(f"   🗓️ Trajet 4 créé : 12:30 - Rotation Midi (10/50 places disponibles)")
        else:
            trip_4.departure_time = now + timedelta(hours=5)
            trip_4.estimated_arrival_time = now + timedelta(hours=6)
            trip_4.status = TripStatusEnum.SCHEDULED
            trip_4.available_seats = 10

        # ----------------------------------------------------------------------
        # PAIEMENTS ET TICKETS ACTIFS (TICKETS & QR CODES)
        # ----------------------------------------------------------------------
        print("\n🎫 8. Émission des Billets Numériques de Démonstration...")
        student_koffi = users_map["+2290197001122"]
        student_sena = users_map["+2290195443322"]

        # Ticket 1 Koffi
        tk_koffi_1 = (await db.execute(
            select(Tickets).where(Tickets.sms_backup_code == "A7B9X2M4")
        )).scalars().first()

        if not tk_koffi_1:
            pay_koffi_1 = Payments(
                user_id=student_koffi.user_id,
                transaction_reference=f"PAY-FEDAPAY-{uuid.uuid4().hex[:6].upper()}",
                gateway=PaymentGatewayEnum.FEDAPAY,
                amount=100.00,
                phone_number=student_koffi.phone_number,
                status=PaymentStatusEnum.SUCCESSFUL
            )
            db.add(pay_koffi_1)
            await db.flush()

            tk_koffi_1 = Tickets(
                user_id=student_koffi.user_id,
                trip_id=trip_1.trip_id,
                payment_id=pay_koffi_1.payment_id,
                qr_code_token="EPASS-UAC-TICKET-A7B9X2M4",
                sms_backup_code="A7B9X2M4",
                status=TicketStatusEnum.ISSUED,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_koffi_1)
            await db.flush()
            print(f"   🎫 Ticket #1 généré pour Koffi Alain | Code: A7B9-X2M4")
        else:
            tk_koffi_1.user_id = student_koffi.user_id
            tk_koffi_1.trip_id = trip_1.trip_id
            tk_koffi_1.status = TicketStatusEnum.ISSUED
            tk_koffi_1.initial_expiration_date = trip_1.departure_time
            tk_koffi_1.final_expiration_date = trip_1.departure_time + timedelta(days=6)
            print(f"   🎫 Ticket #1 actualisé pour Koffi Alain | Code: A7B9-X2M4")

        # Ticket 2 Koffi
        tk_koffi_2 = (await db.execute(
            select(Tickets).where(Tickets.sms_backup_code == "A7B9K8N5")
        )).scalars().first()

        if not tk_koffi_2:
            pay_koffi_2 = Payments(
                user_id=student_koffi.user_id,
                transaction_reference=f"PAY-FEDAPAY-{uuid.uuid4().hex[:6].upper()}",
                gateway=PaymentGatewayEnum.FEDAPAY,
                amount=100.00,
                phone_number=student_koffi.phone_number,
                status=PaymentStatusEnum.SUCCESSFUL
            )
            db.add(pay_koffi_2)
            await db.flush()

            tk_koffi_2 = Tickets(
                user_id=student_koffi.user_id,
                trip_id=trip_1.trip_id,
                payment_id=pay_koffi_2.payment_id,
                qr_code_token="EPASS-UAC-TICKET-A7B9K8N5",
                sms_backup_code="A7B9K8N5",
                status=TicketStatusEnum.ISSUED,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_koffi_2)
            await db.flush()
            print(f"   🎫 Ticket #2 généré pour Koffi Alain | Code: A7B9-K8N5")
        else:
            tk_koffi_2.user_id = student_koffi.user_id
            tk_koffi_2.trip_id = trip_1.trip_id
            tk_koffi_2.status = TicketStatusEnum.ISSUED
            tk_koffi_2.initial_expiration_date = trip_1.departure_time
            tk_koffi_2.final_expiration_date = trip_1.departure_time + timedelta(days=6)
            print(f"   🎫 Ticket #2 actualisé pour Koffi Alain | Code: A7B9-K8N5")

        tk_sena = (await db.execute(
            select(Tickets).where(Tickets.user_id == student_sena.user_id)
        )).scalars().first()

        if not tk_sena:
            pay_sena = Payments(
                user_id=student_sena.user_id,
                transaction_reference=f"PAY-KKIAPAY-{uuid.uuid4().hex[:6].upper()}",
                gateway=PaymentGatewayEnum.KKIAPAY,
                amount=100.00,
                phone_number=student_sena.phone_number,
                status=PaymentStatusEnum.SUCCESSFUL
            )
            db.add(pay_sena)
            await db.flush()

            tk_sena = Tickets(
                user_id=student_sena.user_id,
                trip_id=trip_1.trip_id,
                payment_id=pay_sena.payment_id,
                qr_code_token="EPASS-UAC-TICKET-B8C2D9E1",
                sms_backup_code="B8C2D9E1",
                status=TicketStatusEnum.VALIDATED,
                validated_at=now,
                validated_by_driver_id=driver_user.user_id,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_sena)
            await db.flush()
            print(f"   🎫 Ticket Déjà Validé généré pour Sena Dossou | Code SMS: B8C2-D9E1")

        # Ticket Aminata Sylla
        student_aminata = users_map["+2290161229988"]
        tk_aminata = (await db.execute(
            select(Tickets).where(Tickets.user_id == student_aminata.user_id)
        )).scalars().first()

        if not tk_aminata:
            pay_aminata = Payments(
                user_id=student_aminata.user_id,
                transaction_reference=f"PAY-FEDAPAY-{uuid.uuid4().hex[:6].upper()}",
                gateway=PaymentGatewayEnum.FEDAPAY,
                amount=100.00,
                phone_number=student_aminata.phone_number,
                status=PaymentStatusEnum.SUCCESSFUL
            )
            db.add(pay_aminata)
            await db.flush()

            tk_aminata = Tickets(
                user_id=student_aminata.user_id,
                trip_id=trip_1.trip_id,
                payment_id=pay_aminata.payment_id,
                qr_code_token="EPASS-UP-TICKET-C3D4E5F6",
                sms_backup_code="C3D4E5F6",
                status=TicketStatusEnum.ISSUED,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_aminata)
            await db.flush()
            print(f"   🎫 Ticket Actif généré pour Aminata Sylla | Code SMS: C3D4-E5F6")

        # Ticket Marius Adjovi
        student_marius = users_map["+2290166123456"]
        tk_marius = (await db.execute(
            select(Tickets).where(Tickets.user_id == student_marius.user_id)
        )).scalars().first()

        if not tk_marius:
            pay_marius = Payments(
                user_id=student_marius.user_id,
                transaction_reference=f"PAY-FEDAPAY-{uuid.uuid4().hex[:6].upper()}",
                gateway=PaymentGatewayEnum.FEDAPAY,
                amount=100.00,
                phone_number=student_marius.phone_number,
                status=PaymentStatusEnum.SUCCESSFUL
            )
            db.add(pay_marius)
            await db.flush()

            tk_marius = Tickets(
                user_id=student_marius.user_id,
                trip_id=trip_1.trip_id,
                payment_id=pay_marius.payment_id,
                qr_code_token="EPASS-UNA-TICKET-D7E8F9A0",
                sms_backup_code="D7E8F9A0",
                status=TicketStatusEnum.VALIDATED,
                validated_at=now,
                validated_by_driver_id=driver_user.user_id,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_marius)
            await db.flush()
            print(f"   🎫 Ticket Validé généré pour Marius Adjovi | Code SMS: D7E8-F9A0")

        # ----------------------------------------------------------------------
        # LOG GPS EN TEMPS RÉEL (GPS LOGS)
        # ----------------------------------------------------------------------
        print("\n📡 9. Enregistrement de la Télémétrie GPS Initiale...")
        gps_seeds = [
            (trip_1.trip_id, bus_1.bus_id, "SRID=4326;POINT(2.3557 6.4474)", 38.5, 145.0, "Bus #402 (Ligne A)"),
            (trip_2.trip_id, bus_2.bus_id, "SRID=4326;POINT(2.3480 6.4250)", 42.0, 180.0, "Bus #883 (Ligne B)"),
            (trip_3.trip_id, bus_1.bus_id, "SRID=4326;POINT(2.3500 6.4320)", 35.0, 160.0, "Bus #402 (Ligne A)"),
            (trip_4.trip_id, bus_3.bus_id, "SRID=4326;POINT(2.4500 6.4600)", 45.0, 90.0, "Bus #120 (Ligne Porto-Novo)"),
        ]
        for t_id, b_id, pos, spd, brg, lbl in gps_seeds:
            g_log = (await db.execute(select(GpsLogs).where(GpsLogs.trip_id == t_id))).scalars().first()
            if not g_log:
                g_log = GpsLogs(
                    trip_id=t_id,
                    bus_id=b_id,
                    position=pos,
                    speed_kmh=spd,
                    bearing_degrees=brg,
                    recorded_at=now
                )
                db.add(g_log)
                await db.flush()
                print(f"   📡 Position GPS enregistrée pour {lbl} (Vitesse: {spd} km/h)")

        # ----------------------------------------------------------------------
        # DOCUMENTS KYC (KYC DOCUMENTS)
        # ----------------------------------------------------------------------
        print("\n📄 10. Enregistrement des Justificatifs KYC...")
        admin_user = users_map["+22997000000"]
        driver_user = users_map["+22997000001"]
        controller_user = users_map["+22997000002"]
        kyc_entries = [
            (student_koffi.user_id, DocumentTypeEnum.STUDENT_CARD, "/uploads/kyc/koffi_carte_etudiant.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (student_koffi.user_id, DocumentTypeEnum.CIP_IDENTITY, "/uploads/kyc/koffi_cip.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (student_sena.user_id, DocumentTypeEnum.STUDENT_CARD, "/uploads/kyc/sena_carte_etudiant.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (student_marius.user_id, DocumentTypeEnum.STUDENT_CARD, "/uploads/kyc/marius_carte_etudiant.jpg", KycStatusEnum.PENDING, None, None, "2024-2025"),
            (driver_user.user_id, DocumentTypeEnum.DRIVER_LICENSE, "/uploads/kyc/driver_permis_d.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (driver_user.user_id, DocumentTypeEnum.MEDICAL_CERTIFICATE, "/uploads/kyc/driver_certificat_medical.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (driver_user.user_id, DocumentTypeEnum.CIP_IDENTITY, "/uploads/kyc/driver_cip.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (controller_user.user_id, DocumentTypeEnum.CONTROLLER_BADGE, "/uploads/kyc/controller_badge.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
            (controller_user.user_id, DocumentTypeEnum.CIP_IDENTITY, "/uploads/kyc/controller_cip.jpg", KycStatusEnum.APPROVED, admin_user.user_id, now, "2024-2025"),
        ]
        for u_id, dtype, durl, vstatus, vby, vat, ayear in kyc_entries:
            doc_existing = (await db.execute(
                select(KycDocuments).where(KycDocuments.user_id == u_id, KycDocuments.document_type == dtype)
            )).scalars().first()
            if not doc_existing:
                doc_obj = KycDocuments(
                    user_id=u_id,
                    document_type=dtype,
                    document_url=durl,
                    verification_status=vstatus,
                    validated_by=vby,
                    validated_at=vat,
                    academic_year=ayear
                )
                db.add(doc_obj)
                await db.flush()
                print(f"   📄 Document KYC enregistré : {dtype.value} pour {u_id}")

        # ----------------------------------------------------------------------
        # NOTIFICATIONS UTILISATEURS (NOTIFICATIONS)
        # ----------------------------------------------------------------------
        print("\n🔔 11. Création des Notifications Utilisateurs...")
        notifs_data = [
            (
                student_koffi.user_id,
                tk_koffi_1.ticket_id,
                "Dossier KYC Validé",
                "Félicitations ! Vos pièces justificatives ont été vérifiées par l'administration du campus. Vous bénéficiez du tarif subventionné à 100 FCFA.",
                "KYC",
                "success",
                False,
                "PUSH",
                True,
                now - timedelta(minutes=10)
            ),
            (
                student_koffi.user_id,
                None,
                "Trafic Fluide - Ligne Campus Express",
                "Les bus circulent normalement sur l'axe Campus Abomey-Calavi ↔ Étoile Rouge Cotonou.",
                "TRAFFIC",
                "info",
                False,
                "PUSH",
                True,
                now - timedelta(hours=1)
            ),
            (
                student_koffi.user_id,
                tk_koffi_1.ticket_id,
                "Achat de Pass Campus Validé",
                "Votre ticket A7B9-X2M4 a été débité de votre compte MTN MoMo (100 FCFA).",
                "PAYMENT",
                "success",
                True,
                "PUSH",
                True,
                now - timedelta(hours=18)
            ),
            (
                student_koffi.user_id,
                None,
                "Horaires de Soirée Renforcés",
                "Des rotations supplémentaires sont assurées jusqu'à 21h30 du lundi au vendredi sur le réseau de transport.",
                "GENERAL",
                "info",
                True,
                "PUSH",
                True,
                now - timedelta(days=2)
            ),
            (
                student_marius.user_id,
                None,
                "Dossier KYC en cours d'examen",
                "Vos justificatifs académiques ont bien été reçus et sont en cours de vérification par les équipes académiques.",
                "KYC",
                "warning",
                False,
                "PUSH",
                True,
                now - timedelta(minutes=30)
            ),
            (
                driver_user.user_id,
                None,
                "Alerte Trafic : Embouteillage Carrefour Vedoko",
                "Ralentissement signalé entre Carrefour Vêdoko et Étoile Rouge. Retard estimé à +15 minutes.",
                "TRAFFIC",
                "warning",
                False,
                "PUSH",
                True,
                now - timedelta(minutes=25)
            ),
            (
                driver_user.user_id,
                None,
                "Contrôle Technique : Navette BUS-UAC-01",
                "Pression des pneus et niveau de carburant vérifiés ce matin par les équipes de maintenance du campus.",
                "GENERAL",
                "info",
                False,
                "PUSH",
                True,
                now - timedelta(hours=2)
            ),
            (
                driver_user.user_id,
                None,
                "Rotation Campus Express Active",
                "Votre service sur la Ligne A est programmé. Départs réguliers assurés toute la journée.",
                "TRAFFIC",
                "info",
                False,
                "PUSH",
                True,
                now - timedelta(hours=4)
            )
        ]

        for u_id, tk_id, title, msg, cat, tone, is_r, chan, is_s, sched in notifs_data:
            notif_existing = (await db.execute(
                select(Notifications).where(Notifications.user_id == u_id, Notifications.title == title)
            )).scalars().first()
            if not notif_existing:
                notif_obj = Notifications(
                    user_id=u_id,
                    ticket_id=tk_id,
                    title=title,
                    message=msg,
                    category=cat,
                    tone=tone,
                    read=is_r,
                    channel=chan,
                    is_sent=is_s,
                    scheduled_for=sched,
                    sent_at=sched if is_s else None
                )
                db.add(notif_obj)
                await db.flush()
                print(f"   🔔 Notification enregistrée : '{title}' [{cat}] pour {u_id}")

        # ----------------------------------------------------------------------
        # PORTEFEUILLES ÉTUDIANTS & COMPTES PAIEMENTS (WALLETS & PAYMENT METHODS)
        # ----------------------------------------------------------------------
        print("\n💳 12. Création des Portefeuilles & Comptes Opérateurs Mobile Money...")
        all_students = [student_koffi, student_sena, student_aminata, student_marius]

        for s in all_students:
            # Wallet
            w_existing = (await db.execute(
                select(Wallets).where(Wallets.user_id == s.user_id)
            )).scalars().first()
            if not w_existing:
                w_obj = Wallets(
                    user_id=s.user_id,
                    balance=2300.00 if s == student_koffi else 1500.00,
                    currency="FCFA"
                )
                db.add(w_obj)
                await db.flush()
                print(f"   💰 Portefeuille créé pour {s.first_name} {s.last_name} (Solde: {w_obj.balance} FCFA)")
            else:
                w_existing.balance = 2300.00 if s == student_koffi else 1500.00
                print(f"   💰 Portefeuille actualisé pour {s.first_name} {s.last_name} (Solde: {w_existing.balance} FCFA)")

            # Mobile Money Methods
            pm_mtn_existing = (await db.execute(
                select(UserPaymentMethods).where(UserPaymentMethods.user_id == s.user_id, UserPaymentMethods.provider_type == "MTN_MOMO")
            )).scalars().first()
            if not pm_mtn_existing:
                pm_mtn = UserPaymentMethods(
                    user_id=s.user_id,
                    provider_type="MTN_MOMO",
                    account_number=s.phone_number,
                    account_label="MTN Mobile Money",
                    is_default=True
                )
                pm_moov = UserPaymentMethods(
                    user_id=s.user_id,
                    provider_type="MOOV_MONEY",
                    account_number="+2290195443322",
                    account_label="Moov Money Flooz",
                    is_default=False
                )
                pm_celtiis = UserPaymentMethods(
                    user_id=s.user_id,
                    provider_type="CELTIIS_CASH",
                    account_number="+2290161229988",
                    account_label="Celtiis Cash Bénin",
                    is_default=False
                )
                db.add_all([pm_mtn, pm_moov, pm_celtiis])
                await db.flush()
                print(f"   📱 Comptes Mobile Money créés pour {s.first_name} {s.last_name} (MTN, Moov, Celtiis)")

        # ----------------------------------------------------------------------
        # TYPES D'INFRACTIONS & PROCÈS-VERBAUX (INFRACTIONS & FRAUD REPORTS)
        # ----------------------------------------------------------------------
        print("\n🚨 13. Enregistrement des Types d'Infractions & Procès-Verbaux...")
        controller_user = users_map["+2290197000002"]
        infractions_catalog = [
            {
                "key": "NO_TICKET",
                "label": "Absence totale de titre de transport",
                "icon": "money-off",
                "severity": "HIGH",
                "penalty_amount": 500.0,
                "description": "Passager voyageant à bord sans aucun titre valide ou non composté."
            },
            {
                "key": "REUSED_TICKET",
                "label": "Tentative de réutilisation d’un billet expiré",
                "icon": "replay",
                "severity": "MEDIUM",
                "penalty_amount": 300.0,
                "description": "Présentation d'un titre de transport ayant déjà dépassé son délai ou sa limite d'utilisation."
            },
            {
                "key": "IDENTITY_MISMATCH",
                "label": "Usurpation d’identité / Mauvais matricule",
                "icon": "person-outline",
                "severity": "HIGH",
                "penalty_amount": 1000.0,
                "description": "Non-concordance entre la carte d'étudiant / CIP et le titulaire du billet."
            },
            {
                "key": "REFUSAL",
                "label": "Refus d'obtempérer ou comportement inapproprié",
                "icon": "warning",
                "severity": "CRITICAL",
                "penalty_amount": 2000.0,
                "description": "Obstruction au travail des agents assermentés de contrôle ou trouble à l'ordre à bord."
            },
            {
                "key": "FORGERY",
                "label": "Faux titre / Capture d'écran contrefaite",
                "icon": "phonelink-erase",
                "severity": "CRITICAL",
                "penalty_amount": 5000.0,
                "description": "Utilisation frauduleuse d'une capture d'écran, QR code falsifié ou titre contrefait."
            }
        ]

        for item in infractions_catalog:
            existing_inf = (await db.execute(select(InfractionTypes).where(InfractionTypes.key == item["key"]))).scalars().first()
            if not existing_inf:
                new_inf = InfractionTypes(
                    infraction_id=uuid.uuid4(),
                    key=item["key"],
                    label=item["label"],
                    icon=item["icon"],
                    severity=item["severity"],
                    penalty_amount=item["penalty_amount"],
                    description=item["description"],
                    is_active=True
                )
                db.add(new_inf)
                await db.flush()
                print(f"   🚨 Type d'infraction créé : {item['key']} - {item['label']} (Amende: {item['penalty_amount']} FCFA)")

        # Procès-verbal de démonstration
        pv_sample = (await db.execute(select(FraudReports).where(FraudReports.pv_code == "PV-2024-001"))).scalars().first()
        if not pv_sample and controller_user:
            pv_sample = FraudReports(
                report_id=uuid.uuid4(),
                pv_code="PV-2024-001",
                controller_id=controller_user.user_id,
                trip_id=trip_1.trip_id if 'trip_1' in locals() else None,
                student_identifier="Usager Non Enrôlé (Porto-Novo)",
                infraction_type_key="NO_TICKET",
                penalty_amount=500.0,
                description="Passager monté à l'arrêt Carrefour IITA sans titre de transport. Refus initial de paiement avant régularisation.",
                status="TRANSMITTED"
            )
            db.add(pv_sample)
            await db.flush()
            print(f"   📋 Procès-verbal de démonstration créé : PV-2024-001")

        await db.commit()

    print("\n" + "=" * 80)
    print("✨ SEEDING TERMINÉ AVEC SUCCÈS ! TOUTES LES DONNÉES SONT DISPONIBLES.")
    print("=" * 80)
    print("\n📋 IDENTIFIANTS DE TEST PRÊTS À L'EMPLOI :")
    print("-" * 80)
    print("  Rôle           | Téléphone          | Mot de Passe     | Nom / Statut")
    print("-" * 80)
    print("  SUPERADMIN     | +2290190000000     | SuperAdmin1234   | Super Admin National")
    print("  ADMIN_CAMPUS   | +2290197000000     | Admin1234        | Directeur Campus")
    print("  DRIVER         | +2290197000001     | Driver1234       | Chauffeur Principal")
    print("  CONTROLLER     | +2290197000002     | Controller1234   | Contrôleur Principal")
    print("  STUDENT (1)    | +2290197001122     | Student1234      | Koffi Alain (Ticket Actif A7B9-X2M4)")
    print("  STUDENT (2)    | +2290195443322     | Student1234      | Sena Dossou (Ticket Validé)")
    print("  STUDENT (3)    | +2290161229988     | Student1234      | Aminata Sylla (KYC Approuvé)")
    print("  STUDENT (4)    | +2290166123456     | Student1234      | Marius Adjovi (KYC En attente)")
    print("-" * 80)
    print("🌐 Swagger API Docs : http://localhost:8001/docs")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_seed())


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
from app.models.fleet_model import Buses, Stops, Routes, BusStatusEnum
from app.models.trip_model import Trips, TripStatusEnum, GpsLogs
from app.models.payment_model import Payments, PaymentStatusEnum, PaymentGatewayEnum
from app.models.ticket_model import Tickets, TicketStatusEnum


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

        print("🔨 2. Création des tables SQLAlchemy...")
        await conn.run_sync(Base.metadata.create_all)
        print("   ✅ Schéma de tables synchronisé.")

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        print("\n👥 3. Création des comptes utilisateurs & rôles...")

        # ----------------------------------------------------------------------
        # COMPTES UTILISATEURS (RBAC)
        # ----------------------------------------------------------------------
        users_to_seed = [
            {
                "matricule_uac": "SUP-2024-001",
                "phone_number": "+22990000000",
                "first_name": "Super",
                "last_name": "Admin",
                "password": "SuperAdmin1234",
                "role": UserRoleEnum.SUPERADMIN,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "ADM-2024-001",
                "phone_number": "+22997000000",
                "first_name": "Directeur",
                "last_name": "CROUS",
                "password": "Admin1234",
                "role": UserRoleEnum.ADMIN_CROUS,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "DRV-2024-001",
                "phone_number": "+22997000001",
                "first_name": "Chauffeur",
                "last_name": "CROUS",
                "password": "Driver1234",
                "role": UserRoleEnum.DRIVER,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "CTR-2024-001",
                "phone_number": "+22997000002",
                "first_name": "Contrôleur",
                "last_name": "CROUS",
                "password": "Controller1234",
                "role": UserRoleEnum.CONTROLLER,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "UAC-2022-8492",
                "phone_number": "+22997001122",
                "first_name": "Koffi",
                "last_name": "Alain",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "UAC-2021-3310",
                "phone_number": "+22995443322",
                "first_name": "Sena",
                "last_name": "Dossou",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "UAC-2023-1102",
                "phone_number": "+22961229988",
                "first_name": "Aminata",
                "last_name": "Sylla",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.APPROVED,
            },
            {
                "matricule_uac": "UAC-2020-5521",
                "phone_number": "+22966123456",
                "first_name": "Marius",
                "last_name": "Adjovi",
                "password": "Student1234",
                "role": UserRoleEnum.STUDENT,
                "kyc_status": KycStatusEnum.PENDING,
            },
        ]

        users_map = {}
        for u_data in users_to_seed:
            existing = (
                await db.execute(select(Users).where(Users.phone_number == u_data["phone_number"]))
            ).scalars().first()

            if not existing:
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
                    is_active=True
                )
                db.add(user_obj)
                await db.flush()
                users_map[u_data["phone_number"]] = user_obj
                print(f"   👤 Créé : {u_data['role'].value.ljust(12)} | {u_data['phone_number']} | {u_data['first_name']} {u_data['last_name']}")
            else:
                existing.password_hash = hash_password(u_data["password"])
                existing.is_active = True
                existing.kyc_status = u_data["kyc_status"]
                users_map[u_data["phone_number"]] = existing
                print(f"   ℹ️ Mis à jour : {existing.role.value.ljust(12)} | {existing.phone_number} | {existing.first_name} {existing.last_name}")

        # ----------------------------------------------------------------------
        # ARRÊTS SPATIAUX POSTGIS (STOPS)
        # ----------------------------------------------------------------------
        print("\n📍 4. Création des Arrêts PostGIS...")
        stops_data = [
            ("Calavi Campus", 6.4474, 2.3557),
            ("Science Block", 6.4420, 2.3600),
            ("Godomey", 6.4000, 2.3400),
            ("Cotonou Centre", 6.3703, 2.4174),
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
                "name": "Campus Express Route 4",
                "origin": "Calavi Campus",
                "destination": "Cotonou Centre",
                "price": 250.00,
                "duration": 35
            },
            {
                "name": "Navette Inter-Facultés",
                "origin": "Calavi Campus",
                "destination": "Science Block",
                "price": 100.00,
                "duration": 10
            },
            {
                "name": "Ligne Calavi - Porto-Novo",
                "origin": "Calavi Campus",
                "destination": "Porto-Novo Gare",
                "price": 500.00,
                "duration": 60
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
        main_route = routes_map["Campus Express Route 4"]
        bus_1 = buses_map["BUS-UAC-01"]
        bus_2 = buses_map["BUS-UAC-02"]

        trip_1 = (await db.execute(
            select(Trips).where(Trips.route_id == main_route.route_id, Trips.bus_id == bus_1.bus_id)
        )).scalars().first()

        if not trip_1:
            trip_1 = Trips(
                route_id=main_route.route_id,
                bus_id=bus_1.bus_id,
                driver_id=driver_user.user_id,
                departure_time=now + timedelta(hours=1),
                estimated_arrival_time=now + timedelta(hours=1, minutes=35),
                status=TripStatusEnum.SCHEDULED,
                total_seats=50,
                available_seats=32,
                delay_minutes=15,
                delay_reason="Due to heavy traffic near the central campus roundabout."
            )
            db.add(trip_1)
            await db.flush()
            print(f"   🗓️ Trajet 1 créé : Départ dans 1h (32/50 places disponibles, retard +15 min)")

        trip_2 = (await db.execute(
            select(Trips).where(Trips.route_id == main_route.route_id, Trips.bus_id == bus_2.bus_id)
        )).scalars().first()

        if not trip_2:
            trip_2 = Trips(
                route_id=main_route.route_id,
                bus_id=bus_2.bus_id,
                driver_id=driver_user.user_id,
                departure_time=now + timedelta(hours=2),
                estimated_arrival_time=now + timedelta(hours=2, minutes=35),
                status=TripStatusEnum.SCHEDULED,
                total_seats=50,
                available_seats=0, # Complet
                delay_minutes=0,
                delay_reason=None
            )
            db.add(trip_2)
            await db.flush()
            print(f"   🗓️ Trajet 2 créé : Départ dans 2h (0/50 places - COMPLET)")

        # ----------------------------------------------------------------------
        # PAIEMENTS ET TICKETS ACTIFS (TICKETS & QR CODES)
        # ----------------------------------------------------------------------
        print("\n🎫 8. Émission des Billets Numériques de Démonstration...")
        student_koffi = users_map["+22997001122"]
        student_sena = users_map["+22995443322"]

        # Ticket 1 Koffi
        tk_koffi_1 = (await db.execute(
            select(Tickets).where(Tickets.user_id == student_koffi.user_id, Tickets.sms_backup_code == "A7B9X2M4")
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
                qr_code_token="CROUS-UAC-TICKET-A7B9X2M4",
                sms_backup_code="A7B9X2M4",
                status=TicketStatusEnum.ISSUED,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_koffi_1)
            await db.flush()
            print(f"   🎫 Ticket #1 généré pour Koffi Alain | Code: A7B9-X2M4")

        # Ticket 2 Koffi
        tk_koffi_2 = (await db.execute(
            select(Tickets).where(Tickets.user_id == student_koffi.user_id, Tickets.sms_backup_code == "A7B9K8N5")
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
                qr_code_token="CROUS-UAC-TICKET-A7B9K8N5",
                sms_backup_code="A7B9K8N5",
                status=TicketStatusEnum.ISSUED,
                recycle_count=0,
                initial_expiration_date=trip_1.departure_time,
                final_expiration_date=trip_1.departure_time + timedelta(days=6)
            )
            db.add(tk_koffi_2)
            await db.flush()
            print(f"   🎫 Ticket #2 généré pour Koffi Alain | Code: A7B9-K8N5")

        tk_sena = (await db.execute(
            select(Tickets).where(Tickets.user_id == student_sena.user_id)
        )).scalars().first()

        if not tk_sena:
            pay_sena = Payments(
                user_id=student_sena.user_id,
                transaction_reference=f"PAY-KKIAPAY-{uuid.uuid4().hex[:6].upper()}",
                gateway=PaymentGatewayEnum.KKIAPAY,
                amount=250.00,
                phone_number=student_sena.phone_number,
                status=PaymentStatusEnum.SUCCESSFUL
            )
            db.add(pay_sena)
            await db.flush()

            tk_sena = Tickets(
                user_id=student_sena.user_id,
                trip_id=trip_1.trip_id,
                payment_id=pay_sena.payment_id,
                qr_code_token="CROUS-UAC-TICKET-B8C2D9E1",
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

        # ----------------------------------------------------------------------
        # LOG GPS EN TEMPS RÉEL (GPS LOGS)
        # ----------------------------------------------------------------------
        print("\n📡 9. Enregistrement de la Télémétrie GPS Initiale...")
        gps_log = (await db.execute(
            select(GpsLogs).where(GpsLogs.trip_id == trip_1.trip_id)
        )).scalars().first()

        if not gps_log:
            gps_log = GpsLogs(
                trip_id=trip_1.trip_id,
                bus_id=bus_1.bus_id,
                position="SRID=4326;POINT(2.3557 6.4474)",
                speed_kmh=38.5,
                bearing_degrees=145.0,
                recorded_at=now
            )
            db.add(gps_log)
            await db.flush()
            print("   📡 Position GPS enregistrée pour Bus #402 (Lat: 6.4474, Lon: 2.3557, Vitesse: 38.5 km/h)")

        await db.commit()

    print("\n" + "=" * 80)
    print("✨ SEEDING TERMINÉ AVEC SUCCÈS ! TOUTES LES DONNÉES SONT DISPONIBLES.")
    print("=" * 80)
    print("\n📋 IDENTIFIANTS DE TEST PRÊTS À L'EMPLOI :")
    print("-" * 80)
    print("  Rôle           | Téléphone       | Mot de Passe     | Nom / Statut")
    print("-" * 80)
    print("  SUPERADMIN     | +22990000000    | SuperAdmin1234   | Super Admin")
    print("  ADMIN_CROUS    | +22997000000    | Admin1234        | Directeur CROUS")
    print("  DRIVER         | +22997000001    | Driver1234       | Chauffeur CROUS")
    print("  CONTROLLER     | +22997000002    | Controller1234   | Contrôleur CROUS")
    print("  STUDENT (1)    | +22997001122    | Student1234      | Koffi Alain (Ticket Actif A7B9-X2M4)")
    print("  STUDENT (2)    | +22995443322    | Student1234      | Sena Dossou (Ticket Validé)")
    print("  STUDENT (3)    | +22961229988    | Student1234      | Aminata Sylla (KYC Approuvé)")
    print("  STUDENT (4)    | +22966123456    | Student1234      | Marius Adjovi (KYC En attente)")
    print("-" * 80)
    print("🌐 Swagger API Docs : http://localhost:8000/docs")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_seed())

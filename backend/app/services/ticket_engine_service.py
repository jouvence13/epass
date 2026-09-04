"""
================================================================================
MODULE : MOTEUR DE GESTION DES TICKETS, RÉSERVATIONS & VALIDATIONS CHAUFFEUR
================================================================================
Ce service gère :
1. La réservation concurrente sécurisée avec verrou SQL strict (SELECT ... FOR UPDATE) pour empêcher toute surréservation.
2. L'émission du pass dual-format (Jeton AES-256 pour QR Code + Code OTP SMS).
3. La validation d'embarquement par le chauffeur (scan optique ou saisie du code SMS).
================================================================================
"""

import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import generate_encrypted_qr_payload, decrypt_qr_payload
from app.models.user_model import Users, KycStatusEnum
from app.models.trip_model import Trips, TripStatusEnum
from app.models.payment_model import Payments, PaymentStatusEnum, PaymentGatewayEnum
from app.models.ticket_model import Tickets, TicketStatusEnum


def generate_secure_sms_otp(length: int = 6) -> str:
    """
    Génère un code OTP aléatoire et hautement sécurisé de 6 caractères alphanumériques
    en majuscules (ex: 'A9K2X8') pour le pass de secours par SMS.
    
    L'utilisation de 'secrets.choice' au lieu de 'random' garantit une source d'aléa
    cryptographiquement sûre.
    """
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def book_trip_with_capacity_lock(
    user: Users,
    trip_id: uuid.UUID,
    gateway: PaymentGatewayEnum,
    phone_number: str,
    db: AsyncSession
) -> Tuple[Payments, Trips]:
    """
    Initialise une réservation de place avec un verrouillage SQL strict (FOR UPDATE).
    
    Étapes :
    1. Vérifie que le compte étudiant a son KYC validé (APPROVED).
    2. Vérifie que le contrôle trimestriel (90 jours) n'est pas expiré.
    3. Pose un verrou exclusif sur la ligne du trajet dans PostgreSQL ('with_for_update()').
    4. Vérifie que le bus dispose d'au moins 1 place libre (available_seats > 0).
    5. Crée l'enregistrement de paiement avec le statut INITIATED.
    """
    # 1. Vérification du statut de conformité KYC de l'étudiant
    if user.kyc_status != KycStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Statut KYC non approuvé ou re-vérification requise pour réserver un ticket."
        )
    
    # 2. Vérification du délai trimestriel (90 jours)
    now = datetime.now(timezone.utc)
    if user.next_kyc_due_date and user.next_kyc_due_date < now:
        user.is_active = False
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte temporairement suspendu : délai de re-vérification KYC 90 jours dépassé."
        )

    # 3. Verrouillage transactionnel au niveau ligne (Row-Level Locking)
    # 'with_for_update()' empêche deux transactions simultanées de réserver la dernière place.
    trip_query = await db.execute(
        select(Trips).where(Trips.trip_id == trip_id).with_for_update()
    )
    trip = trip_query.scalars().first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trajet introuvable."
        )

    # 4. Vérification de l'état du trajet et de la disponibilité des sièges
    if trip.status in [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de réserver : le trajet est '{trip.status.value}'."
        )

    if trip.available_seats <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complet : ce bus a atteint sa capacité nominale stricte (0 place disponible)."
        )

    # 5. Normalisation du numéro de téléphone (Bénin +229)
    raw_phone = phone_number or user.phone_number
    clean_phone = raw_phone.strip().replace(" ", "")
    if len(clean_phone) == 8 and not clean_phone.startswith("+"):
        clean_phone = f"+229{clean_phone}"
    elif len(clean_phone) == 10 and clean_phone.startswith("01"):
        clean_phone = f"+229{clean_phone[2:]}"

    # 6. Création de l'enregistrement de paiement (Prix par défaut : 250 FCFA)
    txn_ref = f"PAY-{uuid.uuid4().hex[:12].upper()}"
    base_price = 250.00
    if hasattr(trip, "route") and trip.route and trip.route.base_price:
        base_price = float(trip.route.base_price)

    payment = Payments(
        user_id=user.user_id,
        transaction_reference=txn_ref,
        gateway=gateway,
        amount=base_price,
        phone_number=clean_phone,
        status=PaymentStatusEnum.INITIATED
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return payment, trip


async def confirm_payment_and_issue_ticket(
    payment_id: uuid.UUID,
    trip_id: uuid.UUID,
    gateway_reference: Optional[str],
    db: AsyncSession
) -> Tickets:
    """
    Exécuté lors de la confirmation du paiement Mobile Money (Webhook FedaPay / KkiaPay).
    1. Décrémente de manière atomique la place disponible dans le bus.
    2. Passe le paiement en SUCCESSFUL.
    3. Calcule la date d'expiration initiale et la date limite de recyclage (J+7).
    4. Génère le jeton chiffré AES-256 pour le QR Code et le code SMS de secours.
    """
    payment = await db.get(Payments, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")

    trip_query = await db.execute(
        select(Trips).where(Trips.trip_id == trip_id).with_for_update()
    )
    trip = trip_query.scalars().first()
    if not trip or trip.available_seats <= 0:
        raise HTTPException(status_code=400, detail="Capacité insuffisante pour finaliser le ticket.")

    # Décrémenter la place disponible
    trip.available_seats -= 1
    payment.status = PaymentStatusEnum.SUCCESSFUL
    payment.gateway_reference = gateway_reference

    # Définition des dates d'expiration :
    # - Expiration initiale : heure de départ du bus
    # - Expiration finale stricte : 7 jours après le départ (délai de recyclage)
    initial_exp = trip.departure_time
    final_exp = trip.departure_time + timedelta(days=7)

    ticket_id = uuid.uuid4()
    qr_token = generate_encrypted_qr_payload(str(ticket_id), str(payment.user_id), str(trip.trip_id))
    sms_otp = generate_secure_sms_otp(6)

    ticket = Tickets(
        ticket_id=ticket_id,
        user_id=payment.user_id,
        trip_id=trip.trip_id,
        payment_id=payment.payment_id,
        qr_code_token=qr_token,
        sms_backup_code=sms_otp,
        status=TicketStatusEnum.ISSUED,
        recycle_count=0,
        initial_expiration_date=initial_exp,
        final_expiration_date=final_exp
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def validate_ticket_by_driver(
    driver: Users,
    trip_id: uuid.UUID,
    scan_mode: str,
    qr_code_token: Optional[str],
    sms_backup_code: Optional[str],
    db: AsyncSession
) -> Tuple[Tickets, Users]:
    """
    Valide le pass de l'étudiant à la montée dans le bus par le chauffeur.
    Gère à la fois le scan QR Code (AES déchiffré) et le code SMS de secours.
    """
    ticket: Optional[Tickets] = None

    if scan_mode == "OPTICAL_QR" and qr_code_token:
        try:
            # Déchiffrement AES-256 du QR Code
            payload = decrypt_qr_payload(qr_code_token)
            t_id = uuid.UUID(payload["ticket_id"])
            ticket = await db.get(Tickets, t_id)
        except Exception:
            # Recherche de repli par chaîne brute
            res = await db.execute(select(Tickets).where(Tickets.qr_code_token == qr_code_token))
            ticket = res.scalars().first()
    elif sms_backup_code:
        # Recherche par code SMS OTP à 6 caractères
        res = await db.execute(
            select(Tickets).where(Tickets.sms_backup_code == sms_backup_code.strip().upper())
        )
        ticket = res.scalars().first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket introuvable ou code invalide.")

    if ticket.trip_id != trip_id:
        raise HTTPException(status_code=400, detail="Ce ticket n'est pas assigné à ce trajet ou bus.")

    if ticket.status == TicketStatusEnum.VALIDATED:
        raise HTTPException(status_code=400, detail="Ticket déjà validé et utilisé.")

    if ticket.status in [TicketStatusEnum.EXPIRED, TicketStatusEnum.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Ticket non valide (Statut actuel : {ticket.status.value}).")

    # Marquer le ticket comme validé
    now = datetime.now(timezone.utc)
    ticket.status = TicketStatusEnum.VALIDATED
    ticket.validated_at = now
    ticket.validated_by_driver_id = driver.user_id

    student = await db.get(Users, ticket.user_id)
    await db.commit()

    return ticket, student

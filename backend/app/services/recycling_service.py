"""
================================================================================
MODULE : MOTEUR DE RECYCLAGE UNIQUE DES TICKETS (DÉLAI STRICT J+7)
================================================================================
Ce service applique les règles métier strictes du recyclage :
1. Un ticket ne peut être recyclé qu'une seule et unique fois (recycle_count < 1).
2. Le recyclage doit impérativement intervenir avant la date limite de 7 jours (J+7).
3. Le bus cible doit avoir au moins une place disponible.
4. L'opération libère atomiquement la place de l'ancien bus et réserve celle du nouveau bus.
5. Un nouveau jeton QR Code chiffré AES-256 et un nouveau code SMS sont réémis.
================================================================================
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import generate_encrypted_qr_payload
from app.services.ticket_engine_service import generate_secure_sms_otp
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.models.trip_model import Trips


async def execute_ticket_recycling(
    ticket_id: uuid.UUID,
    new_trip_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Exécute le recyclage d'un ticket étudiant vers un nouveau départ de bus.
    """
    # 1. Récupération du ticket
    ticket = await db.get(Tickets, ticket_id)

    if not ticket or ticket.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket invalide ou n'appartenant pas à cet étudiant."
        )

    # 2. Vérification de l'état du ticket (un ticket déjà composté ne peut être recyclé)
    if ticket.status == TicketStatusEnum.VALIDATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce ticket a déjà été validé à bord d'un bus."
        )

    # 3. Règle du recyclage unique (maximum 1 fois)
    if ticket.recycle_count >= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limite atteinte : ce ticket a déjà fait l'objet d'un recyclage (1 seul recyclage autorisé)."
        )

    # 4. Règle du délai strict de 7 jours (J+7)
    now = datetime.now(timezone.utc)
    if now > ticket.final_expiration_date:
        ticket.status = TicketStatusEnum.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Délai strict de 7 jours (J+7) dépassé. Ce ticket est définitivement expiré."
        )

    # 5. Verrouillage du nouveau trajet cible (FOR UPDATE) pour éviter la surréservation
    new_trip_query = await db.execute(
        select(Trips).where(Trips.trip_id == new_trip_id).with_for_update()
    )
    new_trip = new_trip_query.scalars().first()

    if not new_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nouveau trajet cible introuvable."
        )

    if new_trip.available_seats <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le bus du nouveau trajet est complet (0 place restante)."
        )

    # 6. Libération d'une place sur l'ancien trajet
    old_trip = await db.get(Trips, ticket.trip_id)
    if old_trip and old_trip.available_seats < old_trip.total_seats:
        old_trip.available_seats += 1

    # 7. Occupation d'une place sur le nouveau trajet
    new_trip.available_seats -= 1

    # 8. Mise à jour du ticket (nouveau trajet, incrément du compteur, nouvelle clé QR AES)
    ticket.trip_id = new_trip.trip_id
    ticket.recycle_count += 1
    ticket.qr_code_token = generate_encrypted_qr_payload(str(ticket.ticket_id), str(user_id), str(new_trip.trip_id))
    ticket.sms_backup_code = generate_secure_sms_otp(6)
    ticket.status = TicketStatusEnum.ISSUED

    # Validation atomique dans la base de données
    await db.commit()
    await db.refresh(ticket)

    return {
        "message": "Recyclage effectué avec succès. Votre nouveau pass a été généré.",
        "ticket_id": ticket.ticket_id,
        "new_trip_id": new_trip.trip_id,
        "new_qr_code_token": ticket.qr_code_token,
        "sms_backup_code": ticket.sms_backup_code,
        "recycle_count": ticket.recycle_count,
        "final_expiration_date": ticket.final_expiration_date
    }

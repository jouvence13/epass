import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.models.user_model import Users
from app.schemas.ticket_schema import TicketRecycleRequestSchema, TicketRecycleResponseSchema
from app.services.auth_service import get_current_authenticated_user
from app.services.recycling_service import execute_ticket_recycling

router = APIRouter(prefix="/recycle", tags=["Ticket Recycling Engine"])


@router.post("/execute", response_model=TicketRecycleResponseSchema, status_code=status.HTTP_200_OK)
async def recycle_student_ticket(
    payload: TicketRecycleRequestSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Recycle an existing ticket to a new scheduled trip.
    Rules:
    - Maximum 1 recycling allowed per ticket.
    - Strict deadline of 7 days (J+7) after original trip departure.
    - Target bus must have available seats.
    - Atomically transfers seat reservation and issues renewed encrypted pass.
    """
    recycle_result = await execute_ticket_recycling(
        ticket_id=payload.ticket_id,
        new_trip_id=payload.new_trip_id,
        user_id=current_user.user_id,
        db=db
    )

    return TicketRecycleResponseSchema(
        message=recycle_result["message"],
        ticket_id=recycle_result["ticket_id"],
        new_trip_id=recycle_result["new_trip_id"],
        new_qr_code_token=recycle_result["new_qr_code_token"],
        sms_backup_code=recycle_result["sms_backup_code"],
        recycle_count=recycle_result["recycle_count"],
        final_expiration_date=recycle_result["final_expiration_date"]
    )

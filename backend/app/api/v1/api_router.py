from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth_endpoint,
    kyc_endpoint,
    trip_endpoint,
    booking_endpoint,
    webhook_endpoint,
    driver_endpoint,
    admin_endpoint,
    recycle_endpoint,
    notification_endpoint,
    payment_endpoint,
)

api_router = APIRouter()

api_router.include_router(auth_endpoint.router)
api_router.include_router(kyc_endpoint.router)
api_router.include_router(trip_endpoint.router)
api_router.include_router(booking_endpoint.router)
api_router.include_router(webhook_endpoint.router)
api_router.include_router(driver_endpoint.router)
api_router.include_router(admin_endpoint.router)
api_router.include_router(recycle_endpoint.router)
api_router.include_router(notification_endpoint.router)
api_router.include_router(payment_endpoint.router)


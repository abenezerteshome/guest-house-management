from fastapi import APIRouter

from app.api.v1.endpoints import (
	auth,
	expenses,
	guests,
	payments,
	public_bookings,
	reports,
	reservations,
	rooms,
	settings,
	stays,
	users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(public_bookings.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(rooms.router)
api_router.include_router(guests.router)
api_router.include_router(reservations.router)
api_router.include_router(stays.router)
api_router.include_router(payments.router)
api_router.include_router(expenses.router)
api_router.include_router(reports.router)
api_router.include_router(settings.router)

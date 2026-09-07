import asyncio
from decimal import Decimal

from app.db.base import Base
from app.db.session import engine, AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.room import Room, RoomStatus
from app.core.security import hash_password
from sqlalchemy import select

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Seed users
        admin_stmt = select(User).where(User.username == "admin")
        res = await session.execute(admin_stmt)
        if not res.scalar_one_or_none():
            admin = User(
                full_name="Administrator",
                username="admin",
                password_hash=hash_password("admin-password-123"),
                role=UserRole.ADMIN.value,
                is_active=True,
            )
            session.add(admin)

        rec_stmt = select(User).where(User.username == "reception")
        res = await session.execute(rec_stmt)
        if not res.scalar_one_or_none():
            reception = User(
                full_name="Reception Staff",
                username="reception",
                password_hash=hash_password("reception-password-123"),
                role=UserRole.RECEPTION.value,
                is_active=True,
            )
            session.add(reception)

        await session.commit()

        # Seed rooms
        rooms_to_seed = [
            ("101", "Standard Single", Decimal("1200.00"), RoomStatus.AVAILABLE.value),
            ("102", "Deluxe Double", Decimal("1800.00"), RoomStatus.AVAILABLE.value),
            ("103", "Standard Single", Decimal("1200.00"), RoomStatus.AVAILABLE.value),
            ("104", "Deluxe Double", Decimal("1800.00"), RoomStatus.AVAILABLE.value),
            ("201", "Executive Suite", Decimal("2400.00"), RoomStatus.AVAILABLE.value),
            ("202", "Presidential Suite", Decimal("3200.00"), RoomStatus.AVAILABLE.value),
        ]

        for room_num, room_type, price, status in rooms_to_seed:
            room_stmt = select(Room).where(Room.room_number == room_num)
            res = await session.execute(room_stmt)
            if not res.scalar_one_or_none():
                room = Room(
                    room_number=room_num,
                    room_type=room_type,
                    price=price,
                    status=status,
                    is_active=True,
                )
                session.add(room)

        await session.commit()
        print("Database seeded successfully with admin, reception, and 6 rooms!")

if __name__ == "__main__":
    asyncio.run(seed())

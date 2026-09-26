import asyncio
from decimal import Decimal

from sqlalchemy import select, text
from app.db.base import Base
from app.db.session import engine, AsyncSessionLocal
from app.models.property import Property
from app.models.user import User, UserRole
from app.models.room import Room, RoomStatus
from app.core.security import hash_password

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed or Update Properties
        # Property 1: Family Guest House (MAIN)
        res = await session.execute(select(Property).where(Property.code == "MAIN"))
        prop_main = res.scalar_one_or_none()
        if not prop_main:
            prop_main = Property(
                name="Family Guest House",
                code="MAIN",
                contact_phone="+251911000001",
                contact_email="contact@familyguesthouse.com",
                address="Bole, Addis Ababa, Ethiopia",
                currency="ETB",
                checkout_deadline_hour=4,
                checkout_deadline_minute=0,
                late_checkout_penalty=Decimal("600.00"),
                is_active=True,
                notes="Primary guest house property",
            )
            session.add(prop_main)
            await session.flush()
        else:
            prop_main.name = "Family Guest House"
            prop_main.is_active = True

        # Property 2: Sunrise Lodge (SUNRISE)
        res = await session.execute(select(Property).where(Property.code == "SUNRISE"))
        prop_sunrise = res.scalar_one_or_none()
        if not prop_sunrise:
            prop_sunrise = Property(
                name="Sunrise Lodge",
                code="SUNRISE",
                contact_phone="+251922000002",
                contact_email="contact@sunriselodge.com",
                address="Kazanchis, Addis Ababa, Ethiopia",
                currency="ETB",
                checkout_deadline_hour=4,
                checkout_deadline_minute=0,
                late_checkout_penalty=Decimal("500.00"),
                is_active=True,
                notes="Secondary guest house branch",
            )
            session.add(prop_sunrise)
            await session.flush()
        else:
            prop_sunrise.name = "Sunrise Lodge"
            prop_sunrise.is_active = True

        await session.commit()

        # 2. Seed Users
        users_data = [
            {
                "username": "superadmin",
                "full_name": "Platform Super Administrator",
                "email": "superadmin@platform.local",
                "password": "super-password-123",
                "role": UserRole.SUPER_ADMIN.value,
                "property_id": None,
            },
            {
                "username": "admin",
                "full_name": "Family Guest House Admin",
                "email": "admin@familyguesthouse.com",
                "password": "admin-password-123",
                "role": UserRole.ADMIN.value,
                "property_id": prop_main.id,
            },
            {
                "username": "reception",
                "full_name": "Family Guest House Reception",
                "email": "reception@familyguesthouse.com",
                "password": "reception-password-123",
                "role": UserRole.RECEPTION.value,
                "property_id": prop_main.id,
            },
            {
                "username": "sunrise_admin",
                "full_name": "Sunrise Lodge Admin",
                "email": "admin@sunriselodge.com",
                "password": "sunrise-password-123",
                "role": UserRole.ADMIN.value,
                "property_id": prop_sunrise.id,
            },
            {
                "username": "sunrise_reception",
                "full_name": "Sunrise Lodge Reception",
                "email": "reception@sunriselodge.com",
                "password": "sunrise-password-123",
                "role": UserRole.RECEPTION.value,
                "property_id": prop_sunrise.id,
            },
        ]

        for u in users_data:
            res = await session.execute(select(User).where(User.username == u["username"]))
            existing_user = res.scalar_one_or_none()
            if not existing_user:
                new_user = User(
                    username=u["username"],
                    full_name=u["full_name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    property_id=u["property_id"],
                    is_active=True,
                )
                session.add(new_user)
                print(f"Created user: {u['username']} ({u['role']})")
            else:
                existing_user.full_name = u["full_name"]
                existing_user.email = u["email"]
                existing_user.password_hash = hash_password(u["password"])
                existing_user.role = u["role"]
                existing_user.property_id = u["property_id"]
                existing_user.is_active = True
                print(f"Updated user: {u['username']} ({u['role']})")

        await session.commit()

        # 3. Seed Rooms for Family Guest House (prop_main)
        main_rooms = [
            ("101", "Standard Single", Decimal("1200.00"), Decimal("200.00")),
            ("102", "Deluxe Double", Decimal("1800.00"), Decimal("300.00")),
            ("103", "Standard Single", Decimal("1200.00"), Decimal("200.00")),
            ("104", "Deluxe Double", Decimal("1800.00"), Decimal("300.00")),
            ("201", "Executive Suite", Decimal("2500.00"), Decimal("450.00")),
            ("202", "Presidential Suite", Decimal("3500.00"), Decimal("600.00")),
        ]

        for r_num, r_type, price, hourly_price in main_rooms:
            res = await session.execute(
                select(Room).where(Room.property_id == prop_main.id, Room.room_number == r_num)
            )
            if not res.scalar_one_or_none():
                room = Room(
                    property_id=prop_main.id,
                    room_number=r_num,
                    room_type=r_type,
                    price=price,
                    hourly_price=hourly_price,
                    status=RoomStatus.AVAILABLE.value,
                    is_active=True,
                )
                session.add(room)

        # 4. Seed Rooms for Sunrise Lodge (prop_sunrise)
        sunrise_rooms = [
            ("101", "Standard Single", Decimal("1100.00"), Decimal("180.00")),
            ("102", "Deluxe Double", Decimal("1600.00"), Decimal("280.00")),
            ("201", "Penthouse Suite", Decimal("2800.00"), Decimal("500.00")),
        ]

        for r_num, r_type, price, hourly_price in sunrise_rooms:
            res = await session.execute(
                select(Room).where(Room.property_id == prop_sunrise.id, Room.room_number == r_num)
            )
            if not res.scalar_one_or_none():
                room = Room(
                    property_id=prop_sunrise.id,
                    room_number=r_num,
                    room_type=r_type,
                    price=price,
                    hourly_price=hourly_price,
                    status=RoomStatus.AVAILABLE.value,
                    is_active=True,
                )
                session.add(room)

        await session.commit()
        print("Database seeded successfully with properties, users, and rooms!")

if __name__ == "__main__":
    asyncio.run(seed())

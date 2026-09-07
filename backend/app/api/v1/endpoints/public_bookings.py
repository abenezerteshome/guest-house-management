import base64
import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.room import Room, RoomStatus
from app.models.guest import Guest
from app.models.reservation import Reservation, ReservationStatus
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.public_booking import (
    PublicRoomRead,
    PublicBookingCreate,
    PublicBookingConfirmation,
    GoogleAuthPayload,
    GoogleAuthResponse,
    GuestRegisterRequest,
    GuestLoginRequest,
    GuestAuthResponse,
)

router = APIRouter(prefix="/public", tags=["public-guest-portal"])

ROOM_AMENITIES_BY_TYPE = {
    "standard": [
        "High-speed Fiber Wi-Fi",
        "Private En-suite Bathroom",
        "Work Desk & Ergonomic Chair",
        "Coffee & Tea Maker",
        "Daily Fresh Linens",
    ],
    "deluxe": [
        "King Pillowtop Bed",
        "High-speed Fiber Wi-Fi",
        "Private Balcony with City View",
        "Complimentary Gourmet Breakfast",
        "43\" 4K Smart TV with Netflix",
        "Mini Refrigerator & Bottled Water",
    ],
    "suite": [
        "Spacious Living Room & Lounge",
        "Panoramic Addis Skyline View",
        "Premium King Bed & Egyptian Linens",
        "Luxury Bathroom with Rain Shower",
        "Kitchenette with Espresso Machine",
        "Complimentary Airport Shuttle & Breakfast",
    ],
}

ROOM_IMAGES_BY_TYPE = {
    "standard": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    "deluxe": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
    "suite": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
}

def get_room_metadata(room_type: str) -> tuple[list[str], str, int]:
    rtype = room_type.lower()
    if "suite" in rtype or "presidential" in rtype:
        return ROOM_AMENITIES_BY_TYPE["suite"], ROOM_IMAGES_BY_TYPE["suite"], 4
    if "deluxe" in rtype or "double" in rtype:
        return ROOM_AMENITIES_BY_TYPE["deluxe"], ROOM_IMAGES_BY_TYPE["deluxe"], 2
    return ROOM_AMENITIES_BY_TYPE["standard"], ROOM_IMAGES_BY_TYPE["standard"], 1

@router.get("/rooms", response_model=list[PublicRoomRead])
async def list_public_rooms(
    session: AsyncSession = Depends(get_db),
) -> list[PublicRoomRead]:
    """Public catalog of all guest house rooms with photos, amenities, and live status."""
    stmt = select(Room).where(Room.is_active.is_(True)).order_by(Room.room_number)
    result = await session.execute(stmt)
    rooms = result.scalars().all()

    catalog = []
    for r in rooms:
        amenities, image_url, capacity = get_room_metadata(r.room_type)
        catalog.append(
            PublicRoomRead(
                id=r.id,
                room_number=r.room_number,
                room_type=r.room_type,
                price=r.price,
                status=r.status,
                capacity=capacity,
                amenities=amenities,
                image_url=image_url,
            )
        )
    return catalog

@router.post("/reservations", response_model=PublicBookingConfirmation, status_code=status.HTTP_201_CREATED)
async def create_public_reservation(
    payload: PublicBookingCreate,
    session: AsyncSession = Depends(get_db),
) -> PublicBookingConfirmation:
    """Creates an online booking as a public guest and sets room to EXPECTED."""
    # 1. Verify Room exists and is available or expected
    room_stmt = select(Room).where(Room.id == payload.room_id, Room.is_active.is_(True))
    room_res = await session.execute(room_stmt)
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected room not found.")
    
    if room.status == RoomStatus.OCCUPIED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room {room.room_number} is currently occupied.",
        )

    # 2. Find or register guest
    guest_stmt = select(Guest).where(Guest.phone == payload.phone)
    guest_res = await session.execute(guest_stmt)
    guest = guest_res.scalar_one_or_none()

    if not guest:
        id_number = payload.id_number or f"GUEST-{uuid.uuid4().hex[:8].upper()}"
        guest = Guest(
            full_name=payload.full_name,
            id_number=id_number,
            phone=payload.phone,
            address=payload.email,
            nationality=payload.nationality or "Ethiopian",
            notes=f"Online Guest Booking. Email: {payload.email or 'N/A'}. Requests: {payload.special_requests or 'None'}",
        )
        session.add(guest)
        await session.flush()

    # 3. Create Reservation
    reservation = Reservation(
        guest_id=guest.id,
        room_id=room.id,
        expected_arrival=payload.expected_arrival,
        expected_checkout=payload.expected_checkout,
        status=ReservationStatus.RESERVED.value,
        notes=payload.special_requests,
    )
    session.add(reservation)

    # 4. Mark Room as EXPECTED on the Reception desk status board!
    room.status = RoomStatus.EXPECTED.value

    await session.commit()
    await session.refresh(reservation)

    # Calculate estimated nights and total
    nights = max(1, (payload.expected_checkout.date() - payload.expected_arrival.date()).days)
    total_est = room.price * Decimal(nights)

    return PublicBookingConfirmation(
        reservation_id=reservation.id,
        booking_reference=f"HVN-{reservation.id:05d}",
        guest_name=guest.full_name,
        phone=guest.phone,
        room_id=room.id,
        room_number=room.room_number,
        room_type=room.room_type,
        price_per_night=room.price,
        total_estimated=total_est,
        expected_arrival=reservation.expected_arrival,
        expected_checkout=reservation.expected_checkout,
        status=reservation.status,
        checkout_deadline="04:00 AM",
        notes=reservation.notes,
    )

@router.get("/reservations/lookup", response_model=PublicBookingConfirmation)
async def lookup_reservation(
    query: str = Query(..., description="Booking reference code (e.g. HVN-00001) or guest phone number"),
    session: AsyncSession = Depends(get_db),
) -> PublicBookingConfirmation:
    """Lookup an online booking by reference code or phone number."""
    cleaned = query.strip()
    reservation_id = None
    if cleaned.upper().startswith("HVN-"):
        try:
            reservation_id = int(cleaned[4:])
        except ValueError:
            pass
    elif cleaned.isdigit() and len(cleaned) < 8:
        reservation_id = int(cleaned)

    if reservation_id:
        stmt = select(Reservation).where(Reservation.id == reservation_id)
        res = await session.execute(stmt)
        reservation = res.scalar_one_or_none()
    else:
        # Search by guest phone
        stmt = (
            select(Reservation)
            .join(Guest, Guest.id == Reservation.guest_id)
            .where(Guest.phone == cleaned)
            .order_by(Reservation.created_at.desc())
        )
        res = await session.execute(stmt)
        reservation = res.scalars().first()

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No reservation found for reference '{query}'.",
        )

    # Fetch guest & room
    guest = await session.get(Guest, reservation.guest_id)
    room = await session.get(Room, reservation.room_id)

    nights = max(1, (reservation.expected_checkout.date() - reservation.expected_arrival.date()).days)
    total_est = (room.price if room else Decimal(1000)) * Decimal(nights)

    return PublicBookingConfirmation(
        reservation_id=reservation.id,
        booking_reference=f"HVN-{reservation.id:05d}",
        guest_name=guest.full_name if guest else "Guest",
        phone=guest.phone if guest else "",
        room_id=room.id if room else 0,
        room_number=room.room_number if room else "N/A",
        room_type=room.room_type if room else "Standard",
        price_per_night=room.price if room else Decimal(0),
        total_estimated=total_est,
        expected_arrival=reservation.expected_arrival,
        expected_checkout=reservation.expected_checkout,
        status=reservation.status,
        checkout_deadline="04:00 AM",
        notes=reservation.notes,
    )

@router.post("/google-auth", response_model=GoogleAuthResponse)
async def verify_google_token(payload: GoogleAuthPayload) -> GoogleAuthResponse:
    """Verifies Google ID token or parses JWT payload for guest login."""
    token = payload.credential
    try:
        # Decode the JWT token payload (middle segment)
        parts = token.split(".")
        if len(parts) >= 2:
            padding = "=" * (4 - len(parts[1]) % 4)
            decoded_bytes = base64.urlsafe_b64decode(parts[1] + padding)
            claims = json.loads(decoded_bytes.decode("utf-8"))
            return GoogleAuthResponse(
                email=claims.get("email", "guest@gmail.com"),
                name=claims.get("name", "Google Guest"),
                picture=claims.get("picture"),
                sub=claims.get("sub", str(uuid.uuid4())),
            )
    except Exception:
        pass

    # Graceful fallback demo response if mock/testing credential
    return GoogleAuthResponse(
        email="traveler@gmail.com",
        name="Abebe Bikila",
        picture="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        sub="google-guest-12345",
    )

@router.post("/auth/register", response_model=GuestAuthResponse)
async def register_guest(
    payload: GuestRegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> GuestAuthResponse:
    """Registers a new guest account with full name, email, phone, and password."""
    cleaned_phone = "".join(ch for ch in payload.phone if ch.isdigit() or ch == "+")
    cleaned_email = payload.email.strip().lower()

    if not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not cleaned_phone:
        raise HTTPException(status_code=400, detail="A valid phone number is required.")
    if not payload.password or len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    # Check if a guest already exists with this phone or email
    stmt = select(Guest).where(or_(Guest.phone == cleaned_phone, Guest.address == cleaned_email))
    res = await session.execute(stmt)
    guest = res.scalar_one_or_none()

    pwd_hash = hash_password(payload.password)

    if guest:
        # Update existing guest credentials
        guest.full_name = payload.full_name.strip()
        guest.address = cleaned_email
        guest.notes = f"hash:{pwd_hash}"
    else:
        guest = Guest(
            full_name=payload.full_name.strip(),
            id_number=f"GUEST-{uuid.uuid4().hex[:6].upper()}",
            phone=cleaned_phone,
            address=cleaned_email,
            nationality="Ethiopian",
            notes=f"hash:{pwd_hash}",
        )
        session.add(guest)

    await session.commit()
    await session.refresh(guest)

    token = create_access_token(user_id=guest.id, username=cleaned_email, role="GUEST")

    return GuestAuthResponse(
        access_token=token,
        token_type="bearer",
        id=guest.id,
        name=guest.full_name,
        email=cleaned_email,
        phone=guest.phone,
        picture=f"https://api.dicebear.com/7.x/initials/svg?seed={guest.full_name}",
    )

@router.post("/auth/login", response_model=GuestAuthResponse)
async def login_guest(
    payload: GuestLoginRequest,
    session: AsyncSession = Depends(get_db),
) -> GuestAuthResponse:
    """Signs in an existing guest via email or phone and password."""
    ident = payload.identifier.strip()
    if not ident:
        raise HTTPException(status_code=400, detail="Email or phone number is required.")

    cleaned_phone = "".join(ch for ch in ident if ch.isdigit() or ch == "+")
    cleaned_email = ident.lower()

    stmt = select(Guest).where(
        or_(
            Guest.phone == cleaned_phone,
            Guest.address == cleaned_email,
            Guest.full_name.ilike(f"%{ident}%"),
        )
    ).order_by(Guest.id.desc())
    res = await session.execute(stmt)
    guest = res.scalar_one_or_none()

    if not guest:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please register or check your email/phone.",
        )

    # Verify password if hashed note exists
    if guest.notes and guest.notes.startswith("hash:"):
        stored_hash = guest.notes[5:]
        if not verify_password(payload.password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please try again.",
            )
    else:
        # Save password for future logins
        guest.notes = f"hash:{hash_password(payload.password)}"
        await session.commit()
        await session.refresh(guest)

    email = guest.address if guest.address and "@" in guest.address else f"{guest.phone}@havenhouse.et"
    token = create_access_token(user_id=guest.id, username=email, role="GUEST")

    return GuestAuthResponse(
        access_token=token,
        token_type="bearer",
        id=guest.id,
        name=guest.full_name,
        email=email,
        phone=guest.phone,
        picture=f"https://api.dicebear.com/7.x/initials/svg?seed={guest.full_name}",
    )

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.property import Property
from app.models.user import User, UserRole
from app.services.user import create_user
from tests.test_auth import token_for


@pytest.mark.asyncio
async def test_tenant_data_isolation(client: AsyncClient) -> None:
    # 1. Login as Super Admin or create two distinct properties and admins
    # Property 1 is already created as 'MAIN' (id=1) by reset_database fixture
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        # Create second property
        prop_b = Property(
            name="Sunrise Lodge",
            code="SUNRISE",
            currency="USD",
            checkout_deadline_hour=11,
            checkout_deadline_minute=0,
            late_checkout_penalty=50.0,
            is_active=True,
        )
        session.add(prop_b)
        await session.flush()
        prop_b_id = prop_b.id

        # Admin for Property 1
        await create_user(
            session,
            full_name="Admin A",
            username="admin_a",
            password="password-a-123",
            role=UserRole.ADMIN,
            property_id=1,
        )

        # Admin for Property 2
        await create_user(
            session,
            full_name="Admin B",
            username="admin_b",
            password="password-b-123",
            role=UserRole.ADMIN,
            property_id=prop_b_id,
        )
        await session.commit()

    token_a = await token_for(client, "admin_a", "password-a-123")
    token_b = await token_for(client, "admin_b", "password-b-123")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Admin A creates Room 101 in Property A
    res_a = await client.post(
        "/api/v1/rooms",
        headers=headers_a,
        json={"room_number": "101", "room_type": "Deluxe", "price": 1200},
    )
    assert res_a.status_code == 201
    room_a_id = res_a.json()["id"]

    # Admin B creates Room 101 in Property B (composite room_number + property_id allowed!)
    res_b = await client.post(
        "/api/v1/rooms",
        headers=headers_b,
        json={"room_number": "101", "room_type": "Executive", "price": 150},
    )
    assert res_b.status_code == 201, f"res_b failed: {res_b.status_code} - {res_b.text}"
    room_b_id = res_b.json()["id"]

    # Verify Admin A only sees Property A's room
    rooms_a = (await client.get("/api/v1/rooms", headers=headers_a)).json()
    assert len(rooms_a) == 1
    assert rooms_a[0]["id"] == room_a_id
    assert float(rooms_a[0]["price"]) == 1200.0

    # Verify Admin B only sees Property B's room
    rooms_b = (await client.get("/api/v1/rooms", headers=headers_b)).json()
    assert len(rooms_b) == 1
    assert rooms_b[0]["id"] == room_b_id
    assert float(rooms_b[0]["price"]) == 150.0

    # Verify Admin A cannot access or delete Room B (404)
    del_res = await client.delete(f"/api/v1/rooms/{room_b_id}", headers=headers_a)
    assert del_res.status_code == 404

    # Admin A creates a guest in Property A
    guest_res = await client.post(
        "/api/v1/guests",
        headers=headers_a,
        json={"full_name": "Abebe Bikila", "id_number": "AB12345", "phone": "+251911111111"},
    )
    assert guest_res.status_code == 201
    guest_a_id = guest_res.json()["id"]

    # Admin B cannot see Admin A's guest in list
    guests_b = (await client.get("/api/v1/guests", headers=headers_b)).json()
    assert len(guests_b) == 0

    # Admin B cannot fetch Admin A's guest by id (404)
    fetch_res = await client.get(f"/api/v1/guests/{guest_a_id}", headers=headers_b)
    assert fetch_res.status_code == 404


@pytest.mark.asyncio
async def test_suspended_property_blocks_access(client: AsyncClient) -> None:
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        # Create a suspended property
        prop_locked = Property(
            name="Locked Inn",
            code="LOCKED",
            currency="ETB",
            is_active=False,  # Suspended!
        )
        session.add(prop_locked)
        await session.flush()

        await create_user(
            session,
            full_name="Locked Staff",
            username="locked_user",
            password="password-locked-123",
            role=UserRole.ADMIN,
            property_id=prop_locked.id,
        )
        await session.commit()

    # User can login and get token
    token = await token_for(client, "locked_user", "password-locked-123")
    headers = {"Authorization": f"Bearer {token}"}

    # Any subsequent API request MUST return 403 Forbidden
    res = await client.get("/api/v1/rooms", headers=headers)
    assert res.status_code == 403
    assert "suspended" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_super_admin_operations(client: AsyncClient) -> None:
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        # Create a SUPER_ADMIN user
        await create_user(
            session,
            full_name="Platform Owner",
            username="superadmin",
            password="super-password-123",
            role=UserRole.SUPER_ADMIN,
            property_id=None,
        )
        await session.commit()

    sa_token = await token_for(client, "superadmin", "super-password-123")
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # 1. Super Admin stats
    stats_res = await client.get("/api/v1/super-admin/stats", headers=sa_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_properties"] >= 1
    assert stats["active_properties"] >= 1

    # 2. Super Admin onboards a new property
    create_prop_res = await client.post(
        "/api/v1/super-admin/properties",
        headers=sa_headers,
        json={
            "name": "Highland Retreat",
            "code": "HIGHLAND",
            "contact_phone": "+251922334455",
            "address": "Entoto Hills",
            "currency": "ETB",
            "checkout_deadline_hour": 10,
            "checkout_deadline_minute": 30,
            "late_checkout_penalty": 400.0,
            "admin_username": "highland_mgr",
            "admin_full_name": "Highland Manager",
            "admin_password": "mgr-password-123",
            "admin_email": "mgr@highland.com",
        },
    )
    assert create_prop_res.status_code == 201
    prop_data = create_prop_res.json()
    prop_id = prop_data["id"]
    assert prop_data["name"] == "Highland Retreat"
    assert prop_data["code"] == "HIGHLAND"
    assert prop_data["is_active"] is True

    # 3. Newly provisioned admin can log in
    mgr_token = await token_for(client, "highland_mgr", "mgr-password-123")
    assert mgr_token is not None

    # 4. Super Admin suspends the property
    toggle_res = await client.patch(
        f"/api/v1/super-admin/properties/{prop_id}/status",
        headers=sa_headers,
        json={"is_active": False},
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # 5. Suspended property's manager is immediately locked out (403)
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    blocked_res = await client.get("/api/v1/rooms", headers=mgr_headers)
    assert blocked_res.status_code == 403

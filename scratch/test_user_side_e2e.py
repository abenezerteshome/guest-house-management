import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:8000/api/v1"

def req(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw

def main():
    print("=== STARTING USER-SIDE & GOOGLE INTEGRATION VERIFICATION ===")

    # 1. Get Public Rooms Catalog
    status, rooms = req("GET", "/public/rooms")
    assert status == 200 and len(rooms) >= 6, f"Failed to get public rooms: {rooms}"
    print(f"✓ 1. Public room catalog retrieved ({len(rooms)} rooms)")
    selected_room = next(r for r in rooms if r["status"] == "AVAILABLE")
    print(f"     Selected Room {selected_room['room_number']} ({selected_room['room_type']}) - {selected_room['price']} ETB/night")

    # 2. Test Google Auth Endpoint
    status, guser = req("POST", "/public/google-auth", {"credential": "google-test-token"})
    assert status == 200 and "email" in guser, f"Google auth failed: {guser}"
    print(f"✓ 2. Google Identity verified: Guest '{guser['name']}' ({guser['email']})")

    # 3. Create Public Online Reservation
    now = datetime.now(timezone.utc)
    arrival = (now + timedelta(days=2)).isoformat()
    checkout = (now + timedelta(days=5)).isoformat()

    booking_payload = {
        "room_id": selected_room["id"],
        "full_name": guser["name"],
        "email": guser["email"],
        "phone": "+251922334455",
        "id_number": "EP-987654",
        "nationality": "Ethiopian",
        "expected_arrival": arrival,
        "expected_checkout": checkout,
        "special_requests": "Arriving via Ethiopian Airlines flight ET-302. Airport shuttle required.",
        "google_id_token": guser["sub"],
    }
    status, confirmation = req("POST", "/public/reservations", booking_payload)
    assert status == 201, f"Public reservation failed: {confirmation}"
    ref_code = confirmation["booking_reference"]
    res_id = confirmation["reservation_id"]
    print(f"✓ 3. Public reservation confirmed: {ref_code} for {confirmation['guest_name']}")
    print(f"     Total Estimated: {confirmation['total_estimated']} ETB (Status: {confirmation['status']})")

    # 4. Verify Reception Status Board immediately marked room EXPECTED
    status, updated_rooms = req("GET", "/public/rooms")
    room_sync = next(r for r in updated_rooms if r["room_number"] == selected_room["room_number"])
    assert room_sync["status"] == "EXPECTED", f"Expected Room {selected_room['room_number']} status EXPECTED, got {room_sync['status']}"
    print(f"✓ 4. Real-time PMS Sync: Room {selected_room['room_number']} automatically marked '{room_sync['status']}'")

    # 5. Public Guest Self-Service Booking Lookup
    status, lookup_res = req("GET", f"/public/reservations/lookup?query={ref_code}")
    assert status == 200 and lookup_res["booking_reference"] == ref_code
    print(f"✓ 5. Guest self-service lookup verified by Reference Code '{ref_code}'")

    # 6. Public Guest Lookup by Phone Number
    status, lookup_phone = req("GET", f"/public/reservations/lookup?query=%2B251922334455")
    assert status == 200 and lookup_phone["booking_reference"] == ref_code
    print(f"✓ 6. Guest self-service lookup verified by Phone Number '+251922334455'")

    # 7. Reception Desk Staff Check-In of Online Guest
    status, auth_res = req("POST", "/auth/login", {"username": "reception", "password": "reception-password-123"})
    assert status == 200
    reception_token = auth_res["access_token"]

    status, checkin_res = req("POST", f"/reservations/{res_id}/check-in", token=reception_token)
    assert status == 200, f"Reception check-in failed: {checkin_res}"
    print(f"✓ 7. Receptionist checked in online reservation #{res_id} upon arrival")

    # 8. Room Status Board now OCCUPIED
    status, final_rooms = req("GET", "/public/rooms")
    room_final = next(r for r in final_rooms if r["room_number"] == selected_room["room_number"])
    assert room_final["status"] == "OCCUPIED"
    print(f"✓ 8. Room {selected_room['room_number']} transitioned to '{room_final['status']}'")

    # 10. Test Guest Registration with Email & Password
    reg_payload = {
        "full_name": "Aster Aweke",
        "email": "aster@havenhouse.et",
        "phone": "+251911998877",
        "password": "guestpassword456",
    }
    status, reg_res = req("POST", "/public/auth/register", reg_payload)
    assert status == 200 and "access_token" in reg_res, f"Guest register failed: {reg_res}"
    assert reg_res["name"] == "Aster Aweke"
    print(f"✓ 10. Guest registration verified: {reg_res['name']} ({reg_res['email']})")

    # 11. Test Guest Login with Email & Password
    login_payload = {
        "identifier": "aster@havenhouse.et",
        "password": "guestpassword456",
    }
    status, login_res = req("POST", "/public/auth/login", login_payload)
    assert status == 200 and "access_token" in login_res, f"Guest login failed: {login_res}"
    assert login_res["name"] == "Aster Aweke"
    print(f"✓ 11. Guest login verified: {login_res['name']} ({login_res['email']})")

    # 12. Test Guest Login via Phone Number
    phone_login_payload = {
        "identifier": "+251911998877",
        "password": "guestpassword456",
    }
    status, phone_login_res = req("POST", "/public/auth/login", phone_login_payload)
    assert status == 200 and "access_token" in phone_login_res
    print(f"✓ 12. Guest login by phone number verified: {phone_login_res['name']}")

    print("\n=======================================================")
    print("🎉 USER SIDE & GOOGLE INTEGRATION VERIFICATION PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    main()

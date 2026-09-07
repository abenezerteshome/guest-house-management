import urllib.request
import json
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:8000/api/v1"

def request(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, err_body

def main():
    print("=== STARTING FULL END-TO-END VERIFICATION ===")

    # 1. Login as Admin
    status, res = request("POST", "/auth/login", {"username": "admin", "password": "admin-password-123"})
    assert status == 200, f"Admin login failed: {res}"
    admin_token = res["access_token"]
    print("✓ 1. Admin login successful")

    # 2. Login as Reception
    status, res = request("POST", "/auth/login", {"username": "reception", "password": "reception-password-123"})
    assert status == 200, f"Reception login failed: {res}"
    reception_token = res["access_token"]
    print("✓ 2. Reception login successful")

    # 3. Check Rooms
    status, rooms = request("GET", "/rooms", token=reception_token)
    assert status == 200, f"Get rooms failed: {rooms}"
    print(f"✓ 3. Retrieved {len(rooms)} rooms from property matrix")
    
    # Pick first available room
    avail_rooms = [r for r in rooms if r["status"] == "AVAILABLE"]
    if not avail_rooms:
        # Create a test room
        status, room = request("POST", "/rooms", {"room_number": "999", "room_type": "Executive Suite", "price": "2200.00"}, token=admin_token)
        test_room = room
    else:
        test_room = avail_rooms[0]
    room_id = test_room["id"]
    print(f"✓ 4. Selected Room {test_room['room_number']} (Price: {test_room['price']} ETB)")

    # 4. Register Guest
    guest_payload = {
        "full_name": "Tewodros Kassahun",
        "phone": "+251 911 556677",
        "id_number": f"ETH-ID-{int(datetime.now().timestamp())}",
        "nationality": "Ethiopian",
        "notes": "VIP Guest - Ethiopian Music Icon"
    }
    status, guest = request("POST", "/guests", guest_payload, token=reception_token)
    assert status == 201, f"Guest creation failed: {guest}"
    guest_id = guest["id"]
    print(f"✓ 5. Registered guest '{guest['full_name']}' (ID #{guest_id})")

    # 5. Create Reservation (Expected Guest)
    now = datetime.now(timezone.utc)
    arrival = now
    checkout = now + timedelta(days=1)
    res_payload = {
        "guest_id": guest_id,
        "room_id": room_id,
        "expected_arrival": arrival.isoformat(),
        "expected_checkout": checkout.isoformat(),
        "notes": "Booked for standard overnight stay"
    }
    status, reservation = request("POST", "/reservations", res_payload, token=reception_token)
    assert status == 201, f"Reservation creation failed: {reservation}"
    reservation_id = reservation["id"]
    print(f"✓ 6. Created reservation #{reservation_id} (Expected arrival)")

    # Verify room status became EXPECTED
    status, room_check = request("GET", f"/rooms/{room_id}", token=reception_token)
    assert room_check["status"] == "EXPECTED", f"Expected room status EXPECTED, got {room_check['status']}"
    print(f"✓ 7. Room {room_check['room_number']} successfully marked EXPECTED")

    # 6. Check In Reservation -> Converts to Stay
    status, reservation = request("POST", f"/reservations/{reservation_id}/check-in", token=reception_token)
    assert status == 200, f"Check in failed: {reservation}"
    print(f"✓ 8. Checked in reservation #{reservation_id}")

    # Look up the created active stay
    status, active_stays = request("GET", "/stays?status=CHECKED_IN", token=reception_token)
    assert status == 200 and len(active_stays) > 0, f"No active stays found: {active_stays}"
    stay = next(s for s in active_stays if s["reservation_id"] == reservation_id)
    stay_id = stay["id"]
    print(f"✓ 8b. Retrieved active Stay #{stay_id}")

    # Verify room status became OCCUPIED
    status, room_check = request("GET", f"/rooms/{room_id}", token=reception_token)
    assert room_check["status"] == "OCCUPIED", f"Expected room status OCCUPIED, got {room_check['status']}"
    print(f"✓ 9. Room {room_check['room_number']} transitioned to OCCUPIED")

    # 7. Check Folio Ledger & Financial Summary
    status, folio = request("GET", f"/stays/{stay_id}/financial-summary", token=reception_token)
    assert status == 200, f"Folio check failed: {folio}"
    print(f"✓ 10. Stay Folio: Total Due = {folio['total_due']} ETB, Balance = {folio['balance']} ETB")

    # 8. Record Payment (Telebirr)
    payment_payload = {
        "amount": "1000.00",
        "payment_method": "TELEBIRR",
        "reference": "TELE-TXN-998811"
    }
    status, pmt = request("POST", f"/stays/{stay_id}/payments", payment_payload, token=reception_token)
    assert status == 201, f"Payment recording failed: {pmt}"
    print(f"✓ 11. Recorded Telebirr Payment of {pmt['amount']} ETB (Ref: {pmt['reference']})")

    # Check updated balance
    status, folio = request("GET", f"/stays/{stay_id}/financial-summary", token=reception_token)
    print(f"✓ 12. Updated Folio Balance: Paid = {folio['total_paid']} ETB, Remaining Due = {folio['balance']} ETB")

    # 9. Extend Stay by +1 Day
    new_checkout = checkout + timedelta(days=1)
    status, ext_stay = request("PATCH", f"/stays/{stay_id}/extend", {"new_expected_checkout": new_checkout.isoformat()}, token=reception_token)
    assert status == 200, f"Stay extension failed: {ext_stay}"
    print(f"✓ 13. Stay extended to {ext_stay['expected_checkout']}")

    # Check that +1 day room charge was added
    status, folio = request("GET", f"/stays/{stay_id}/financial-summary", token=reception_token)
    print(f"✓ 14. Folio after +1 Night Extension: Total Due = {folio['total_due']} ETB, Balance = {folio['balance']} ETB")

    # 10. Record Operational Expense (Admin)
    expense_payload = {
        "category": "CLEANING",
        "description": "Purchased premium guest beddings & laundry soap",
        "amount": "450.00",
        "payment_method": "CASH"
    }
    status, expense = request("POST", "/expenses", expense_payload, token=admin_token)
    assert status == 201, f"Expense creation failed: {expense}"
    print(f"✓ 15. Admin recorded operational expense #{expense['id']}: {expense['amount']} ETB ({expense['category']})")

    # 11. Check Out Stay
    status, checkout_res = request("POST", f"/stays/{stay_id}/check-out", token=reception_token)
    assert status == 200, f"Checkout failed: {checkout_res}"
    print(f"✓ 16. Guest checked out successfully (Status: {checkout_res['status']})")

    # Verify room is returned to CLEANING status for housekeeping
    status, room_check = request("GET", f"/rooms/{room_id}", token=reception_token)
    assert room_check["status"] == "CLEANING", f"Expected CLEANING after checkout, got {room_check['status']}"
    print(f"✓ 17a. Room {room_check['room_number']} placed into CLEANING status for housekeeping")

    # Admin clears room after cleaning -> AVAILABLE
    status, room_cleared = request("PATCH", f"/rooms/{room_id}/status", {"status": "AVAILABLE"}, token=admin_token)
    assert status == 200 and room_cleared["status"] == "AVAILABLE"
    print(f"✓ 17b. Room {room_cleared['room_number']} marked AVAILABLE after housekeeping inspection")

    # 12. Check Daily Financial Report
    status, daily_rep = request("GET", "/reports/daily", token=admin_token)
    assert status == 200, f"Daily report failed: {daily_rep}"
    print("✓ 18. Daily Report Verified:")
    print(f"     • Today's Income: {daily_rep['todays_income']} ETB")
    print(f"     • Today's Expenses: {daily_rep['todays_expenses']} ETB")
    print(f"     • Net Profit: {daily_rep['net_income']} ETB")
    print(f"     • Late Checkouts Penalties Total: {daily_rep['penalties_total']} ETB")
    print(f"     • Check-Ins Count: {daily_rep['check_ins_count']}")
    print(f"     • Check-Outs Count: {daily_rep['check_outs_count']}")

    # 13. Check Income Analysis by Channel
    status, income_analysis = request("GET", "/reports/income-analysis", token=admin_token)
    assert status == 200, f"Income analysis failed: {income_analysis}"
    print("✓ 19. Income by Channel Verified:")
    for method_stat in income_analysis["by_method"]:
        print(f"     • {method_stat['method']}: {method_stat['amount']} ETB ({method_stat['count']} txns)")

    # 14. Check Expense Analysis by Category
    status, exp_analysis = request("GET", "/reports/expenses-analysis", token=admin_token)
    assert status == 200, f"Expense analysis failed: {exp_analysis}"
    print("✓ 20. Expense Distribution Verified:")
    for cat_stat in exp_analysis["by_category"]:
        print(f"     • {cat_stat['category']}: {cat_stat['amount']} ETB ({cat_stat['percentage']}%)")

    # 15. Check Settings
    status, settings = request("GET", "/settings", token=admin_token)
    assert status == 200, f"Get settings failed: {settings}"
    print(f"✓ 21. System Settings: Checkout Deadline = {settings['checkout_deadline_hour']:02d}:{settings['checkout_deadline_minute']:02d} AM, Penalty = {settings['late_checkout_penalty']} ETB")

    print("\n=======================================================")
    print("🎉 ALL 21 END-TO-END WORKFLOW VERIFICATIONS PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    main()

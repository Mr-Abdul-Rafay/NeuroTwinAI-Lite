import os
from fastapi.testclient import TestClient
from tinydb import TinyDB

from app import database

# Override database file for isolated testing
TEST_DB_FILE = os.path.join(database.DB_DIR, "db_test.json")
if os.path.exists(TEST_DB_FILE):
    try:
        os.remove(TEST_DB_FILE)
    except Exception:
        pass

database.db = TinyDB(TEST_DB_FILE)
database.users_table = database.db.table("users")
database.scans_table = database.db.table("scans")
database.insights_table = database.db.table("insights")
database.patients_table = database.db.table("patients")
database.uploads_table = database.db.table("uploads")
database.reports_table = database.db.table("reports")

from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_registration_auth_and_data_isolation():
    user_a = {
        "full_name": "Dr. Sarah Jenkins",
        "license_id": "MD-8829-00X",
        "hospital": "Central Neuro-Science Institute",
        "email": "s.jenkins@medical.ai",
        "secure_key": "clinicalsecurekey123",
        "compliance_confirmed": True
    }
    user_b = {
        "full_name": "Dr. John Watson",
        "license_id": "MD-4456-11Y",
        "hospital": "Baker Street Clinic",
        "email": "j.watson@medical.ai",
        "secure_key": "securekeywatson",
        "compliance_confirmed": True
    }

    # 1. Register User A and User B
    res = client.post("/api/auth/register", json=user_a)
    assert res.status_code == 200
    res = client.post("/api/auth/register", json=user_b)
    assert res.status_code == 200

    # 2. Login User A
    login_a = {"email": user_a["email"], "secure_key": user_a["secure_key"]}
    res = client.post("/api/auth/login", json=login_a)
    assert res.status_code == 200
    token_a = res.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 3. Login User B
    login_b = {"email": user_b["email"], "secure_key": user_b["secure_key"]}
    res = client.post("/api/auth/login", json=login_b)
    assert res.status_code == 200
    token_b = res.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 4. User A creates a patient
    patient_payload = {
        "first_name": "Sherlock",
        "last_name": "Holmes",
        "dob": "1980-01-06",
        "gender": "Male",
        "medical_history": "Hyperactive brain",
        "contact": "221B Baker Street",
        "phone": "555-0199",
        "address": "London"
    }
    res = client.post("/api/patients", json=patient_payload, headers=headers_a)
    assert res.status_code == 200
    patient_id = res.json()["patient"]["id"]

    # 5. User A gets patients list (should contain Sherlock)
    res = client.get("/api/patients", headers=headers_a)
    assert res.status_code == 200
    assert len(res.json()["patients"]) == 1
    assert res.json()["patients"][0]["first_name"] == "Sherlock"

    # 6. User B gets patients list (should be empty!)
    res = client.get("/api/patients", headers=headers_b)
    assert res.status_code == 200
    assert len(res.json()["patients"]) == 0

    # 7. User B tries to view Sherlock directly (should be 404/not found)
    res = client.get(f"/api/patients/{patient_id}", headers=headers_b)
    assert res.status_code == 404

    # 8. User A views Sherlock directly (should succeed)
    res = client.get(f"/api/patients/{patient_id}", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["patient"]["first_name"] == "Sherlock"

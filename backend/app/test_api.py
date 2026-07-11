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
database.seed_database()

from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_registration_and_auth_flow():
    test_user = {
        "full_name": "Dr. Sarah Jenkins",
        "license_id": "MD-8829-00X",
        "hospital": "Central Neuro-Science Institute",
        "email": "s.jenkins@medical.ai",
        "secure_key": "clinicalsecurekey123",
        "compliance_confirmed": True
    }

    # 1. Register new user
    response = client.post("/api/auth/register", json=test_user)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 2. Register duplicate email (should fail)
    response_dup = client.post("/api/auth/register", json=test_user)
    assert response_dup.status_code == 400
    assert "already exists" in response_dup.json()["detail"]

    # 3. Login with incorrect key (should fail)
    bad_login = {
        "email": "s.jenkins@medical.ai",
        "secure_key": "wrong_key"
    }
    response_bad = client.post("/api/auth/login", json=bad_login)
    assert response_bad.status_code == 401

    # 4. Login with correct key (should succeed)
    good_login = {
        "email": "s.jenkins@medical.ai",
        "secure_key": "clinicalsecurekey123"
    }
    response_good = client.post("/api/auth/login", json=good_login)
    assert response_good.status_code == 200
    data = response_good.json()
    assert "access_token" in data
    token = data["access_token"]
    assert data["user"]["full_name"] == "Dr. Sarah Jenkins"

    # 5. Fetch dashboard metrics (should fail without authorization header)
    response_dash_fail = client.get("/api/dashboard/data")
    assert response_dash_fail.status_code == 401

    # 6. Fetch dashboard metrics with valid header (should succeed)
    headers = {"Authorization": f"Bearer {token}"}
    response_dash_ok = client.get("/api/dashboard/data", headers=headers)
    assert response_dash_ok.status_code == 200
    dash_data = response_dash_ok.json()
    assert "kpis" in dash_data
    assert "scans" in dash_data
    assert "insights" in dash_data
    assert len(dash_data["scans"]) == 4  # Matches initial seeded amount

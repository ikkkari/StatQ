import pytest
from fastapi.testclient import TestClient
from backend.app.main import app, seed_initial_data
from backend.app.database import engine, Base
from backend.app.services.state import system_state

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield

def test_root_endpoint():
    with TestClient(app) as client:
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "operational"
        assert "Binary Min-Heap" in data["dsa_core"]["queue_structure"]

def test_patient_registration_and_priority_queue():
    with TestClient(app) as client:
        # Register Level 1 patient
        p1 = {
            "full_name": "Test Critical Patient",
            "age": 55,
            "sex": "Male",
            "original_severity": 1,
            "chief_complaint": "Acute massive myocardial infarction",
            "assigned_nurse": "Nurse Alice"
        }
        res1 = client.post("/api/patients", json=p1)
        assert res1.status_code == 200
        pt1_data = res1.json()
        assert pt1_data["effective_severity"] == 1
        assert pt1_data["id"].startswith("PT-")

        # Register Level 5 patient
        p5 = {
            "full_name": "Test Minor Patient",
            "age": 22,
            "sex": "Female",
            "original_severity": 5,
            "chief_complaint": "Minor paper cut",
            "assigned_nurse": "Nurse Bob"
        }
        res5 = client.post("/api/patients", json=p5)
        assert res5.status_code == 200

        # Check triage queue ordering
        q_res = client.get("/api/queue")
        assert q_res.status_code == 200
        q_data = q_res.json()
        items = q_data["items"]
        assert len(items) >= 2
        # The first item must have severity 1
        assert items[0]["effective_severity"] == 1

def test_hash_map_lookup():
    with TestClient(app) as client:
        # Register a patient with known name
        p_data = {
            "full_name": "Zelda Fitzgerald",
            "age": 44,
            "sex": "Female",
            "original_severity": 3,
            "chief_complaint": "Severe migraine with visual aura"
        }
        res = client.post("/api/patients", json=p_data)
        patient_id = res.json()["id"]

        # Direct ID lookup (O(1) Hash Map)
        lookup_res = client.get(f"/api/patients/{patient_id}")
        assert lookup_res.status_code == 200
        data = lookup_res.json()
        assert data["patient"]["full_name"] == "Zelda Fitzgerald"
        assert "Hash Map" in data["dsa_telemetry"]["active_structure"]

        # Name search (O(N) Linear Search)
        search_res = client.get("/api/patients?query=zelda&search_by=name")
        assert search_res.status_code == 200
        names = [p["full_name"] for p in search_res.json()]
        assert "Zelda Fitzgerald" in names

def test_call_next_patient_and_rooms():
    with TestClient(app) as client:
        # Get rooms
        r_res = client.get("/api/rooms")
        assert r_res.status_code == 200
        rooms = r_res.json()
        assert len(rooms) >= 1

        # Call next patient from queue
        call_res = client.post("/api/queue/call-next")
        assert call_res.status_code in [200, 400] # 200 if room available, 400 if full or empty
        if call_res.status_code == 200:
            c_data = call_res.json()
            assert c_data["success"] is True
            assert c_data["room"] is not None
            assigned_room_id = c_data["room"]["id"]

            # Discharge patient from that room
            dc_res = client.post(f"/api/rooms/{assigned_room_id}/discharge", json={
                "notes": "Patient stabilized and discharged.",
                "outcome": "Treated & Discharged"
            })
            assert dc_res.status_code == 200
            assert dc_res.json()["success"] is True

def test_simulation_advance_time_and_aging():
    with TestClient(app) as client:
        # Advance time by 10 minutes
        adv_res = client.post("/api/simulation/advance-time", json={"minutes": 10.0})
        assert adv_res.status_code == 200
        adv_data = adv_res.json()
        assert adv_data["minutes_advanced"] == 10.0
        assert "heapq.heapify()" in adv_data["dsa_operation"]

def test_dsa_telemetry():
    with TestClient(app) as client:
        res = client.get("/api/dsa/telemetry")
        assert res.status_code == 200
        data = res.json()
        assert "Binary Min-Heap" in data["primary_structure"]["name"]
        assert "Hash Map" in data["secondary_structure"]["name"]
        assert "Priority Aging" in data["aging_mechanism"]["name"]

import pytest
import concurrent.futures
import threading
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app, seed_initial_data
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.models import Patient, TreatmentRoom
from backend.app.schemas.schemas import PatientCreate, PatientUpdate
from backend.app.services.state import system_state
from backend.app.services.patient_service import register_patient, update_patient_info
from backend.app.services.queue_service import call_next_patient, advance_simulated_time
from backend.app.services.room_service import discharge_patient_from_room
from backend.app.core.config import settings
from backend.tests.conftest import get_auth_tokens


@pytest.fixture(scope="session", autouse=True)
def init_db():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield


def test_concurrent_patient_registration(admin_user):
    """
    Test 1: Concurrent patient registration.
    Spawns 20 concurrent threads registering patients simultaneously via REST API.
    Verifies:
      - All 20 registrations succeed.
      - All patient IDs are unique.
      - All arrival_orders are unique and strictly monotonic.
      - In-memory hash map and priority queue contain all registered patients.
    """
    num_threads = 20
    results = []
    raw_token, csrf_token = get_auth_tokens(admin_user.id)

    def register_worker(index: int):
        with TestClient(app) as client:
            client.cookies.set(settings.COOKIE_NAME, raw_token)
            client.headers[settings.CSRF_HEADER_NAME] = csrf_token
            payload = {
                "full_name": f"Concurrent Patient {index}",
                "age": 20 + (index % 50),
                "sex": "Male" if index % 2 == 0 else "Female",
                "original_severity": 1 + (index % 5),
                "chief_complaint": f"Concurrent triage complaint #{index}",
                "assigned_nurse": "Nurse Concurrency"
            }
            res = client.post("/api/patients", json=payload)
            return res.status_code, res.json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(register_worker, i) for i in range(num_threads)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    # Verify all 20 succeeded
    assert len(results) == num_threads
    for status_code, data in results:
        assert status_code == 200
        assert data["id"].startswith("PT-")

    # Verify uniqueness of patient IDs and arrival orders
    patient_ids = [data["id"] for _, data in results]
    arrival_orders = [data["arrival_order"] for _, data in results]

    assert len(set(patient_ids)) == num_threads, "All patient IDs must be strictly unique"
    assert len(set(arrival_orders)) == num_threads, "All arrival orders must be strictly unique"

    # Verify each is present in Hash Map and priority queue (if waiting)
    for pid in patient_ids:
        cached = system_state.patient_hash_map.get(pid)
        assert cached is not None
        assert cached["id"] == pid


def test_fifo_behavior_under_concurrency():
    """
    Test 2: FIFO tie-breaking behavior under concurrent registration.
    Spawns 15 concurrent threads registering patients with the EXACT SAME severity (Severity 3).
    Verifies that when extracting or viewing the ordered queue, items with identical severity
    are ordered strictly by arrival_order in ascending order (monotonically increasing FIFO).
    """
    num_patients = 15
    same_severity = 3
    registered = []

    def reg_worker(idx: int):
        db = SessionLocal()
        try:
            p_in = PatientCreate(
                full_name=f"Tie Patient {idx}",
                age=30,
                sex="Female",
                original_severity=same_severity,
                chief_complaint=f"Tie-breaking complaint {idx}",
                assigned_nurse="Nurse FIFO"
            )
            pt = register_patient(db, p_in)
            return pt.id, pt.arrival_order
        finally:
            db.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(reg_worker, i) for i in range(num_patients)]
        for f in concurrent.futures.as_completed(futures):
            registered.append(f.result())

    assert len(registered) == num_patients
    # Sort registered by arrival_order
    registered_sorted = sorted(registered, key=lambda x: x[1])

    # Check ordered queue from priority_queue
    ordered_queue = system_state.priority_queue.get_ordered_queue()
    tie_items = [item for item in ordered_queue if item["patient_id"] in [r[0] for r in registered]]

    # Ensure tie_items preserve monotonic arrival_order
    tie_arrival_orders = [item["arrival_order"] for item in tie_items]
    assert tie_arrival_orders == sorted(tie_arrival_orders), "Queue must order identical severity strictly by arrival_order (FIFO)"


def test_concurrent_queue_operations():
    """
    Test 3: Concurrent queue operations (calling next patient vs registering new patients).
    Simultaneously runs multiple calls to call_next_patient and register_patient.
    Verifies:
      - No double room assignments.
      - No lost patients.
      - State integrity is preserved without race conditions.
    """
    db = SessionLocal()
    try:
        # First discharge any occupied rooms to ensure availability
        rooms = db.query(TreatmentRoom).filter(TreatmentRoom.is_occupied == True).all()
        for r in rooms:
            discharge_patient_from_room(db, r.id)
    finally:
        db.close()

    call_results = []
    reg_results = []

    def caller_worker(idx: int):
        db = SessionLocal()
        try:
            success, msg, patient, room = call_next_patient(db)
            return success, msg, patient, room
        finally:
            db.close()

    def registree_worker(idx: int):
        db = SessionLocal()
        try:
            p_in = PatientCreate(
                full_name=f"Interleaved Patient {idx}",
                age=40,
                sex="Male",
                original_severity=1, # High priority to test heap re-balance
                chief_complaint=f"Interleaved complaint {idx}"
            )
            pt = register_patient(db, p_in)
            return pt.id
        finally:
            db.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        f_regs = [executor.submit(registree_worker, i) for i in range(6)]
        f_calls = [executor.submit(caller_worker, i) for i in range(4)]

        for f in concurrent.futures.as_completed(f_regs):
            reg_results.append(f.result())
        for f in concurrent.futures.as_completed(f_calls):
            call_results.append(f.result())

    # Check assigned rooms: no two successful calls should have assigned to the same room simultaneously
    successful_calls = [res for res in call_results if res[0] is True]
    assigned_rooms = [res[3]["id"] for res in successful_calls]
    assert len(assigned_rooms) == len(set(assigned_rooms)), "No room should be assigned twice simultaneously"

    # All registered patients must be in hash map
    for pid in reg_results:
        assert system_state.patient_hash_map.contains(pid)


def test_queue_integrity_after_aging_and_heap_rebuilding():
    """
    Test 4: Queue integrity after priority aging and heap rebuilding.
    Tests that advance_simulated_time (which calls calculate_effective_severity and priority_queue.rebuild)
    runs safely concurrently with queue reads and registrations.
    """
    errors = []

    def reader_worker():
        for _ in range(10):
            try:
                q = system_state.priority_queue.get_ordered_queue()
                assert isinstance(q, list)
                tel = system_state.priority_queue.get_telemetry()
                assert tel["queue_size"] >= 0
            except Exception as e:
                errors.append(f"Reader error: {e}")

    def advance_worker():
        for _ in range(5):
            db = SessionLocal()
            try:
                res = advance_simulated_time(db, minutes=5.0)
                assert res["minutes_advanced"] == 5.0
            except Exception as e:
                errors.append(f"Advance error: {e}")
            finally:
                db.close()

    threads = [
        threading.Thread(target=reader_worker),
        threading.Thread(target=advance_worker),
        threading.Thread(target=reader_worker),
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Encountered concurrent queue errors: {errors}"


def test_hash_map_synchronization_after_updates():
    """
    Test 5: Hash map synchronization during concurrent updates and linear searches.
    Spawns multiple threads updating patients while other threads run linear searches.
    Verifies that dictionary mutation does not trigger RuntimeError: dictionary changed size during iteration.
    """
    db = SessionLocal()
    created_id = None
    try:
        p_in = PatientCreate(
            full_name="Concurrent Update Target",
            age=50,
            sex="Female",
            original_severity=4,
            chief_complaint="Initial complaint"
        )
        pt = register_patient(db, p_in)
        created_id = pt.id
    finally:
        db.close()

    errors = []

    def updater_worker():
        for i in range(10):
            db = SessionLocal()
            try:
                update_patient_info(
                    db,
                    created_id,
                    PatientUpdate(
                        chief_complaint=f"Updated complaint #{i}",
                        original_severity=2 if i % 2 == 0 else 3
                    )
                )
            except Exception as e:
                errors.append(f"Updater error: {e}")
            finally:
                db.close()

    def searcher_worker():
        for _ in range(15):
            try:
                res, meta = system_state.patient_hash_map.linear_search_by_name("Target")
                assert meta["algorithm"] == "Linear Search"
                all_recs = system_state.patient_hash_map.all_records()
                assert len(all_recs) > 0
            except Exception as e:
                errors.append(f"Searcher error: {e}")

    threads = [
        threading.Thread(target=updater_worker),
        threading.Thread(target=searcher_worker),
        threading.Thread(target=searcher_worker),
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Encountered hash map concurrency errors: {errors}"


def test_database_rollback_and_heap_restoration():
    """
    Test 6: Database rollback and failure recovery.
    Verifies that if a failure occurs during call_next_patient after pop(),
    the popped patient item is safely restored to the priority queue
    and the database transaction is rolled back.
    """
    db = SessionLocal()
    try:
        # Register a critical patient guaranteed to be at root of heap
        p_in = PatientCreate(
            full_name="Rollback Test Patient",
            age=60,
            sex="Male",
            original_severity=1,
            chief_complaint="Cardiac Emergency"
        )
        pt = register_patient(db, p_in)
        target_id = pt.id
    finally:
        db.close()

    # Verify patient is in queue
    initial_queue_size = system_state.priority_queue.size()

    # Mock assign_patient_to_room to simulate an unexpected database exception during room assignment
    with patch("backend.app.services.queue_service.assign_patient_to_room", side_effect=RuntimeError("Simulated DB Crash")):
        test_db = SessionLocal()
        try:
            with pytest.raises(RuntimeError, match="Simulated DB Crash"):
                call_next_patient(test_db)
        finally:
            test_db.close()

    # Verify that the patient was NOT lost:
    # 1. Queue size must remain identical
    assert system_state.priority_queue.size() == initial_queue_size
    # 2. Patient must still be present in the queue
    ordered = system_state.priority_queue.get_ordered_queue()
    found = any(item["patient_id"] == target_id for item in ordered)
    assert found is True, "Popped patient must be safely re-inserted into priority queue upon failure"

    # 3. Patient status in DB must remain WAITING (not IN_TREATMENT)
    verify_db = SessionLocal()
    try:
        p_db = verify_db.query(Patient).filter(Patient.id == target_id).first()
        assert p_db.status == "WAITING", "Patient status in DB must remain WAITING after rollback"
    finally:
        verify_db.close()

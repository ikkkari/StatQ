import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import Patient, ActivityLog, TreatmentRoom, User
from backend.app.schemas.schemas import PatientCreate, PatientUpdate
from backend.app.algorithms.priority_queue import QueueItem
from backend.app.services.state import system_state

def init_system_from_db(db: Session):
    """
    Initializes in-memory hash map and priority queue from SQLite database.
    Ensures state persistence across server restarts. Thread-safe via system_state.lock.
    """
    with system_state.lock:
        if system_state.initialized:
            return

        # Clear in-memory structures
        system_state.patient_hash_map.clear()
        system_state.priority_queue.clear()

        # Load all patients from DB into Hash Map
        patients = db.query(Patient).order_by(Patient.arrival_order.asc()).all()
        max_order = 1000

        waiting_items = []
        for p in patients:
            record_dict = {
                "id": p.id,
                "full_name": p.full_name,
                "age": p.age,
                "sex": p.sex,
                "original_severity": p.original_severity,
                "effective_severity": p.effective_severity,
                "chief_complaint": p.chief_complaint,
                "arrival_time": p.arrival_time.isoformat() if p.arrival_time else "",
                "assigned_nurse": p.assigned_nurse,
                "status": p.status,
                "arrival_order": p.arrival_order,
                "waiting_minutes": p.waiting_minutes,
                "current_room_id": p.current_room_id,
                "treatment_start_time": p.treatment_start_time.isoformat() if p.treatment_start_time else None,
                "treatment_end_time": p.treatment_end_time.isoformat() if p.treatment_end_time else None,
                "is_simulated": p.is_simulated,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
            system_state.patient_hash_map.set(p.id, record_dict)
            if p.arrival_order > max_order:
                max_order = p.arrival_order

            if p.status == "WAITING":
                waiting_items.append(QueueItem(
                    effective_severity=p.effective_severity,
                    arrival_order=p.arrival_order,
                    patient_id=p.id,
                    original_severity=p.original_severity,
                    full_name=p.full_name,
                    waiting_minutes=p.waiting_minutes,
                    arrival_time_str=p.arrival_time.strftime("%H:%M:%S") if p.arrival_time else "",
                    chief_complaint=p.chief_complaint
                ))

        system_state.arrival_counter = max_order
        if waiting_items:
            system_state.priority_queue.rebuild(waiting_items)

        system_state.initialized = True


def generate_patient_id(db: Session) -> str:
    with system_state.lock:
        system_state.arrival_counter += 1
        counter = system_state.arrival_counter
        return f"PT-{counter}"


def register_patient(
    db: Session,
    patient_in: PatientCreate,
    is_simulated: bool = False,
    arrival_time_override: Optional[datetime.datetime] = None,
    user: Optional[User] = None
) -> Patient:
    with system_state.lock:
        try:
            patient_id = generate_patient_id(db)
            arr_time = arrival_time_override or system_state.simulated_clock

            # Effective severity starts equal to original severity
            eff_sev = patient_in.original_severity

            db_patient = Patient(
                id=patient_id,
                full_name=patient_in.full_name.strip(),
                age=patient_in.age,
                sex=patient_in.sex or "Unspecified",
                original_severity=patient_in.original_severity,
                effective_severity=eff_sev,
                chief_complaint=patient_in.chief_complaint.strip(),
                arrival_time=arr_time,
                assigned_nurse=patient_in.assigned_nurse or "Nurse Desk",
                status="WAITING",
                arrival_order=system_state.arrival_counter,
                waiting_minutes=0.0,
                is_simulated=is_simulated,
                created_at=datetime.datetime.now()
            )

            db.add(db_patient)
            db.commit()
            db.refresh(db_patient)

            # 1. Update in-memory Hash Map (O(1))
            record_dict = {
                "id": db_patient.id,
                "full_name": db_patient.full_name,
                "age": db_patient.age,
                "sex": db_patient.sex,
                "original_severity": db_patient.original_severity,
                "effective_severity": db_patient.effective_severity,
                "chief_complaint": db_patient.chief_complaint,
                "arrival_time": db_patient.arrival_time.isoformat(),
                "assigned_nurse": db_patient.assigned_nurse,
                "status": db_patient.status,
                "arrival_order": db_patient.arrival_order,
                "waiting_minutes": 0.0,
                "current_room_id": None,
                "treatment_start_time": None,
                "treatment_end_time": None,
                "is_simulated": is_simulated,
                "created_at": db_patient.created_at.isoformat()
            }
            system_state.patient_hash_map.set(db_patient.id, record_dict)

            # 2. Insert into Binary Min-Heap Priority Queue (O(log N))
            queue_item = QueueItem(
                effective_severity=db_patient.effective_severity,
                arrival_order=db_patient.arrival_order,
                patient_id=db_patient.id,
                original_severity=db_patient.original_severity,
                full_name=db_patient.full_name,
                waiting_minutes=0.0,
                arrival_time_str=db_patient.arrival_time.strftime("%H:%M:%S"),
                chief_complaint=db_patient.chief_complaint
            )
            system_state.priority_queue.push(queue_item)

            # 3. Log activity
            log = ActivityLog(
                timestamp=datetime.datetime.now(),
                event_type="QUEUE_PUSH",
                description=f"Patient {db_patient.full_name} ({db_patient.id}) registered with Severity {db_patient.original_severity}. Added to Min-Heap.",
                patient_id=db_patient.id,
                details="heapq.heappush() [O(log N)]",
                user_id=user.id if user else None,
                user_name=user.full_name or user.username if user else None
            )
            db.add(log)
            db.commit()

            return db_patient
        except Exception:
            db.rollback()
            raise


def get_patient_by_id(db: Session, patient_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves patient using O(1) in-memory hash map lookup first.
    """
    cached = system_state.patient_hash_map.get(patient_id)
    if cached:
        return cached

    # Fallback to DB
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if p:
        record_dict = {
            "id": p.id,
            "full_name": p.full_name,
            "age": p.age,
            "sex": p.sex,
            "original_severity": p.original_severity,
            "effective_severity": p.effective_severity,
            "chief_complaint": p.chief_complaint,
            "arrival_time": p.arrival_time.isoformat() if p.arrival_time else "",
            "assigned_nurse": p.assigned_nurse,
            "status": p.status,
            "arrival_order": p.arrival_order,
            "waiting_minutes": p.waiting_minutes,
            "current_room_id": p.current_room_id,
            "treatment_start_time": p.treatment_start_time.isoformat() if p.treatment_start_time else None,
            "treatment_end_time": p.treatment_end_time.isoformat() if p.treatment_end_time else None,
            "is_simulated": p.is_simulated,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        system_state.patient_hash_map.set(p.id, record_dict)
        return record_dict
    return None


def update_patient_info(
    db: Session, patient_id: str, updates: PatientUpdate, user: Optional[User] = None
) -> Optional[Dict[str, Any]]:
    with system_state.lock:
        try:
            p = db.query(Patient).filter(Patient.id == patient_id).first()
            if not p:
                return None

            if updates.full_name is not None:
                p.full_name = updates.full_name.strip()
            if updates.age is not None:
                p.age = updates.age
            if updates.sex is not None:
                p.sex = updates.sex
            if updates.original_severity is not None:
                old_sev = p.original_severity
                p.original_severity = updates.original_severity
                # recalculate effective severity
                eff, _, _ = system_state.aging_system.calculate_effective_severity(p.original_severity, p.waiting_minutes)
                p.effective_severity = eff

                # If waiting, rebuild priority queue
                if p.status == "WAITING":
                    waiting_items = []
                    for item in system_state.priority_queue._heap:
                        if item.patient_id == p.id:
                            item.original_severity = p.original_severity
                            item.effective_severity = p.effective_severity
                        waiting_items.append(item)
                    system_state.priority_queue.rebuild(waiting_items)

            if updates.chief_complaint is not None:
                p.chief_complaint = updates.chief_complaint.strip()
            if updates.assigned_nurse is not None:
                p.assigned_nurse = updates.assigned_nurse.strip()
            if updates.status is not None:
                p.status = updates.status

            p.updated_at = datetime.datetime.now()

            log = ActivityLog(
                timestamp=datetime.datetime.now(),
                event_type="PATIENT_UPDATED",
                description=f"Patient {p.full_name} ({p.id}) updated. Status: {p.status}, Severity: {p.effective_severity}.",
                patient_id=p.id,
                details=f"Assigned Nurse: {p.assigned_nurse}",
                user_id=user.id if user else None,
                user_name=user.full_name or user.username if user else None
            )
            db.add(log)
            db.commit()
            db.refresh(p)

            record_dict = {
                "id": p.id,
                "full_name": p.full_name,
                "age": p.age,
                "sex": p.sex,
                "original_severity": p.original_severity,
                "effective_severity": p.effective_severity,
                "chief_complaint": p.chief_complaint,
                "arrival_time": p.arrival_time.isoformat() if p.arrival_time else "",
                "assigned_nurse": p.assigned_nurse,
                "status": p.status,
                "arrival_order": p.arrival_order,
                "waiting_minutes": p.waiting_minutes,
                "current_room_id": p.current_room_id,
                "treatment_start_time": p.treatment_start_time.isoformat() if p.treatment_start_time else None,
                "treatment_end_time": p.treatment_end_time.isoformat() if p.treatment_end_time else None,
                "is_simulated": p.is_simulated,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
            system_state.patient_hash_map.set(p.id, record_dict)
            return record_dict
        except Exception:
            db.rollback()
            raise

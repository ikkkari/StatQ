import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import TreatmentRoom, Patient, TreatmentRecord, ActivityLog
from backend.app.services.state import system_state

DEFAULT_ROOMS = [
    {"id": "TR-101", "name": "Trauma Bay 1", "room_type": "Critical Care", "assigned_doctor": "Dr. Marcus Chen"},
    {"id": "TR-102", "name": "Trauma Bay 2", "room_type": "Critical Care", "assigned_doctor": "Dr. Elena Rostova"},
    {"id": "TR-103", "name": "Acute Suite A", "room_type": "Acute Care", "assigned_doctor": "Dr. Sarah Jenkins"},
    {"id": "TR-104", "name": "Acute Suite B", "room_type": "Acute Care", "assigned_doctor": "Dr. David O'Connor"},
    {"id": "TR-105", "name": "Rapid Care 1", "room_type": "Fast Track", "assigned_doctor": "Dr. Aisha Patel"},
    {"id": "TR-106", "name": "Rapid Care 2", "room_type": "Fast Track", "assigned_doctor": "Dr. Michael Chang"},
]

def init_rooms(db: Session):
    existing = db.query(TreatmentRoom).count()
    if existing == 0:
        for r in DEFAULT_ROOMS:
            db_room = TreatmentRoom(
                id=r["id"],
                name=r["name"],
                room_type=r["room_type"],
                is_occupied=False,
                current_patient_id=None,
                occupied_at=None,
                assigned_doctor=r["assigned_doctor"]
            )
            db.add(db_room)
        db.commit()


def get_all_rooms_with_details(db: Session) -> List[Dict[str, Any]]:
    rooms = db.query(TreatmentRoom).order_by(TreatmentRoom.id.asc()).all()
    results = []
    for r in rooms:
        pt_name = None
        pt_sev = None
        pt_complaint = None
        if r.is_occupied and r.current_patient_id:
            pt = system_state.patient_hash_map.get(r.current_patient_id)
            if not pt:
                db_pt = db.query(Patient).filter(Patient.id == r.current_patient_id).first()
                if db_pt:
                    pt_name = db_pt.full_name
                    pt_sev = db_pt.effective_severity
                    pt_complaint = db_pt.chief_complaint
            else:
                pt_name = pt.get("full_name")
                pt_sev = pt.get("effective_severity")
                pt_complaint = pt.get("chief_complaint")

        results.append({
            "id": r.id,
            "name": r.name,
            "room_type": r.room_type,
            "is_occupied": r.is_occupied,
            "current_patient_id": r.current_patient_id,
            "current_patient_name": pt_name,
            "current_patient_severity": pt_sev,
            "current_patient_complaint": pt_complaint,
            "occupied_at": r.occupied_at.isoformat() if r.occupied_at else None,
            "assigned_doctor": r.assigned_doctor
        })
    return results


def find_available_room(db: Session) -> Optional[TreatmentRoom]:
    return db.query(TreatmentRoom).filter(TreatmentRoom.is_occupied == False).first()


def assign_patient_to_room(
    db: Session, patient_id: str, room_id: Optional[str] = None
) -> Tuple[bool, str, Optional[TreatmentRoom], Optional[Patient]]:
    with system_state.lock:
        try:
            # Find room
            if room_id:
                room = db.query(TreatmentRoom).filter(TreatmentRoom.id == room_id).first()
                if not room:
                    return False, f"Room {room_id} not found.", None, None
                if room.is_occupied:
                    return False, f"Room {room.name} ({room.id}) is already occupied.", None, None
            else:
                room = find_available_room(db)
                if not room:
                    return False, "All treatment rooms are currently occupied. Cannot call next patient.", None, None

            # Find patient
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            if not patient:
                return False, f"Patient {patient_id} not found.", None, None

            now = datetime.datetime.now()

            # Assign room
            room.is_occupied = True
            room.current_patient_id = patient.id
            room.occupied_at = now

            # Update patient
            patient.status = "IN_TREATMENT"
            patient.current_room_id = room.id
            patient.treatment_start_time = now

            # Create treatment record
            t_record = TreatmentRecord(
                patient_id=patient.id,
                room_id=room.id,
                room_name=room.name,
                admitted_at=now,
                notes=f"Triage intake complaint: {patient.chief_complaint}"
            )
            db.add(t_record)

            # Activity log
            log = ActivityLog(
                timestamp=now,
                event_type="ROOM_ASSIGNED",
                description=f"Patient {patient.full_name} ({patient.id}) assigned to {room.name} ({room.id}).",
                patient_id=patient.id,
                details=f"Status changed WAITING -> IN_TREATMENT"
            )
            db.add(log)

            db.commit()
            db.refresh(room)
            db.refresh(patient)

            # Update in-memory hash map
            pt_cached = system_state.patient_hash_map.get(patient.id)
            if pt_cached:
                pt_cached["status"] = "IN_TREATMENT"
                pt_cached["current_room_id"] = room.id
                pt_cached["treatment_start_time"] = now.isoformat()
                system_state.patient_hash_map.set(patient.id, pt_cached)

            return True, f"Patient {patient.full_name} assigned to {room.name}.", room, patient
        except Exception:
            db.rollback()
            raise


def discharge_patient_from_room(
    db: Session, room_id: str, notes: str = "Treated and discharged.", outcome: str = "Treated & Discharged"
) -> Tuple[bool, str, Optional[TreatmentRoom], Optional[Patient]]:
    with system_state.lock:
        try:
            room = db.query(TreatmentRoom).filter(TreatmentRoom.id == room_id).first()
            if not room:
                return False, f"Room {room_id} not found.", None, None

            if not room.is_occupied or not room.current_patient_id:
                return False, f"Room {room.name} is not currently occupied.", None, None

            patient_id = room.current_patient_id
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            now = datetime.datetime.now()

            # Update TreatmentRecord
            t_record = db.query(TreatmentRecord).filter(
                TreatmentRecord.patient_id == patient_id,
                TreatmentRecord.room_id == room.id,
                TreatmentRecord.discharged_at == None
            ).order_by(TreatmentRecord.id.desc()).first()

            if t_record:
                t_record.discharged_at = now
                t_record.notes = notes
                t_record.outcome = outcome

            # Free the room
            room.is_occupied = False
            room.current_patient_id = None
            room.occupied_at = None

            # Update patient status
            if patient:
                patient.status = "COMPLETED"
                patient.current_room_id = None
                patient.treatment_end_time = now

                # Update hash map
                pt_cached = system_state.patient_hash_map.get(patient.id)
                if pt_cached:
                    pt_cached["status"] = "COMPLETED"
                    pt_cached["current_room_id"] = None
                    pt_cached["treatment_end_time"] = now.isoformat()
                    system_state.patient_hash_map.set(patient.id, pt_cached)

            # Activity log
            log = ActivityLog(
                timestamp=now,
                event_type="TREATMENT_COMPLETE",
                description=f"Treatment concluded for {patient.full_name if patient else patient_id}. Room {room.name} released.",
                patient_id=patient_id,
                details=f"Outcome: {outcome}. Room now AVAILABLE."
            )
            db.add(log)

            db.commit()
            db.refresh(room)
            if patient:
                db.refresh(patient)

            return True, f"Room {room.name} is now available.", room, patient
        except Exception:
            db.rollback()
            raise

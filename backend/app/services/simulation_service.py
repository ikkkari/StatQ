import random
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import Patient, TreatmentRoom, TreatmentRecord, ActivityLog
from backend.app.schemas.schemas import PatientCreate
from backend.app.services.patient_service import register_patient, init_system_from_db
from backend.app.services.queue_service import advance_simulated_time
from backend.app.services.state import system_state

FIRST_NAMES = [
    "Alexander", "Beatrix", "Caleb", "Daphne", "Ethan", "Fatima", "Gabriel", "Helena",
    "Isaac", "Jocelyn", "Kai", "Layla", "Mateo", "Nora", "Oliver", "Penelope", "Quinn",
    "Rafael", "Sienna", "Theo", "Uma", "Victor", "Willa", "Xavier", "Yasmine", "Zachary"
]

LAST_NAMES = [
    "Vance", "Mercer", "Holloway", "Sterling", "Kowalski", "Chen", "Ramirez", "Adler",
    "Sinclair", "Novak", "Hawthorne", "Patel", "Thorne", "Gallagher", "Lindqvist", "Dubois"
]

NURSES = ["Nurse Rodriguez, RN", "Nurse Bradley, BSN", "Nurse Kim, RN", "Nurse Tanaka, CEN"]

CLINICAL_CASES = {
    1: [
        "Cardiac arrest with CPR in progress by EMS",
        "Major polytrauma with unstable vitals following fall",
        "Acute respiratory failure with severe cyanosis",
        "Unresponsive patient following sudden collapse",
        "Anaphylactic shock with severe laryngeal edema"
    ],
    2: [
        "Severe crushing substernal chest pain radiating to left jaw",
        "Sudden right-sided hemiparesis and acute facial droop (FAST+)",
        "Status epilepticus with postictal confusion",
        "High-velocity MVA with severe blunt abdominal tenderness",
        "Severe asthma exacerbation refractory to inhaled bronchodilators"
    ],
    3: [
        "Acute severe right lower quadrant pain, positive McBurney sign",
        "High persistent fever (103.8°F) with productive cough and rigor",
        "Suspected closed displaced tibial fracture with distal pulses intact",
        "Severe unremitting flank colic with microscopic hematuria",
        "Moderate dehydration secondary to acute infectious gastroenteritis"
    ],
    4: [
        "Deep forearm laceration requiring layered primary closure",
        "Inversion ankle injury with acute localized edema and ecchymosis",
        "Acute dysuria and frequency without costovertebral tenderness",
        "Minor cranial contusion without loss of consciousness or nausea",
        "Acute lumbar musculoligamentous strain after lifting load"
    ],
    5: [
        "Superficial dorsal finger abrasion requiring antiseptic dressing",
        "Outpatient maintenance prescription refill for chronic hypertension",
        "Post-procedure suture removal from healed elective incision",
        "Mild upper respiratory congestion with clear rhinorrhea for 2 days",
        "Isolated non-pruritic localized contact dermatitis on left forearm"
    ]
}

def generate_random_patient_payload() -> PatientCreate:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    full_name = f"{first} {last}"
    age = random.randint(18, 86)
    sex = random.choice(["Male", "Female"])

    # Weight severities realistically: slightly more levels 2, 3, 4, fewer 1s and 5s
    severity = random.choices([1, 2, 3, 4, 5], weights=[10, 25, 30, 25, 10])[0]
    complaint = random.choice(CLINICAL_CASES[severity])
    nurse = random.choice(NURSES)

    return PatientCreate(
        full_name=full_name,
        age=age,
        sex=sex,
        original_severity=severity,
        chief_complaint=complaint,
        assigned_nurse=nurse
    )


def generate_batch_patients(db: Session, count: int = 5) -> List[Dict[str, Any]]:
    created = []
    for _ in range(count):
        payload = generate_random_patient_payload()
        pt = register_patient(db, payload, is_simulated=True)
        created.append({
            "id": pt.id,
            "full_name": pt.full_name,
            "severity": pt.original_severity,
            "complaint": pt.chief_complaint,
            "arrival_order": pt.arrival_order
        })
    return created


def reset_simulation_data(db: Session, only_simulated: bool = True) -> Dict[str, Any]:
    """
    Resets simulation data without corrupting persistent production records if only_simulated=True.
    """
    if only_simulated:
        sim_pts = db.query(Patient).filter(Patient.is_simulated == True).all()
        sim_ids = [p.id for p in sim_pts]

        # Reset rooms occupied by simulated patients
        rooms = db.query(TreatmentRoom).filter(TreatmentRoom.current_patient_id.in_(sim_ids)).all()
        for r in rooms:
            r.is_occupied = False
            r.current_patient_id = None
            r.occupied_at = None

        # Delete treatment records and activity logs
        db.query(TreatmentRecord).filter(TreatmentRecord.patient_id.in_(sim_ids)).delete(synchronize_session=False)
        db.query(ActivityLog).filter(ActivityLog.patient_id.in_(sim_ids)).delete(synchronize_session=False)

        # Delete simulated patients
        db.query(Patient).filter(Patient.is_simulated == True).delete(synchronize_session=False)
        db.commit()
    else:
        # Full reset
        db.query(TreatmentRecord).delete()
        db.query(ActivityLog).delete()
        rooms = db.query(TreatmentRoom).all()
        for r in rooms:
            r.is_occupied = False
            r.current_patient_id = None
            r.occupied_at = None
        db.query(Patient).delete()
        db.commit()

    # Reset state clock & reinit from remaining DB records
    system_state.simulated_minutes_elapsed = 0.0
    system_state.simulated_clock = datetime.datetime.now()
    system_state.initialized = False
    init_system_from_db(db)

    # Log reset
    log = ActivityLog(
        timestamp=datetime.datetime.now(),
        event_type="SIMULATION_RESET",
        description="Simulation data successfully reset. Queue and room allocations refreshed.",
        patient_id=None,
        details="DSA heap and hash map reinitialized from clean state."
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "message": "Simulation data reset successfully.",
        "remaining_patients": system_state.patient_hash_map.size(),
        "remaining_in_queue": system_state.priority_queue.size()
    }

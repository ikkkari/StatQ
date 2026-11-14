import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import Patient, TreatmentRoom, ActivityLog
from backend.app.algorithms.priority_queue import QueueItem
from backend.app.services.state import system_state
from backend.app.services.room_service import find_available_room, assign_patient_to_room

def get_live_queue_data() -> Dict[str, Any]:
    """
    Returns ordered waiting queue and telemetry for the UI.
    """
    items = system_state.priority_queue.get_ordered_queue()
    telemetry = system_state.priority_queue.get_telemetry()
    return {
        "items": items,
        "total_waiting": len(items),
        "telemetry": telemetry
    }


def call_next_patient(db: Session) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Triage call next patient workflow:
    1. Check if any room is free.
    2. heappop() highest priority patient from Python min-heap.
    3. Assign to available room.
    4. Update status and broadcast.
    """
    # 1. Check room availability
    room = find_available_room(db)
    if not room:
        return False, "Cannot call next patient: All treatment rooms are currently occupied. Please discharge a patient first.", None, None

    # 2. Extract highest-priority patient from heap (O(log N))
    next_item = system_state.priority_queue.pop()
    if not next_item:
        return False, "Waiting queue is currently empty. No patients waiting.", None, None

    # 3. Assign to room
    success, msg, assigned_room, patient = assign_patient_to_room(db, next_item.patient_id, room.id)
    if not success:
        # Re-insert back into heap if room assignment somehow failed
        system_state.priority_queue.push(next_item)
        return False, msg, None, None

    # 4. Activity Log for Queue Pop
    now = datetime.datetime.now()
    log = ActivityLog(
        timestamp=now,
        event_type="QUEUE_POP",
        description=f"Highest-priority patient {patient.full_name} ({patient.id}) called from Min-Heap. Severity: {patient.effective_severity}.",
        patient_id=patient.id,
        details="heapq.heappop() [O(log N)]"
    )
    db.add(log)
    db.commit()

    patient_dict = {
        "id": patient.id,
        "full_name": patient.full_name,
        "age": patient.age,
        "sex": patient.sex,
        "original_severity": patient.original_severity,
        "effective_severity": patient.effective_severity,
        "chief_complaint": patient.chief_complaint,
        "status": patient.status,
        "arrival_order": patient.arrival_order,
        "arrival_time": patient.arrival_time.isoformat(),
        "waiting_minutes": patient.waiting_minutes,
        "current_room_id": patient.current_room_id,
        "treatment_start_time": patient.treatment_start_time.isoformat() if patient.treatment_start_time else None,
        "is_simulated": patient.is_simulated,
        "created_at": patient.created_at.isoformat()
    }

    room_dict = {
        "id": assigned_room.id,
        "name": assigned_room.name,
        "room_type": assigned_room.room_type,
        "is_occupied": assigned_room.is_occupied,
        "current_patient_id": assigned_room.current_patient_id,
        "current_patient_name": patient.full_name,
        "current_patient_severity": patient.effective_severity,
        "assigned_doctor": assigned_room.assigned_doctor
    }

    return True, f"Called {patient.full_name} into {assigned_room.name}.", patient_dict, room_dict


def advance_simulated_time(db: Session, minutes: float = 5.0) -> Dict[str, Any]:
    """
    Advances simulated time and performs priority aging sweep across all waiting patients.
    Rebuilds the binary min-heap to guarantee correct order.
    """
    system_state.simulated_minutes_elapsed += minutes
    system_state.simulated_clock += datetime.timedelta(minutes=minutes)

    # Fetch all waiting patients
    waiting_patients = db.query(Patient).filter(Patient.status == "WAITING").all()
    escalated_count = 0
    updated_items = []

    for p in waiting_patients:
        p.waiting_minutes += minutes
        new_eff, improved, _ = system_state.aging_system.calculate_effective_severity(
            p.original_severity, p.waiting_minutes
        )

        old_eff = p.effective_severity
        if new_eff < old_eff:
            p.effective_severity = new_eff
            escalated_count += 1
            # Log priority escalation
            log = ActivityLog(
                timestamp=datetime.datetime.now(),
                event_type="PRIORITY_AGED",
                description=f"Patient {p.full_name} ({p.id}) priority aged: Severity {old_eff} -> {new_eff} after {round(p.waiting_minutes, 1)} min wait.",
                patient_id=p.id,
                details=f"Aging Rule: {system_state.aging_system.interval_minutes}m interval"
            )
            db.add(log)

        # Update in-memory hash map
        cached = system_state.patient_hash_map.get(p.id)
        if cached:
            cached["waiting_minutes"] = p.waiting_minutes
            cached["effective_severity"] = p.effective_severity
            system_state.patient_hash_map.set(p.id, cached)

        updated_items.append(QueueItem(
            effective_severity=p.effective_severity,
            arrival_order=p.arrival_order,
            patient_id=p.id,
            original_severity=p.original_severity,
            full_name=p.full_name,
            waiting_minutes=p.waiting_minutes,
            arrival_time_str=p.arrival_time.strftime("%H:%M:%S") if p.arrival_time else "",
            chief_complaint=p.chief_complaint
        ))

    db.commit()

    # Rebuild the min-heap with updated priorities (O(N) heapify)
    system_state.priority_queue.rebuild(updated_items)

    return {
        "minutes_advanced": minutes,
        "total_elapsed_minutes": system_state.simulated_minutes_elapsed,
        "simulated_time": system_state.simulated_clock.strftime("%Y-%m-%d %H:%M:%S"),
        "patients_waiting": len(updated_items),
        "escalated_count": escalated_count,
        "dsa_operation": f"heapq.heapify() over {len(updated_items)} items [O(N)]"
    }

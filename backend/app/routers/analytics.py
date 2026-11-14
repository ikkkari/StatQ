from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models.models import Patient, TreatmentRoom, TreatmentRecord, ActivityLog, User
from backend.app.services.state import system_state
from backend.app.dependencies.auth import get_current_approved_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_approved_user)
) -> Dict[str, Any]:
    all_patients = db.query(Patient).all()
    total_count = len(all_patients)

    waiting_count = 0
    in_treatment_count = 0
    completed_count = 0
    cancelled_count = 0
    total_wait_minutes = 0.0

    severity_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    effective_severity_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for p in all_patients:
        if p.status == "WAITING":
            waiting_count += 1
            total_wait_minutes += (p.waiting_minutes or 0.0)
            effective_severity_counts[p.effective_severity] = effective_severity_counts.get(p.effective_severity, 0) + 1
        elif p.status == "IN_TREATMENT":
            in_treatment_count += 1
        elif p.status == "COMPLETED":
            completed_count += 1
        elif p.status == "CANCELLED":
            cancelled_count += 1

        severity_counts[p.original_severity] = severity_counts.get(p.original_severity, 0) + 1

    avg_wait = round(total_wait_minutes / waiting_count, 1) if waiting_count > 0 else 0.0

    # Rooms
    total_rooms = db.query(TreatmentRoom).count()
    occupied_rooms = db.query(TreatmentRoom).filter(TreatmentRoom.is_occupied == True).count()
    available_rooms = total_rooms - occupied_rooms

    # Severity distribution chart format
    SEVERITY_LABELS = {
        1: "Level 1 - Critical",
        2: "Level 2 - High",
        3: "Level 3 - Moderate",
        4: "Level 4 - Low",
        5: "Level 5 - Minor"
    }
    SEVERITY_COLORS = {
        1: "#EF4444",
        2: "#F97316",
        3: "#F59E0B",
        4: "#3B82F6",
        5: "#10B981"
    }

    severity_chart_data = [
        {
            "level": k,
            "label": SEVERITY_LABELS[k],
            "count": severity_counts[k],
            "effective_count": effective_severity_counts[k],
            "color": SEVERITY_COLORS[k]
        }
        for k in range(1, 6)
    ]

    # Status distribution
    status_distribution = [
        {"name": "Waiting", "value": waiting_count, "color": "#F59E0B"},
        {"name": "In Treatment", "value": in_treatment_count, "color": "#3B82F6"},
        {"name": "Completed", "value": completed_count, "color": "#10B981"},
    ]

    # Room occupancy rate
    occupancy_rate = round((occupied_rooms / total_rooms) * 100, 1) if total_rooms > 0 else 0.0

    # Highest priority patient
    highest_item = system_state.priority_queue.peek()
    highest_patient = None
    if highest_item:
        highest_patient = {
            "patient_id": highest_item.patient_id,
            "full_name": highest_item.full_name,
            "effective_severity": highest_item.effective_severity,
            "original_severity": highest_item.original_severity,
            "waiting_minutes": round(highest_item.waiting_minutes, 1),
            "complaint": highest_item.chief_complaint
        }

    return {
        "total_patients": total_count,
        "waiting_patients": waiting_count,
        "in_treatment_patients": in_treatment_count,
        "completed_patients": completed_count,
        "cancelled_patients": cancelled_count,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "available_rooms": available_rooms,
        "occupancy_rate": occupancy_rate,
        "average_waiting_time_minutes": avg_wait,
        "highest_priority_patient": highest_patient,
        "severity_distribution": severity_chart_data,
        "status_distribution": status_distribution,
        "hospital_name": system_state.hospital_name,
        "simulated_time": system_state.simulated_clock.strftime("%Y-%m-%d %H:%M:%S")
    }

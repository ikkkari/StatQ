from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import ActivityLog, User
from backend.app.schemas.schemas import ActivityLogResponse
from backend.app.services.state import system_state
from backend.app.dependencies.auth import get_current_approved_user, require_role

router = APIRouter(prefix="/api/dsa", tags=["DSA Intelligence"])

@router.get("/telemetry")
def get_dsa_telemetry(current_user: User = Depends(get_current_approved_user)) -> Dict[str, Any]:
    """
    Subtle technical telemetry for academic presentations:
    Data structures, operations, complexities, and real-time state.
    """
    heap_telemetry = system_state.priority_queue.get_telemetry()
    hash_telemetry = system_state.patient_hash_map.get_telemetry()

    return {
        "status": "active",
        "primary_structure": {
            "name": "Binary Min-Heap",
            "module": "Python heapq",
            "purpose": "Priority queue for live emergency triage ordering",
            "heap_size": heap_telemetry["queue_size"],
            "operation_count": heap_telemetry["operation_count"],
            "last_operation": heap_telemetry["last_operation"],
            "last_complexity": heap_telemetry["last_complexity"],
            "complexities": heap_telemetry["time_complexities"]
        },
        "secondary_structure": {
            "name": "Hash Map",
            "module": "Python dict",
            "purpose": "In-memory patient record caching and O(1) direct access by ID",
            "total_records": hash_telemetry["total_records"],
            "lookup_count": hash_telemetry["lookup_count"],
            "last_lookup_type": hash_telemetry["last_lookup_type"],
            "last_lookup_key": hash_telemetry["last_lookup_key"],
            "last_lookup_time_ms": hash_telemetry["last_lookup_time_ms"],
            "last_complexity": hash_telemetry["last_complexity"],
            "complexities": hash_telemetry["time_complexities"]
        },
        "aging_mechanism": {
            "name": "Priority Aging Escalation",
            "interval_minutes": system_state.aging_system.interval_minutes,
            "rebuild_strategy": "heapq.heapify() in O(N) time on time advancement",
            "purpose": "Prevents starvation of lower-acuity patients waiting for extended periods"
        }
    }


@router.get("/activity-logs", response_model=List[ActivityLogResponse])
def get_activity_logs(
    limit: int = Query(30, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "NURSE"]))
):
    """
    Activity log of genuine backend events (QUEUE_PUSH, QUEUE_POP, PRIORITY_AGED, ROOM_ASSIGNED, etc.)
    """
    logs = db.query(ActivityLog).order_by(ActivityLog.id.desc()).limit(limit).all()
    return logs

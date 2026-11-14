from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import QueueResponse, CallNextResponse
from backend.app.services.queue_service import get_live_queue_data, call_next_patient
from backend.app.websocket.manager import manager
from backend.app.dependencies.auth import get_current_approved_user, require_role, verify_csrf_token

router = APIRouter(prefix="/api/queue", tags=["Triage Queue"])

@router.get("", response_model=QueueResponse)
def get_queue(current_user: User = Depends(get_current_approved_user)):
    """
    Returns the live triage queue sorted in priority order from the Binary Min-Heap,
    along with DSA telemetry and complexity metadata.
    """
    return get_live_queue_data()


@router.post("/call-next", response_model=CallNextResponse)
async def call_next(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["ADMIN", "NURSE"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Extracts the highest-priority patient from the Python min-heap via heapq.heappop() [O(log N)],
    checks room availability, assigns patient to an available room, and broadcasts the event.
    """
    success, message, patient, room = call_next_patient(db, user=user)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    # Broadcast real-time update
    await manager.broadcast("PATIENT_CALLED", {
        "patient": patient,
        "room": room,
        "message": message
    })

    return {
        "success": True,
        "message": message,
        "patient": patient,
        "room": room,
        "remaining_in_queue": get_live_queue_data()["total_waiting"],
        "dsa_operation": "heapq.heappop() [O(log N)]"
    }

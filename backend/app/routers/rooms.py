from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import TreatmentRoomResponse, RoomDischargeRequest
from backend.app.services.room_service import (
    get_all_rooms_with_details,
    discharge_patient_from_room,
    assign_patient_to_room,
)
from backend.app.websocket.manager import manager
from backend.app.dependencies.auth import get_current_approved_user, require_role, verify_csrf_token

router = APIRouter(prefix="/api/rooms", tags=["Treatment Rooms"])

@router.get("", response_model=List[TreatmentRoomResponse])
def list_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_approved_user)
):
    return get_all_rooms_with_details(db)


@router.post("/{room_id}/discharge")
async def discharge_room(
    room_id: str,
    payload: RoomDischargeRequest = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["ADMIN", "NURSE"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Concludes treatment for the patient occupying room_id.
    Frees the room and marks patient status as COMPLETED.
    """
    success, msg, room, patient = discharge_patient_from_room(
        db, room_id, notes=payload.notes, outcome=payload.outcome, user=user
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    # Broadcast room freed
    await manager.broadcast("ROOM_UPDATED", {
        "room_id": room.id,
        "is_occupied": False,
        "message": msg
    })

    return {
        "success": True,
        "message": msg,
        "room_id": room.id,
        "patient_id": patient.id if patient else None
    }


@router.post("/{room_id}/assign")
async def assign_room(
    room_id: str,
    patient_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["ADMIN", "NURSE"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Manually assigns a patient to a specific room.
    """
    success, msg, room, patient = assign_patient_to_room(db, patient_id, room_id, user=user)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    await manager.broadcast("ROOM_UPDATED", {
        "room_id": room.id,
        "is_occupied": True,
        "patient_id": patient.id,
        "message": msg
    })

    return {
        "success": True,
        "message": msg,
        "room": room.id,
        "patient": patient.id
    }

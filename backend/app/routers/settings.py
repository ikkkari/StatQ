from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.schemas import SettingsUpdate
from backend.app.services.state import system_state
from backend.app.services.queue_service import advance_simulated_time

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

@router.get("")
def get_settings():
    return {
        "hospital_name": system_state.hospital_name,
        "aging_interval_minutes": system_state.aging_system.interval_minutes,
        "auto_advance_seconds": system_state.auto_advance_interval_seconds,
        "current_simulated_time": system_state.simulated_clock.strftime("%Y-%m-%d %H:%M:%S")
    }

@router.put("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    if payload.hospital_name is not None:
        system_state.hospital_name = payload.hospital_name.strip()
    if payload.aging_interval_minutes is not None:
        system_state.aging_system.set_interval(payload.aging_interval_minutes)
        # Trigger an aging sweep with 0 advance to apply new interval
        advance_simulated_time(db, minutes=0.0)
    if payload.auto_advance_seconds is not None:
        system_state.auto_advance_interval_seconds = max(1, payload.auto_advance_seconds)

    return {
        "status": "success",
        "message": "Settings updated successfully.",
        "settings": {
            "hospital_name": system_state.hospital_name,
            "aging_interval_minutes": system_state.aging_system.interval_minutes,
            "auto_advance_seconds": system_state.auto_advance_interval_seconds
        }
    }

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import Patient, User
from backend.app.schemas.schemas import (
    SimulationStatusResponse,
    AdvanceTimeRequest,
    GeneratePatientsRequest,
)
from backend.app.services.simulation_service import generate_batch_patients, reset_simulation_data
from backend.app.services.queue_service import advance_simulated_time
from backend.app.services.state import system_state
from backend.app.websocket.manager import manager
from backend.app.dependencies.auth import get_current_approved_user, require_role, verify_csrf_token

router = APIRouter(prefix="/api/simulation", tags=["Simulation Center"])

@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_approved_user)
):
    total_pts = db.query(Patient).count()
    sim_pts = db.query(Patient).filter(Patient.is_simulated == True).count()
    return {
        "is_active": system_state.is_simulation_running,
        "simulated_time": system_state.simulated_clock.strftime("%Y-%m-%d %H:%M:%S"),
        "simulated_minutes_elapsed": system_state.simulated_minutes_elapsed,
        "aging_interval": system_state.aging_system.interval_minutes,
        "patient_count_total": total_pts,
        "patient_count_simulated": sim_pts,
        "auto_advance_interval_seconds": system_state.auto_advance_interval_seconds
    }


@router.post("/generate")
async def generate_patients(
    payload: GeneratePatientsRequest = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["ADMIN"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Generates N simulated patients with realistic chief complaints matching severity scores.
    Registers each patient into SQLite, Hash Map, and the Min-Heap Priority Queue.
    Requires ADMIN role and valid CSRF token.
    """
    created = generate_batch_patients(db, count=payload.count)
    await manager.broadcast("SIMULATION_PATIENTS_GENERATED", {
        "count": len(created),
        "patients": created
    })
    return {
        "message": f"Successfully generated {len(created)} incoming emergency patients.",
        "generated": created
    }


@router.post("/advance-time")
async def advance_time(
    payload: AdvanceTimeRequest = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["ADMIN", "NURSE"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Advances simulated time by N minutes.
    Performs priority aging on all waiting patients and reorganizes the min-heap via heapify() [O(N)].
    Requires ADMIN or NURSE role and valid CSRF token.
    """
    result = advance_simulated_time(db, minutes=payload.minutes)
    await manager.broadcast("SIMULATION_TIME_ADVANCED", result)
    return result


@router.post("/toggle")
async def toggle_simulation(
    user: User = Depends(require_role(["ADMIN"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Toggles the automatic simulation state (start / pause).
    Requires ADMIN role and valid CSRF token.
    """
    system_state.is_simulation_running = not system_state.is_simulation_running
    await manager.broadcast("SIMULATION_STATUS_CHANGED", {
        "is_active": system_state.is_simulation_running
    })
    return {
        "is_active": system_state.is_simulation_running,
        "message": "Simulation started." if system_state.is_simulation_running else "Simulation paused."
    }


@router.post("/reset")
async def reset_simulation(
    only_simulated: bool = Body(True, embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["ADMIN"])),
    _: None = Depends(verify_csrf_token)
):
    """
    Resets simulation data and restores clean queue/room state.
    Requires ADMIN role and valid CSRF token.
    """
    result = reset_simulation_data(db, only_simulated=only_simulated)
    await manager.broadcast("SIMULATION_RESET", result)
    return result

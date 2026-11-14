from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import Patient, TreatmentRecord
from backend.app.schemas.schemas import PatientCreate, PatientUpdate, PatientResponse
from backend.app.services.patient_service import register_patient, get_patient_by_id, update_patient_info
from backend.app.services.state import system_state
from backend.app.websocket.manager import manager

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.post("", response_model=PatientResponse)
async def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    """
    Registers a new patient. Saves to SQLite, sets in-memory Hash Map (O(1)),
    and pushes to Priority Queue Binary Min-Heap (O(log N)).
    """
    patient = register_patient(db, payload)
    
    # Broadcast to connected WebSocket clients
    await manager.broadcast("PATIENT_REGISTERED", {
        "id": patient.id,
        "full_name": patient.full_name,
        "severity": patient.original_severity,
        "status": patient.status
    })

    return patient


@router.get("", response_model=List[PatientResponse])
def list_patients(
    query: Optional[str] = Query(None, description="Search query"),
    search_by: str = Query("all", pattern="^(all|id|name)$"),
    severity: Optional[int] = Query(None, ge=1, le=5),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List all patients with optional search and filters.
    Demonstrates O(1) hash map lookup for ID and O(N) linear search for Name.
    """
    all_recs = system_state.patient_hash_map.all_records()
    if not all_recs:
        # Fallback to DB if hash map is empty
        db_patients = db.query(Patient).order_by(Patient.arrival_order.desc()).all()
        return db_patients

    results = all_recs

    # Search filter
    if query and query.strip():
        q = query.strip()
        if search_by == "id":
            rec = system_state.patient_hash_map.get(q.upper())
            results = [rec] if rec else []
        elif search_by == "name":
            results, _ = system_state.patient_hash_map.linear_search_by_name(q)
        else: # "all"
            if q.upper().startswith("PT-") and system_state.patient_hash_map.contains(q.upper()):
                results = [system_state.patient_hash_map.get(q.upper())]
            else:
                results, _ = system_state.patient_hash_map.linear_search_by_name(q)

    # Severity filter
    if severity is not None:
        results = [r for r in results if r.get("original_severity") == severity or r.get("effective_severity") == severity]

    # Status filter
    if status and status != "ALL":
        results = [r for r in results if r.get("status") == status]

    # Sort by arrival_order descending for list view
    results = sorted(results, key=lambda x: x.get("arrival_order", 0), reverse=True)
    return results


@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """
    Direct patient lookup by ID.
    Uses O(1) in-memory Hash Map lookup.
    """
    patient = get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient with ID '{patient_id}' not found.")

    telemetry = system_state.patient_hash_map.get_telemetry()
    return {
        "patient": patient,
        "dsa_telemetry": telemetry
    }


@router.put("/{patient_id}")
async def update_patient(patient_id: str, payload: PatientUpdate, db: Session = Depends(get_db)):
    updated = update_patient_info(db, patient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Patient with ID '{patient_id}' not found.")

    await manager.broadcast("PATIENT_UPDATED", {"id": patient_id})
    return updated


@router.get("/{patient_id}/history")
def get_patient_history(patient_id: str, db: Session = Depends(get_db)):
    records = db.query(TreatmentRecord).filter(
        TreatmentRecord.patient_id == patient_id
    ).order_by(TreatmentRecord.admitted_at.desc()).all()

    return records

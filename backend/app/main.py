import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.database import engine, Base, SessionLocal
from backend.app.services.patient_service import init_system_from_db, register_patient
from backend.app.services.room_service import init_rooms
from backend.app.services.queue_service import advance_simulated_time
from backend.app.services.state import system_state
from backend.app.services.auth_service import get_session_by_token
from backend.app.websocket.manager import manager
from backend.app.schemas.schemas import PatientCreate
from backend.app.models.models import Patient, User
from backend.app.core.config import settings as app_settings

# Routers
from backend.app.routers import patients, queue, rooms, simulation, analytics, dsa, settings, auth

# Background task for auto simulation
async def simulation_background_loop():
    while True:
        try:
            await asyncio.sleep(system_state.auto_advance_interval_seconds)
            if system_state.is_simulation_running:
                db = SessionLocal()
                try:
                    result = advance_simulated_time(db, minutes=2.0)
                    await manager.broadcast("SIMULATION_TIME_ADVANCED", result)
                finally:
                    db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Simulation loop error: {e}")
            await asyncio.sleep(2)


def seed_initial_data():
    """
    Seeds initial realistic patient records if database is empty,
    so presentation and testing have instant rich data.
    """
    db = SessionLocal()
    try:
        init_rooms(db)
        count = db.query(Patient).count()
        if count == 0:
            sample_patients = [
                PatientCreate(
                    full_name="Marcus Vance",
                    age=62,
                    sex="Male",
                    original_severity=1,
                    chief_complaint="Severe chest pain radiating to neck, diaphoretic, BP 82/50",
                    assigned_nurse="Nurse Rodriguez, RN"
                ),
                PatientCreate(
                    full_name="Elena Rostova",
                    age=45,
                    sex="Female",
                    original_severity=2,
                    chief_complaint="Acute onset right hemiparesis and speech slurring (FAST positive)",
                    assigned_nurse="Nurse Bradley, BSN"
                ),
                PatientCreate(
                    full_name="Julian Thorne",
                    age=28,
                    sex="Male",
                    original_severity=3,
                    chief_complaint="Suspected acute appendicitis, acute right lower quadrant guarding",
                    assigned_nurse="Nurse Kim, RN"
                ),
                PatientCreate(
                    full_name="Sophia Chen",
                    age=34,
                    sex="Female",
                    original_severity=2,
                    chief_complaint="Severe asthma exacerbation, peak flow 45%, refractory to albuterol",
                    assigned_nurse="Nurse Tanaka, CEN"
                ),
                PatientCreate(
                    full_name="Liam Gallagher",
                    age=19,
                    sex="Male",
                    original_severity=4,
                    chief_complaint="Forearm laceration 6cm from broken glass, brisk oozing controlled",
                    assigned_nurse="Nurse Rodriguez, RN"
                ),
                PatientCreate(
                    full_name="Clara Oswald",
                    age=71,
                    sex="Female",
                    original_severity=3,
                    chief_complaint="Persistent high fever 103°F, productive cough and dyspnea",
                    assigned_nurse="Nurse Bradley, BSN"
                ),
                PatientCreate(
                    full_name="Lucas Sterling",
                    age=50,
                    sex="Male",
                    original_severity=5,
                    chief_complaint="Superficial index finger laceration, tetanus status up to date",
                    assigned_nurse="Nurse Kim, RN"
                ),
            ]
            for p in sample_patients:
                register_patient(db, p, is_simulated=False)

        init_system_from_db(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # In production (when DATABASE_URL is set), schema migrations are driven strictly by Alembic
    # In local development without DATABASE_URL, create_all() provides convenient zero-config initialization
    if not os.getenv("DATABASE_URL"):
        Base.metadata.create_all(bind=engine)
    seed_initial_data()
    sim_task = asyncio.create_task(simulation_background_loop())
    yield
    # Shutdown
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="StatQ: Emergency Room Triage Queue & Patient Record System",
    description="College DSA project simulating emergency room priority queue (binary min-heap), hash map, and aging.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Allow credentials with explicit trusted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(queue.router)
app.include_router(rooms.router)
app.include_router(simulation.router)
app.include_router(analytics.router)
app.include_router(dsa.router)
app.include_router(settings.router)

# Authenticated WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Validate session cookie on WebSocket handshake
    cookie_token = websocket.cookies.get(app_settings.COOKIE_NAME)
    if not cookie_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized: Missing session cookie.")
        return

    db = SessionLocal()
    try:
        session = get_session_by_token(db, cookie_token)
        if not session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized: Invalid or expired session.")
            return

        user = db.query(User).filter(User.id == session.user_id).first()
        if not user or user.status != "APPROVED":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized: Account pending approval or inactive.")
            return
    finally:
        db.close()

    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; clients may send ping or commands
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/")
def root():
    return {
        "system": "StatQ Emergency Room Triage Queue System",
        "status": "operational",
        "docs_url": "/docs",
        "dsa_core": {
            "queue_structure": "Binary Min-Heap (heapq)",
            "record_structure": "Hash Map (Python dict)",
            "aging_algorithm": "Priority Aging Escalation"
        }
    }

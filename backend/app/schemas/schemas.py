import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    age: int = Field(..., ge=0, le=130)
    sex: Optional[str] = Field("Unspecified", max_length=16)
    original_severity: int = Field(..., ge=1, le=5)
    chief_complaint: str = Field(..., min_length=2)
    assigned_nurse: Optional[str] = Field(None, max_length=64)

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=128)
    age: Optional[int] = Field(None, ge=0, le=130)
    sex: Optional[str] = None
    original_severity: Optional[int] = Field(None, ge=1, le=5)
    chief_complaint: Optional[str] = None
    assigned_nurse: Optional[str] = None
    status: Optional[str] = None

class PatientResponse(PatientBase):
    id: str
    effective_severity: int
    status: str
    arrival_order: int
    arrival_time: datetime.datetime
    waiting_minutes: float
    has_aged: bool = False
    treatment_start_time: Optional[datetime.datetime] = None
    treatment_end_time: Optional[datetime.datetime] = None
    current_room_id: Optional[str] = None
    is_simulated: bool = False
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class TreatmentRoomResponse(BaseModel):
    id: str
    name: str
    room_type: str
    is_occupied: bool
    current_patient_id: Optional[str] = None
    current_patient_name: Optional[str] = None
    current_patient_severity: Optional[int] = None
    current_patient_complaint: Optional[str] = None
    occupied_at: Optional[datetime.datetime] = None
    assigned_doctor: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RoomDischargeRequest(BaseModel):
    notes: Optional[str] = "Routine treatment concluded."
    outcome: Optional[str] = "Treated & Discharged"

class CallNextResponse(BaseModel):
    success: bool
    message: str
    patient: Optional[PatientResponse] = None
    room: Optional[TreatmentRoomResponse] = None
    remaining_in_queue: int = 0
    dsa_operation: str = "heappop() -> O(log N)"

class QueueItemResponse(BaseModel):
    position: int
    patient_id: str
    full_name: str
    effective_severity: int
    original_severity: int
    arrival_order: int
    waiting_minutes: float
    arrival_time: str
    chief_complaint: str
    has_aged: bool

class QueueResponse(BaseModel):
    items: List[QueueItemResponse]
    total_waiting: int
    telemetry: Dict[str, Any]

class ActivityLogResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    event_type: str
    description: str
    patient_id: Optional[str] = None
    details: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SimulationStatusResponse(BaseModel):
    is_active: bool
    simulated_time: str
    simulated_minutes_elapsed: float
    aging_interval: float
    patient_count_total: int
    patient_count_simulated: int
    auto_advance_interval_seconds: int

class AdvanceTimeRequest(BaseModel):
    minutes: float = Field(5.0, ge=0.0, le=120.0)

class GeneratePatientsRequest(BaseModel):
    count: int = Field(5, ge=1, le=50)

class SettingsUpdate(BaseModel):
    aging_interval_minutes: Optional[float] = Field(None, ge=1.0, le=60.0)
    total_rooms: Optional[int] = Field(None, ge=1, le=20)
    hospital_name: Optional[str] = None
    auto_advance_seconds: Optional[int] = None

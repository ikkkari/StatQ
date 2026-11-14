import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(32), primary_key=True, index=True) # e.g. PT-2026-001
    full_name = Column(String(128), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    sex = Column(String(16), nullable=True) # "Male", "Female", "Other"
    original_severity = Column(Integer, nullable=False) # 1 - 5
    effective_severity = Column(Integer, nullable=False) # 1 - 5 (aged priority)
    chief_complaint = Column(Text, nullable=False)
    arrival_time = Column(DateTime, default=datetime.datetime.now, nullable=False)
    assigned_nurse = Column(String(64), nullable=True)
    status = Column(String(32), default="WAITING", nullable=False, index=True) # WAITING, IN_TREATMENT, COMPLETED, CANCELLED
    arrival_order = Column(Integer, nullable=False, index=True) # Global monotonic counter for FIFO
    waiting_minutes = Column(Float, default=0.0) # Accumulated waiting time in simulation minutes
    treatment_start_time = Column(DateTime, nullable=True)
    treatment_end_time = Column(DateTime, nullable=True)
    current_room_id = Column(String(32), nullable=True)
    is_simulated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

    # Relationships
    treatment_records = relationship("TreatmentRecord", back_populates="patient", cascade="all, delete-orphan")


class TreatmentRoom(Base):
    __tablename__ = "treatment_rooms"

    id = Column(String(32), primary_key=True) # e.g. "TR-101"
    name = Column(String(64), nullable=False) # e.g. "Trauma Resus 1"
    room_type = Column(String(32), default="General Emergency") # "Critical Care", "Trauma", "General Emergency", "Fast Track"
    is_occupied = Column(Boolean, default=False, nullable=False)
    current_patient_id = Column(String(32), nullable=True)
    occupied_at = Column(DateTime, nullable=True)
    assigned_doctor = Column(String(64), nullable=True)


class TreatmentRecord(Base):
    __tablename__ = "treatment_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(32), ForeignKey("patients.id"), nullable=False, index=True)
    room_id = Column(String(32), nullable=False)
    room_name = Column(String(64), nullable=False)
    admitted_at = Column(DateTime, nullable=False)
    discharged_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    outcome = Column(String(64), default="Treated & Discharged") # "Treated & Discharged", "Admitted to ICU", "Transferred"

    patient = relationship("Patient", back_populates="treatment_records")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.now, nullable=False)
    event_type = Column(String(64), nullable=False, index=True)
    # e.g., "QUEUE_PUSH", "QUEUE_POP", "PRIORITY_AGED", "ROOM_ASSIGNED", "TREATMENT_COMPLETE", "HASH_LOOKUP"
    description = Column(String(255), nullable=False)
    patient_id = Column(String(32), nullable=True, index=True)
    user_id = Column(String(32), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name = Column(String(128), nullable=True) # Historical staff name snapshot
    details = Column(Text, nullable=True) # Additional JSON metadata or operation complexity string


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True, index=True) # e.g. USR-1001
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), default="UNASSIGNED", nullable=False) # ADMIN, NURSE, FRONT_DESK, UNASSIGNED
    status = Column(String(32), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED, SUSPENDED
    department = Column(String(64), default="Emergency Department", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(String(32), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_approved(self) -> bool:
        return self.status == "APPROVED"


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True) # UUID4 string
    session_token_hash = Column(String(64), unique=True, index=True, nullable=False) # SHA-256 hex digest
    csrf_token = Column(String(64), nullable=False)
    user_id = Column(String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.now, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    last_activity_at = Column(DateTime, default=datetime.datetime.now, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")

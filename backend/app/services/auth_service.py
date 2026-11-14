import datetime
import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.models import User, UserSession
from backend.app.core.security import (
    hash_password,
    verify_password,
    dummy_verify_password,
    generate_session_token,
    hash_session_token,
    generate_csrf_token,
)
from backend.app.core.config import settings


def generate_user_id(db: Session) -> str:
    """Generates unique sequential user ID, e.g. USR-1001."""
    count = db.query(func.count(User.id)).scalar() or 0
    return f"USR-{1001 + count}"


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    full_name: str,
    department: str = "Emergency Department",
    role: str = "UNASSIGNED",
    status: str = "PENDING",
    approved_by_id: Optional[str] = None
) -> User:
    user_id = generate_user_id(db)
    user = User(
        id=user_id,
        username=username.strip().lower(),
        email=email.strip().lower(),
        hashed_password=hash_password(password),
        full_name=full_name.strip(),
        role=role,
        status=status,
        department=department.strip(),
        created_at=datetime.datetime.now(),
        approved_at=datetime.datetime.now() if status == "APPROVED" else None,
        approved_by_id=approved_by_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(func.lower(User.username) == username.strip().lower()).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticates a user by username and password.
    Executes a dummy Argon2 verification if the user is missing to maintain
    constant-time execution and prevent user-enumeration timing attacks.
    """
    user = get_user_by_username(db, username)
    if not user:
        dummy_verify_password(password)
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def create_session(
    db: Session,
    user_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[str, str, UserSession]:
    """
    Creates a new server-side session.
    Multiple active sessions per user across devices are supported.
    Returns:
        (raw_token, csrf_token, session_record)
        Only the SHA-256 hash of raw_token is stored in the database.
    """
    raw_token, token_hash = generate_session_token()
    csrf_token = generate_csrf_token()
    now = datetime.datetime.now()
    expires_at = now + datetime.timedelta(seconds=settings.COOKIE_MAX_AGE_SECONDS)

    session = UserSession(
        id=str(uuid.uuid4()),
        session_token_hash=token_hash,
        csrf_token=csrf_token,
        user_id=user_id,
        created_at=now,
        expires_at=expires_at,
        last_activity_at=now,
        is_revoked=False,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token, csrf_token, session


def get_session_by_token(db: Session, raw_token: str) -> Optional[UserSession]:
    """
    Validates an incoming session cookie by hashing it and looking up its hash.
    Checks expiration, revocation, and updates last_activity_at.
    """
    if not raw_token:
        return None

    token_hash = hash_session_token(raw_token)
    session = db.query(UserSession).filter(
        UserSession.session_token_hash == token_hash,
        UserSession.is_revoked == False
    ).first()

    if not session:
        return None

    now = datetime.datetime.now()
    if session.expires_at < now:
        # Expired
        session.is_revoked = True
        db.commit()
        return None

    # Sliding window activity update
    session.last_activity_at = now
    db.commit()
    return session


def revoke_session(db: Session, session_id: str) -> bool:
    """Revokes a single active session (used during user logout)."""
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if session:
        session.is_revoked = True
        db.commit()
        return True
    return False


def revoke_all_user_sessions(db: Session, user_id: str) -> int:
    """
    Revokes ALL sessions for a given user.
    Used when credentials change, or when an account is suspended or rejected.
    """
    count = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()
    return count


def approve_user(
    db: Session,
    user_id: str,
    role: str,
    department: Optional[str],
    admin_user_id: str
) -> Optional[User]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    user.status = "APPROVED"
    user.role = role
    if department:
        user.department = department
    user.approved_at = datetime.datetime.now()
    user.approved_by_id = admin_user_id
    db.commit()
    db.refresh(user)
    return user


def reject_user(db: Session, user_id: str, admin_user_id: str) -> Optional[User]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    user.status = "REJECTED"
    db.commit()
    # Revoke any active sessions
    revoke_all_user_sessions(db, user_id)
    db.refresh(user)
    return user


def suspend_user(db: Session, user_id: str, admin_user_id: str) -> Optional[User]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    user.status = "SUSPENDED"
    db.commit()
    # Revoke all active sessions immediately
    revoke_all_user_sessions(db, user_id)
    db.refresh(user)
    return user


def change_user_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str
) -> Tuple[bool, str]:
    if not verify_password(current_password, user.hashed_password):
        return False, "Current password verification failed."

    user.hashed_password = hash_password(new_password)
    db.commit()

    # Revoke all existing sessions for security on credential change
    revoke_all_user_sessions(db, user.id)
    return True, "Password changed successfully."


def cleanup_expired_sessions(db: Session) -> int:
    """Deletes expired or revoked sessions to keep the database tidy."""
    now = datetime.datetime.now()
    count = db.query(UserSession).filter(
        (UserSession.expires_at < now) | (UserSession.is_revoked == True)
    ).delete()
    db.commit()
    return count

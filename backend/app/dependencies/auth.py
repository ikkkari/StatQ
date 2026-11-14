from typing import Tuple, List, Optional
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, UserSession
from backend.app.services.auth_service import get_session_by_token
from backend.app.core.security import verify_csrf_token_digest
from backend.app.core.config import settings


def get_current_session(
    request: Request,
    db: Session = Depends(get_db)
) -> Tuple[User, UserSession]:
    """
    Validates the HTTP-only session cookie.
    Accessible even to PENDING users so they can query their own profile on GET /api/auth/me.
    """
    raw_token = request.cookies.get(settings.COOKIE_NAME)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: No active session cookie."
        )

    session = get_session_by_token(db, raw_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or been revoked. Please log in again."
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this session no longer exists."
        )

    if user.status in ["REJECTED", "SUSPENDED"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Your account status is {user.status}."
        )

    return user, session


def get_current_approved_user(
    session_data: Tuple[User, UserSession] = Depends(get_current_session)
) -> User:
    """
    Requires the user to have been explicitly APPROVED by an administrator.
    Rejects PENDING accounts with 403 Forbidden.
    """
    user, _ = session_data
    if user.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. Please wait for an administrator to activate your access."
        )
    return user


def require_role(allowed_roles: List[str]):
    """
    Dependency factory enforcing Role-Based Access Control (RBAC).
    Must be an approved user with one of the allowed roles.
    """
    def role_checker(user: User = Depends(get_current_approved_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Action requires one of roles {allowed_roles}, but your role is '{user.role}'."
            )
        return user
    return role_checker


def verify_csrf_token(
    request: Request,
    session_data: Tuple[User, UserSession] = Depends(get_current_session)
) -> None:
    """
    Verifies the X-CSRF-Token header against the active session's stored CSRF token
    for all state-changing requests authenticated via cookies.
    """
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        header_token = request.headers.get(settings.CSRF_HEADER_NAME)
        _, session = session_data
        if not header_token or not verify_csrf_token_digest(header_token, session.csrf_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed: Missing or invalid X-CSRF-Token header."
            )

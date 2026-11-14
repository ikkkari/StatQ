from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, UserSession
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthStatusResponse,
    CSRFTokenResponse,
    ChangePasswordRequest,
    UserApprovalRequest,
)
from backend.app.services.auth_service import (
    create_user,
    get_user_by_username,
    get_user_by_email,
    authenticate_user,
    create_session,
    revoke_session,
    approve_user,
    reject_user,
    suspend_user,
    change_user_password,
)
from backend.app.dependencies.auth import (
    get_current_session,
    get_current_approved_user,
    require_role,
    verify_csrf_token,
)
from backend.app.core.rate_limit import login_rate_limiter, registration_rate_limiter
from backend.app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public staff registration endpoint.
    All public registrations are forced into status PENDING and role UNASSIGNED.
    An administrator must approve the account and assign its role before clinical access is granted.
    Protected by registration rate limiting: max 10 requests per hour per client IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"register:{client_ip}"

    # Rate limiting check: 10 attempts per hour (3600 seconds)
    is_allowed, retry_after = registration_rate_limiter.check_rate_limit(
        key=rate_key,
        max_attempts=10,
        window_seconds=3600
    )
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many registration requests from this network. Please wait {retry_after} seconds before requesting another staff account."
        )

    # Record registration attempt
    registration_rate_limiter.record_attempt(rate_key)

    existing_username = get_user_by_username(db, payload.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already in use. Please select a different username."
        )

    existing_email = get_user_by_email(db, payload.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered."
        )

    user = create_user(
        db=db,
        username=payload.username,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        department=payload.department or "Emergency Department",
        role="UNASSIGNED",
        status="PENDING"
    )
    return user


@router.post("/login", response_model=AuthStatusResponse)
def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticates a user and issues an HTTP-only secure session cookie.
    Applies sliding-window rate limiting to prevent brute-force attacks.
    Zero bearer tokens returned in response JSON.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login:{client_ip}:{payload.username.lower()}"

    # Rate limiting check: 5 attempts per 5 minutes
    is_allowed, retry_after = login_rate_limiter.check_rate_limit(
        key=rate_key,
        max_attempts=5,
        window_seconds=300
    )
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please wait {retry_after} seconds before trying again."
        )

    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        login_rate_limiter.record_attempt(rate_key)
        # Generic error message to prevent username enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    if user.status in ["REJECTED", "SUSPENDED"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account access denied: Your account is {user.status.lower()}."
        )

    # Successful login: reset rate limit attempts for this client
    login_rate_limiter.reset(rate_key)

    user_agent = request.headers.get("user-agent")
    raw_token, csrf_token, session = create_session(
        db=db,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent
    )

    # Set HTTP-only, secure, Lax session cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=raw_token,
        max_age=settings.COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=settings.COOKIE_PATH
    )

    return AuthStatusResponse(
        authenticated=True,
        user=UserResponse.model_validate(user),
        csrf_token=csrf_token,
        message="Login successful."
    )


@router.post("/logout")
def logout(
    response: Response,
    db: Session = Depends(get_db),
    session_data: Tuple[User, UserSession] = Depends(get_current_session),
    _: None = Depends(verify_csrf_token)
):
    """
    Revokes the current server-side session and deletes the session cookie.
    Other active sessions for this user on other devices are preserved.
    """
    _, session = session_data
    revoke_session(db, session.id)

    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path=settings.COOKIE_PATH
    )
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=AuthStatusResponse)
def get_me(session_data: Tuple[User, UserSession] = Depends(get_current_session)):
    """
    Returns active user profile and session verification status.
    Accessible to PENDING users so the UI can render the waiting approval state.
    """
    user, session = session_data
    return AuthStatusResponse(
        authenticated=True,
        user=UserResponse.model_validate(user),
        csrf_token=session.csrf_token
    )


@router.get("/csrf", response_model=CSRFTokenResponse)
def get_csrf_token(session_data: Tuple[User, UserSession] = Depends(get_current_session)):
    """Returns the CSRF token associated with the current active session."""
    _, session = session_data
    return CSRFTokenResponse(csrf_token=session.csrf_token)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
    session_data: Tuple[User, UserSession] = Depends(get_current_session),
    _: None = Depends(verify_csrf_token)
):
    """
    Changes user password and invalidates all existing sessions for security.
    """
    user, _ = session_data
    success, msg = change_user_password(
        db=db,
        user=user,
        current_password=payload.current_password,
        new_password=payload.new_password
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Invalidate cookie so user must log in again with new password
    response.delete_cookie(key=settings.COOKIE_NAME, path=settings.COOKIE_PATH)
    return {"message": "Password changed successfully. Please log in with your new credentials."}


# --- Administrator User Management Endpoints ---

@router.get("/admin/users", response_model=List[UserResponse])
def list_users(
    status_filter: Optional[str] = Query(None, description="Filter by status: PENDING, APPROVED, REJECTED, SUSPENDED"),
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if status_filter:
        query = query.filter(User.status == status_filter.upper())
    return query.order_by(User.created_at.desc()).all()


@router.post("/admin/users/{user_id}/approve", response_model=UserResponse)
@router.put("/admin/users/{user_id}/approve", response_model=UserResponse)
def approve_user_endpoint(
    user_id: str,
    payload: UserApprovalRequest,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
    _: None = Depends(verify_csrf_token)
):
    updated = approve_user(
        db=db,
        user_id=user_id,
        role=payload.role,
        department=payload.department,
        admin_user_id=admin.id
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
    return updated


@router.post("/admin/users/{user_id}/reject", response_model=UserResponse)
@router.put("/admin/users/{user_id}/reject", response_model=UserResponse)
def reject_user_endpoint(
    user_id: str,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
    _: None = Depends(verify_csrf_token)
):
    updated = reject_user(db=db, user_id=user_id, admin_user_id=admin.id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
    return updated


@router.post("/admin/users/{user_id}/suspend", response_model=UserResponse)
@router.put("/admin/users/{user_id}/suspend", response_model=UserResponse)
def suspend_user_endpoint(
    user_id: str,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
    _: None = Depends(verify_csrf_token)
):
    updated = suspend_user(db=db, user_id=user_id, admin_user_id=admin.id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {user_id} not found.")
    return updated

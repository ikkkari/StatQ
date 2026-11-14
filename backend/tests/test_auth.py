import uuid
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.models import User, UserSession, ActivityLog
from backend.app.core.config import settings
from backend.app.core.security import (
    hash_password,
    verify_password,
    generate_session_token,
    hash_session_token,
    generate_csrf_token,
    verify_csrf_token_digest,
)
from backend.app.core.rate_limit import login_rate_limiter, registration_rate_limiter
from backend.tests.conftest import get_auth_tokens


def test_argon2id_hashing_and_verification():
    """Verifies Argon2id password hashing and verification behavior."""
    raw = "SuperSecretPassword123!"
    hashed = hash_password(raw)
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_session_token_hashing_guarantee():
    """Verifies session tokens are generated with high entropy and only hashes are stored."""
    raw_token, token_hash = generate_session_token()
    assert len(raw_token) >= 40
    assert hash_session_token(raw_token) == token_hash
    # Ensure raw token is not the hash
    assert raw_token != token_hash


def test_csrf_token_verification():
    """Verifies timing-safe CSRF token matching."""
    token = generate_csrf_token()
    assert verify_csrf_token_digest(token, token) is True
    assert verify_csrf_token_digest("tampered_token", token) is False
    assert verify_csrf_token_digest("", token) is False


def test_public_registration_defaults_to_pending():
    """Public registration must always set status PENDING and role UNASSIGNED."""
    uid = uuid.uuid4().hex[:8]
    username = f"doc_{uid}"
    email = f"doc_{uid}@hospital.internal"
    with TestClient(app) as client:
        payload = {
            "username": username,
            "email": email,
            "password": "SecurePassword123!",
            "full_name": "Dr. Who",
            "department": "Emergency Medicine"
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["username"] == username
        assert data["status"] == "PENDING"
        assert data["role"] == "UNASSIGNED"

        # Duplicate username should fail with 409 Conflict
        res_dup = client.post("/api/auth/register", json=payload)
        assert res_dup.status_code == 409


def test_pending_user_login_and_access_denial():
    """Pending user can log in to check status, but cannot access clinical endpoints."""
    uid = uuid.uuid4().hex[:8]
    username = f"nurse_{uid}"
    email = f"nurse_{uid}@hospital.internal"
    with TestClient(app) as client:
        # Register a new pending user
        reg_payload = {
            "username": username,
            "email": email,
            "password": "SecurePassword123!",
            "full_name": "Pending Nurse Nancy"
        }
        res_reg = client.post("/api/auth/register", json=reg_payload)
        assert res_reg.status_code == 201

        # Login as pending user
        login_res = client.post("/api/auth/login", json={
            "username": username,
            "password": "SecurePassword123!"
        })
        assert login_res.status_code == 200
        data = login_res.json()
        assert data["authenticated"] is True
        assert data["user"]["status"] == "PENDING"
        # Assert no bearer token in response body
        assert "token" not in data
        assert "access_token" not in data

        # Session cookie must be set
        assert settings.COOKIE_NAME in client.cookies

        # Verify /api/auth/me works for pending user to check their status
        me_res = client.get("/api/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["user"]["status"] == "PENDING"

        # Attempting to access protected clinical endpoints must return 403 Forbidden
        queue_res = client.get("/api/queue")
        assert queue_res.status_code == 403
        assert "pending administrator approval" in queue_res.json()["detail"]


def test_session_token_never_stored_plaintext_in_db():
    """Verifies that the session token in the cookie matches the hash in the DB, not raw text."""
    with TestClient(app) as client:
        client.post("/api/auth/login", json={
            "username": "test_admin",
            "password": "AdminPassword123!"
        })
        cookie_val = client.cookies.get(settings.COOKIE_NAME)
        assert cookie_val is not None

        db = SessionLocal()
        try:
            # Query session from database
            expected_hash = hash_session_token(cookie_val)
            session = db.query(UserSession).filter(UserSession.session_token_hash == expected_hash).first()
            assert session is not None
            # Raw cookie value must NEVER appear anywhere in the database session record
            assert session.session_token_hash != cookie_val
        finally:
            db.close()


def test_multiple_active_sessions_across_devices():
    """Users can log in from multiple devices simultaneously without revoking previous sessions."""
    client_desktop = TestClient(app)
    client_mobile = TestClient(app)

    # Login on desktop
    res1 = client_desktop.post("/api/auth/login", json={"username": "test_admin", "password": "AdminPassword123!"})
    assert res1.status_code == 200
    token1 = client_desktop.cookies.get(settings.COOKIE_NAME)

    # Login on mobile
    res2 = client_mobile.post("/api/auth/login", json={"username": "test_admin", "password": "AdminPassword123!"})
    assert res2.status_code == 200
    token2 = client_mobile.cookies.get(settings.COOKIE_NAME)

    # Different session tokens generated
    assert token1 != token2

    # Both clients can make authenticated calls concurrently
    assert client_desktop.get("/api/queue").status_code == 200
    assert client_mobile.get("/api/queue").status_code == 200

    # Desktop logs out
    csrf1 = res1.json()["csrf_token"]
    client_desktop.headers[settings.CSRF_HEADER_NAME] = csrf1
    dc_res = client_desktop.post("/api/auth/logout")
    assert dc_res.status_code == 200

    # Desktop is now logged out (401)
    assert client_desktop.get("/api/queue").status_code == 401

    # Mobile is STILL active and authenticated
    assert client_mobile.get("/api/queue").status_code == 200


def test_login_rate_limiting():
    """Rate limiter locks out after 5 consecutive failed login attempts."""
    limiter_key = "rate_limit_test_client"
    # Reset limiter for key
    login_rate_limiter.reset(limiter_key)

    with TestClient(app) as client:
        # 5 failed attempts
        for _ in range(5):
            res = client.post("/api/auth/login", json={"username": "non_existent_user", "password": "BadPassword123!"})
            assert res.status_code == 401

        # 6th attempt should be rate limited (429 Too Many Requests)
        res6 = client.post("/api/auth/login", json={"username": "non_existent_user", "password": "BadPassword123!"})
        assert res6.status_code == 429
        assert "Too many failed login attempts" in res6.json()["detail"]


def test_csrf_protection_on_mutations(auth_client):
    """Mutating state without valid X-CSRF-Token fails with 403 Forbidden."""
    patient_payload = {
        "full_name": "CSRF Attack Target",
        "age": 30,
        "sex": "Female",
        "original_severity": 3,
        "chief_complaint": "Testing CSRF enforcement"
    }

    # Remove CSRF header
    bad_headers = {k: v for k, v in auth_client.headers.items() if k != settings.CSRF_HEADER_NAME}

    with TestClient(app, cookies=auth_client.cookies) as unshielded_client:
        # Request with cookie but no CSRF header
        res_no_csrf = unshielded_client.post("/api/patients", json=patient_payload)
        assert res_no_csrf.status_code == 403
        assert "CSRF validation failed" in res_no_csrf.json()["detail"]

        # Request with forged CSRF header
        unshielded_client.headers[settings.CSRF_HEADER_NAME] = "forged_csrf_token_value_here"
        res_bad_csrf = unshielded_client.post("/api/patients", json=patient_payload)
        assert res_bad_csrf.status_code == 403


def test_rbac_permission_matrix(front_desk_client, nurse_client, auth_client):
    """
    Validates the Role-Based Access Control matrix:
    - FRONT_DESK: Can register, can view, CANNOT call next (403), CANNOT discharge (403), CANNOT edit settings (403).
    - NURSE: Can register, can view, can call next, can discharge; CANNOT view admin users (403).
    - ADMIN: Full access to all endpoints.
    """
    # 1. Front Desk can register patient
    fd_reg = front_desk_client.post("/api/patients", json={
        "full_name": "Front Desk Patient",
        "age": 40,
        "sex": "Male",
        "original_severity": 4,
        "chief_complaint": "Sprained ankle"
    })
    assert fd_reg.status_code == 200

    # Front Desk CANNOT call next patient
    fd_call = front_desk_client.post("/api/queue/call-next")
    assert fd_call.status_code == 403

    # Front Desk CANNOT access settings
    fd_settings = front_desk_client.get("/api/settings")
    assert fd_settings.status_code == 403

    # Front Desk CANNOT access admin user management
    fd_admin = front_desk_client.get("/api/auth/admin/users")
    assert fd_admin.status_code == 403

    # 2. Nurse CAN call next patient
    nurse_call = nurse_client.post("/api/queue/call-next")
    assert nurse_call.status_code in [200, 400]

    # Nurse CANNOT access admin user management
    nurse_admin = nurse_client.get("/api/auth/admin/users")
    assert nurse_admin.status_code == 403

    # 3. Admin CAN access admin user management
    admin_users = auth_client.get("/api/auth/admin/users")
    assert admin_users.status_code == 200
    assert isinstance(admin_users.json(), list)


def test_admin_user_approval_and_suspension_lifecycle(auth_client):
    """Admin approves a pending user, user logs in, then admin suspends user."""
    uid = uuid.uuid4().hex[:8]
    username = f"cand_{uid}"
    email = f"cand_{uid}@hospital.internal"
    with TestClient(app) as guest_client:
        # 1. Register candidate
        reg_res = guest_client.post("/api/auth/register", json={
            "username": username,
            "email": email,
            "password": "PasswordCandidate123!",
            "full_name": "Nurse Candidate"
        })
        assert reg_res.status_code == 201
        user_id = reg_res.json()["id"]

        # 2. Admin approves candidate as NURSE
        approve_res = auth_client.put(f"/api/auth/admin/users/{user_id}/approve", json={
            "role": "NURSE",
            "department": "Emergency Department"
        })
        assert approve_res.status_code == 200
        assert approve_res.json()["role"] == "NURSE"
        assert approve_res.json()["status"] == "APPROVED"

        # 3. Candidate logs in now as APPROVED NURSE
        cand_client = TestClient(app)
        login_res = cand_client.post("/api/auth/login", json={
            "username": username,
            "password": "PasswordCandidate123!"
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["role"] == "NURSE"
        assert login_res.json()["user"]["status"] == "APPROVED"

        # Candidate can now access queue
        assert cand_client.get("/api/queue").status_code == 200

        # 4. Admin suspends the user
        susp_res = auth_client.put(f"/api/auth/admin/users/{user_id}/suspend")
        assert susp_res.status_code == 200
        assert susp_res.json()["status"] == "SUSPENDED"

        # 5. Suspended user's existing session is immediately revoked
        check_res = cand_client.get("/api/queue")
        assert check_res.status_code in [401, 403]

        # 6. Attempting to log in as suspended user is blocked with 403
        login_again_res = cand_client.post("/api/auth/login", json={
            "username": username,
            "password": "PasswordCandidate123!"
        })
        assert login_again_res.status_code == 403
        assert "suspended" in login_again_res.json()["detail"].lower()


def test_websocket_authorization_handshake(admin_user):
    """WebSocket connection requires valid approved session cookie."""
    with TestClient(app) as client:
        # Connecting without session cookie -> rejected with 1008
        with pytest.raises(Exception):
            with client.websocket_connect("/ws") as ws:
                ws.receive_text()

        # Connecting with valid admin session cookie -> succeeds
        raw_token, _ = get_auth_tokens(admin_user.id)
        client.cookies.set(settings.COOKIE_NAME, raw_token)
        with client.websocket_connect("/ws") as ws:
            # Successfully connected
            pass


def test_registration_rate_limiting():
    """Registration rate limiter enforces maximum 10 requests per hour per client IP."""
    limiter_key = "register:testclient"
    registration_rate_limiter.reset(limiter_key)

    try:
        with TestClient(app) as client:
            # Submit 10 registration requests
            for i in range(10):
                uid = uuid.uuid4().hex[:6]
                res = client.post("/api/auth/register", json={
                    "username": f"bulk_reg_{i}_{uid}",
                    "email": f"bulk_reg_{i}_{uid}@hospital.internal",
                    "password": "PasswordBulk123!",
                    "full_name": f"Bulk Applicant {i}"
                })
                assert res.status_code == 201

            # 11th registration attempt must be rate-limited (429 Too Many Requests)
            uid_excess = uuid.uuid4().hex[:6]
            res_excess = client.post("/api/auth/register", json={
                "username": f"bulk_reg_excess_{uid_excess}",
                "email": f"bulk_reg_excess_{uid_excess}@hospital.internal",
                "password": "PasswordBulk123!",
                "full_name": "Excess Applicant"
            })
            assert res_excess.status_code == 429
            assert "Too many registration requests" in res_excess.json()["detail"]
    finally:
        # Reset limiter to prevent affecting subsequent tests
        registration_rate_limiter.reset(limiter_key)


def test_expired_session_rejected(admin_user):
    """Sessions with an expiration date in the past are revoked and rejected with 401."""
    db = SessionLocal()
    try:
        # Create a new session for the admin
        raw_token, csrf_token = get_auth_tokens(admin_user.id)
        token_hash = hash_session_token(raw_token)

        # Artificially expire the session in the database
        session_rec = db.query(UserSession).filter(UserSession.session_token_hash == token_hash).first()
        assert session_rec is not None
        session_rec.expires_at = datetime.datetime.now() - datetime.timedelta(minutes=10)
        db.commit()

        # Attempt to access clinical queue with expired session cookie
        with TestClient(app) as client:
            client.cookies.set(settings.COOKIE_NAME, raw_token)
            client.headers[settings.CSRF_HEADER_NAME] = csrf_token
            res = client.get("/api/queue")
            assert res.status_code == 401
            assert "expired or been revoked" in res.json()["detail"].lower()

        # Verify session record is marked revoked in DB
        db.refresh(session_rec)
        assert session_rec.is_revoked is True
    finally:
        db.close()


def test_pending_user_websocket_rejection():
    """Users with PENDING approval status are rejected from WebSocket connections with policy violation (1008)."""
    with TestClient(app) as client:
        # 1. Register a pending user
        uid = uuid.uuid4().hex[:8]
        reg_res = client.post("/api/auth/register", json={
            "username": f"ws_pend_{uid}",
            "email": f"ws_pend_{uid}@hospital.internal",
            "password": "PendingPassword123!",
            "full_name": "Pending WS User"
        })
        assert reg_res.status_code == 201

        # 2. Login to obtain session cookie
        login_res = client.post("/api/auth/login", json={
            "username": f"ws_pend_{uid}",
            "password": "PendingPassword123!"
        })
        assert login_res.status_code == 200
        assert settings.COOKIE_NAME in client.cookies

        # 3. Connect to WebSocket with pending user's valid session cookie
        # Must be rejected with policy violation (code 1008)
        with pytest.raises(Exception):
            with client.websocket_connect("/ws") as ws:
                ws.receive_text()

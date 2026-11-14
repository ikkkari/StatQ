import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app, seed_initial_data
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.models import User
from backend.app.services.auth_service import create_user, create_session
from backend.app.core.config import settings


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """
    Initializes database schema and baseline data.
    """
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield


@pytest.fixture(scope="session")
def admin_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "test_admin").first()
        if not user:
            user = create_user(
                db=db,
                username="test_admin",
                email="admin@test.statq.internal",
                password="AdminPassword123!",
                full_name="Test Administrator",
                role="ADMIN",
                status="APPROVED",
                department="Emergency Department"
            )
        return user
    finally:
        db.close()


@pytest.fixture(scope="session")
def nurse_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "test_nurse").first()
        if not user:
            user = create_user(
                db=db,
                username="test_nurse",
                email="nurse@test.statq.internal",
                password="NursePassword123!",
                full_name="Test Nurse",
                role="NURSE",
                status="APPROVED",
                department="Emergency Department"
            )
        return user
    finally:
        db.close()


@pytest.fixture(scope="session")
def front_desk_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "test_frontdesk").first()
        if not user:
            user = create_user(
                db=db,
                username="test_frontdesk",
                email="frontdesk@test.statq.internal",
                password="FrontDeskPassword123!",
                full_name="Test Front Desk",
                role="FRONT_DESK",
                status="APPROVED",
                department="Emergency Department"
            )
        return user
    finally:
        db.close()


def get_auth_tokens(user_id: str):
    db = SessionLocal()
    try:
        raw_token, csrf_token, _ = create_session(db, user_id=user_id)
        return raw_token, csrf_token
    finally:
        db.close()


@pytest.fixture
def auth_client(admin_user):
    """
    TestClient authenticated as an approved ADMIN with session cookie and CSRF header.
    """
    raw_token, csrf_token = get_auth_tokens(admin_user.id)
    with TestClient(app) as client:
        client.cookies.set(settings.COOKIE_NAME, raw_token)
        client.headers[settings.CSRF_HEADER_NAME] = csrf_token
        yield client


@pytest.fixture
def nurse_client(nurse_user):
    """
    TestClient authenticated as an approved NURSE with session cookie and CSRF header.
    """
    raw_token, csrf_token = get_auth_tokens(nurse_user.id)
    with TestClient(app) as client:
        client.cookies.set(settings.COOKIE_NAME, raw_token)
        client.headers[settings.CSRF_HEADER_NAME] = csrf_token
        yield client


@pytest.fixture
def front_desk_client(front_desk_user):
    """
    TestClient authenticated as an approved FRONT_DESK with session cookie and CSRF header.
    """
    raw_token, csrf_token = get_auth_tokens(front_desk_user.id)
    with TestClient(app) as client:
        client.cookies.set(settings.COOKIE_NAME, raw_token)
        client.headers[settings.CSRF_HEADER_NAME] = csrf_token
        yield client

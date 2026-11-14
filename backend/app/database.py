import os
from typing import Optional
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Database path & connection URL
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "statq.db")

def normalize_database_url(url: Optional[str]) -> Optional[str]:
    """
    Normalizes database connection URLs for SQLAlchemy 2.0:
    - postgres://... -> postgresql+psycopg2://...
    - postgresql://... -> postgresql+psycopg2://... (binds installed psycopg2-binary driver)
    - Already-qualified PostgreSQL URLs (e.g. postgresql+psycopg2://, postgresql+asyncpg://) remain unchanged
    - SQLite URLs and None remain unchanged
    """
    if not url:
        return url
    trimmed = url.strip()
    if trimmed.startswith("postgres://"):
        return "postgresql+psycopg2://" + trimmed[len("postgres://"):]
    elif trimmed.startswith("postgresql://") and not trimmed.startswith("postgresql+"):
        return "postgresql+psycopg2://" + trimmed[len("postgresql://"):]
    return trimmed

raw_db_url = os.getenv("DATABASE_URL")
if raw_db_url:
    SQLALCHEMY_DATABASE_URL = normalize_database_url(raw_db_url)
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
else:
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30}
    )

    # Enable SQLite WAL mode and foreign key constraints
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA foreign_keys=ON;")
        finally:
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

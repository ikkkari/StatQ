import pytest
from sqlalchemy import create_engine
from backend.app.database import normalize_database_url, SQLALCHEMY_DATABASE_URL, engine


def test_postgresql_url_normalization_postgres_scheme():
    """Verify legacy Heroku/Render 'postgres://' scheme converts to 'postgresql+psycopg2://'."""
    raw = "postgres://er_user:SecretPass123@db.render.internal:5432/statq_production"
    normalized = normalize_database_url(raw)
    assert normalized == "postgresql+psycopg2://er_user:SecretPass123@db.render.internal:5432/statq_production"


def test_postgresql_url_normalization_postgresql_scheme():
    """Verify standard 'postgresql://' converts to 'postgresql+psycopg2://' to bind psycopg2-binary in SQLAlchemy 2.0."""
    raw = "postgresql://er_user:SecretPass123@db.render.internal:5432/statq_production"
    normalized = normalize_database_url(raw)
    assert normalized == "postgresql+psycopg2://er_user:SecretPass123@db.render.internal:5432/statq_production"


def test_already_qualified_postgresql_urls_unchanged():
    """Verify that already-qualified driver URLs are preserved without duplicate prefixes."""
    qualified_psycopg2 = "postgresql+psycopg2://er_user:SecretPass123@db.render.internal:5432/statq_production"
    assert normalize_database_url(qualified_psycopg2) == qualified_psycopg2

    qualified_asyncpg = "postgresql+asyncpg://er_user:SecretPass123@db.render.internal:5432/statq_production"
    assert normalize_database_url(qualified_asyncpg) == qualified_asyncpg


def test_sqlite_urls_and_none_unchanged():
    """Verify SQLite connection URLs and None/empty values are unchanged."""
    sqlite_url = "sqlite:///backend/app/statq.db"
    assert normalize_database_url(sqlite_url) == sqlite_url
    assert normalize_database_url(None) is None
    assert normalize_database_url("") == ""


def test_sqlalchemy_selects_psycopg2_driver():
    """
    Verify SQLAlchemy 2.0 constructs a PostgreSQL engine using the installed psycopg2 driver
    from the normalized URL without connecting or requiring a live PostgreSQL instance.
    """
    raw_postgres_url = "postgres://er_user:SecretPass123@localhost:5432/statq_db"
    normalized_url = normalize_database_url(raw_postgres_url)

    # Engine creation tests driver import and dialect resolution without network I/O
    test_engine = create_engine(normalized_url)
    assert test_engine.dialect.name == "postgresql"
    assert test_engine.dialect.driver == "psycopg2"
    test_engine.dispose()


def test_sqlite_configuration_and_engine():
    """Verify that default local environment resolves to SQLite with valid engine configuration."""
    assert SQLALCHEMY_DATABASE_URL.startswith("sqlite:///")
    assert engine.dialect.name == "sqlite"

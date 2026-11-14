import os
from typing import List

class Settings:
    PROJECT_NAME: str = "StatQ Emergency Room Triage System"
    VERSION: str = "2.0.0"

    # Cookie Configuration
    COOKIE_NAME: str = "statq_session"
    COOKIE_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 7  # 7 days
    # In production (e.g. Render / Netlify), cookies must be Secure (HTTPS only)
    COOKIE_SECURE: bool = os.getenv("ENVIRONMENT", "development").lower() == "production"
    COOKIE_SAMESITE: str = "lax"
    COOKIE_PATH: str = "/"

    # CSRF Header
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    # Session Inactive Timeout (sliding window: 24 hours of inactivity)
    SESSION_INACTIVITY_TIMEOUT_SECONDS: int = 60 * 60 * 24

    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://statq.netlify.app",
    ]

settings = Settings()

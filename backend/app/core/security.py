import hashlib
import secrets
from typing import Tuple
from pwdlib import PasswordHash

# Configure recommended Argon2id password hasher
_password_hasher = PasswordHash.recommended()

# A pre-computed dummy hash used to equalize execution time when a user does not exist
# (prevents user enumeration via timing analysis)
_DUMMY_ARGON2_HASH = _password_hasher.hash("statq-dummy-timing-defense-hash")


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    return _password_hasher.verify(plain_password, hashed_password)


def dummy_verify_password(plain_password: str) -> bool:
    """Performs a constant-time dummy verification when user is not found."""
    return _password_hasher.verify(plain_password, _DUMMY_ARGON2_HASH)


def generate_session_token() -> Tuple[str, str]:
    """
    Generates a cryptographically secure random session token.
    Returns:
        (raw_token, token_hash)
        - raw_token: Sent ONLY to the client in an HTTP-only cookie.
        - token_hash: SHA-256 hex digest stored in the database.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(raw_token)
    return raw_token, token_hash


def hash_session_token(raw_token: str) -> str:
    """Computes the SHA-256 hex digest of a raw session token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    """Generates a 256-bit cryptographically secure hex string for CSRF defense."""
    return secrets.token_hex(32)


def verify_csrf_token_digest(token_a: str, token_b: str) -> bool:
    """Constant-time string comparison for CSRF tokens to prevent timing attacks."""
    if not token_a or not token_b:
        return False
    return secrets.compare_digest(token_a, token_b)

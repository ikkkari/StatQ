import time
import threading
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple

class RateLimiterBackend(ABC):
    """
    Abstract interface for rate limiting backends.
    Allows swapping in a distributed backend (e.g. Redis) for multi-worker/multi-instance
    production deployments without modifying route logic.
    """
    @abstractmethod
    def check_rate_limit(self, key: str, max_attempts: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Checks if the request is permitted.
        Returns:
            (is_allowed: bool, retry_after_seconds: int)
        """
        pass

    @abstractmethod
    def record_attempt(self, key: str) -> None:
        """Records an attempt for the given key."""
        pass

    @abstractmethod
    def reset(self, key: str) -> None:
        """Resets the recorded attempts for the given key (e.g. after successful login)."""
        pass


class InMemorySlidingWindowRateLimiter(RateLimiterBackend):
    """
    In-memory sliding-window rate limiter for development and single-worker deployments.

    LIMITATION NOTICE:
    ------------------
    This rate limiter stores attempt timestamps in the local process memory.
    If the application is scaled across multiple workers (e.g. Gunicorn with multiple Uvicorn workers)
    or multiple container instances, each worker maintains its own isolated counter.
    For true distributed brute-force protection across multiple processes/nodes, implement
    a Redis-backed RateLimiterBackend.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._attempts: Dict[str, List[float]] = {}

    def _cleanup_expired(self, key: str, cutoff: float) -> None:
        if key in self._attempts:
            self._attempts[key] = [t for t in self._attempts[key] if t > cutoff]
            if not self._attempts[key]:
                del self._attempts[key]

    def check_rate_limit(self, key: str, max_attempts: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            self._cleanup_expired(key, cutoff)
            attempts = self._attempts.get(key, [])
            if len(attempts) >= max_attempts:
                # Calculate time until the oldest attempt leaves the window
                oldest = attempts[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                return False, retry_after
            return True, 0

    def record_attempt(self, key: str) -> None:
        now = time.time()
        with self._lock:
            if key not in self._attempts:
                self._attempts[key] = []
            self._attempts[key].append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            if key in self._attempts:
                del self._attempts[key]


# Global rate limiter instances
# By default, use the in-process sliding window limiter.
# NOTE: Suitable for single-worker/local development. For multi-worker production clusters,
# swap these instances with a Redis-backed RateLimiterBackend implementation.
login_rate_limiter: RateLimiterBackend = InMemorySlidingWindowRateLimiter()
registration_rate_limiter: RateLimiterBackend = InMemorySlidingWindowRateLimiter()

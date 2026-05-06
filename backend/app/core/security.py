"""
app/core/security.py
--------------------
JWT creation / verification helpers.
Passwords are hashed directly with the `bcrypt` package.

WHY NOT passlib?
passlib[bcrypt] is incompatible with bcrypt >= 4.0:
  • bcrypt 4.x dropped the __about__ module → passlib crashes on version detection.
  • bcrypt 4.x enforces the 72-byte password limit strictly → passlib's internal
    wrap-bug detection test (which uses a >72-byte string) raises ValueError at
    import time, before any user code runs.
Using bcrypt directly has zero overhead and no compatibility issues.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

# bcrypt cost factor — 12 is the current OWASP recommendation
_BCRYPT_ROUNDS = 12


# ── Password helpers ───────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* value."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ────────────────────────────────────────────────────────────


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Return a signed JWT access token."""
    now = datetime.now(tz=timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        **(extra_claims or {}),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT.
    Raises ``jose.JWTError`` on any failure.
    """
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def get_token_subject(token: str) -> str | None:
    """Convenience wrapper that returns the ``sub`` claim or None."""
    try:
        payload = decode_access_token(token)
        return str(payload["sub"])
    except (JWTError, KeyError):
        return None

"""
app/core/config.py
------------------
Centralised, type-safe configuration via Pydantic-Settings v2.

CORS note: pydantic-settings v2 tries json.loads() on list fields before
calling field_validators, so a bare comma-separated string like
  CORS_ORIGINS=http://a.com,http://b.com
raises JSONDecodeError.  We avoid this entirely by storing cors_origins as
a plain `str` and exposing a `cors_origins_list` property that splits it.
The property is what the app actually uses.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ────────────────────────────────────────────────────────
    app_name: str = "RealtimeChat"
    app_version: str = "2.0.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = Field(default=False)

    # ── Security ───────────────────────────────────────────────────────────
    secret_key: str = Field(..., min_length=32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 h

    # ── CORS ───────────────────────────────────────────────────────────────
    # Stored as a plain string so pydantic-settings never tries json.loads().
    # Use the `cors_origins_list` property everywhere in the app.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Return cors_origins split on commas, whitespace-stripped."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Redis ──────────────────────────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── Database ───────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://chat:chat@postgres:5432/chat_db"

    # ── Socket.IO ──────────────────────────────────────────────────────────
    sio_ping_timeout: int = 20
    sio_ping_interval: int = 10
    sio_max_http_buffer_size: int = 1_000_000  # 1 MB

    # ── Chat ───────────────────────────────────────────────────────────────
    max_message_length: int = 2000
    max_room_history: int = 200
    default_room: str = "general"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — safe to call from anywhere."""
    return Settings()  # type: ignore[call-arg]

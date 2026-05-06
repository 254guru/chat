"""
app/api/routes.py
-----------------
Traditional REST endpoints:
  POST /api/auth/token  → issue a JWT (demo — swap with real DB auth)
  GET  /api/health      → liveness probe
  GET  /api/rooms       → list active rooms + user counts
"""
from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.sio.connection_manager import manager

settings = get_settings()
router = APIRouter(prefix="/api")


# ── Simple in-memory "user store" (replace with DB in production) ──────────

_DEMO_USERS: dict[str, str] = {
    "alice": hash_password("alice123"),
    "bob": hash_password("bob456"),
}


# ── Schemas ────────────────────────────────────────────────────────────────


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class HealthResponse(BaseModel):
    status: str
    version: str
    total_connections: int


class RoomSummary(BaseModel):
    room: str
    user_count: int
    users: list[str]


# ── Endpoints ──────────────────────────────────────────────────────────────


@router.post(
    "/auth/token",
    response_model=Token,
    summary="Obtain a JWT access token",
)
async def login(form: OAuth2PasswordRequestForm = Depends()) -> Token:
    hashed = _DEMO_USERS.get(form.username)
    if not hashed or not verify_password(form.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        subject=form.username,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return Token(access_token=token)


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        total_connections=await manager.total_count(),
    )


@router.get("/rooms", response_model=list[RoomSummary], summary="Active rooms")
async def list_rooms() -> list[RoomSummary]:
    rooms: dict[str, list[str]] = {}
    for client in manager:
        rooms.setdefault(client.room, []).append(client.username)

    return [
        RoomSummary(room=room, user_count=len(users), users=users)
        for room, users in rooms.items()
    ]

"""
app/schemas/events.py
---------------------
Pydantic v2 models for every Socket.IO event payload.
These serve as the single source of truth for the client↔server contract.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# ── Helpers ────────────────────────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _uuid() -> str:
    return str(uuid4())


# ── Enums ──────────────────────────────────────────────────────────────────


class EventName(StrEnum):
    # Client → Server
    JOIN = "join"
    LEAVE = "leave"
    SEND_MESSAGE = "send_message"
    GET_USERS = "get_connected_users"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"

    # Server → Client
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_RECONNECTED = "user_reconnected"
    NEW_MESSAGE = "new_message"
    CHAT_HISTORY = "chat_history"
    CONNECTED_USERS = "connected_users"
    TYPING_INDICATOR = "typing_indicator"
    ERROR = "error"
    MY_RESPONSE = "my_response"


# ── Inbound payloads (Client → Server) ─────────────────────────────────────


class JoinPayload(BaseModel):
    username: str = Field(..., min_length=1, max_length=32)
    room: str = Field(default="general", min_length=1, max_length=64)
    token: str | None = Field(default=None, description="Optional JWT for auth")

    @field_validator("username", "room", mode="before")
    @classmethod
    def strip_whitespace(cls, v: Any) -> str:
        return str(v).strip()


class SendMessagePayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

    @field_validator("message", mode="before")
    @classmethod
    def strip_whitespace(cls, v: Any) -> str:
        return str(v).strip()


class TypingPayload(BaseModel):
    room: str


# ── Outbound payloads (Server → Client) ────────────────────────────────────


class UserInfo(BaseModel):
    username: str
    color: str
    sid: str | None = None  # omitted from public broadcasts


class MessageEntry(BaseModel):
    id: str = Field(default_factory=_uuid)
    message: str
    username: str
    color: str
    room: str
    timestamp: datetime = Field(default_factory=_now)


class UserJoinedEvent(BaseModel):
    username: str
    color: str
    room: str
    timestamp: datetime = Field(default_factory=_now)
    is_self: bool = False


class UserLeftEvent(BaseModel):
    username: str
    room: str
    timestamp: datetime = Field(default_factory=_now)


class ChatHistoryEvent(BaseModel):
    room: str
    history: list[MessageEntry]


class ConnectedUsersEvent(BaseModel):
    room: str
    users: list[UserInfo]


class TypingIndicatorEvent(BaseModel):
    username: str
    room: str
    is_typing: bool


class ErrorEvent(BaseModel):
    code: str
    message: str


class ConnectionAckEvent(BaseModel):
    sid: str
    message: str = "Connected"
    server_time: datetime = Field(default_factory=_now)

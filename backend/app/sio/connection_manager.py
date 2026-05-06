"""
app/sio/connection_manager.py
-----------------------------
Thread-safe (asyncio-safe) in-memory store for connected clients.
Backed by an asyncio.Lock so concurrent coroutines cannot corrupt state.

In a multi-worker deployment swap this for a Redis-backed implementation
by extending ``BaseConnectionManager`` — the Socket.IO AsyncRedisManager
handles cross-process room broadcasts automatically.
"""
from __future__ import annotations

import asyncio
import random
from dataclasses import dataclass, field
from typing import Iterator


@dataclass
class ClientState:
    sid: str
    username: str
    color: str
    room: str


def _random_color() -> str:
    """Return a vivid but readable RGB color string."""
    # Keep channels out of the very dark / very light extremes
    r = random.randint(80, 220)
    g = random.randint(80, 220)
    b = random.randint(80, 220)
    return f"rgb({r},{g},{b})"


class ConnectionManager:
    """Manages the lifecycle of Socket.IO client sessions."""

    def __init__(self) -> None:
        self._clients: dict[str, ClientState] = {}
        self._lock = asyncio.Lock()

    # ── Mutations ──────────────────────────────────────────────────────────

    async def register(self, sid: str, username: str, room: str) -> ClientState:
        """Register a new connection; returns the created ClientState."""
        state = ClientState(
            sid=sid,
            username=username,
            color=_random_color(),
            room=room,
        )
        async with self._lock:
            self._clients[sid] = state
        return state

    async def unregister(self, sid: str) -> ClientState | None:
        """Remove a connection; returns the removed state or None."""
        async with self._lock:
            return self._clients.pop(sid, None)

    # ── Queries ────────────────────────────────────────────────────────────

    async def get(self, sid: str) -> ClientState | None:
        async with self._lock:
            return self._clients.get(sid)

    async def users_in_room(self, room: str) -> list[ClientState]:
        async with self._lock:
            return [c for c in self._clients.values() if c.room == room]

    async def total_count(self) -> int:
        async with self._lock:
            return len(self._clients)

    def __iter__(self) -> Iterator[ClientState]:
        return iter(list(self._clients.values()))


# Singleton — imported by event handlers
manager = ConnectionManager()

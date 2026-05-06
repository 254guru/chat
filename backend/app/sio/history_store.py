"""
app/sio/history_store.py
------------------------
Manages per-room chat history.

In production replace the in-memory dict with Redis LPUSH/LRANGE
calls for persistence across restarts and horizontal scaling.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict, deque

from app.core.config import get_settings
from app.schemas.events import MessageEntry

settings = get_settings()


class HistoryStore:
    def __init__(self, max_per_room: int = settings.max_room_history) -> None:
        self._max = max_per_room
        # deque automatically enforces the cap
        self._rooms: dict[str, deque[MessageEntry]] = defaultdict(
            lambda: deque(maxlen=self._max)
        )
        self._lock = asyncio.Lock()

    async def append(self, entry: MessageEntry) -> None:
        async with self._lock:
            self._rooms[entry.room].append(entry)

    async def get_history(self, room: str) -> list[MessageEntry]:
        async with self._lock:
            return list(self._rooms[room])

    async def clear(self, room: str) -> None:
        async with self._lock:
            self._rooms[room].clear()


history_store = HistoryStore()

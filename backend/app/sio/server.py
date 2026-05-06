"""
app/sio/server.py
-----------------
Creates the python-socketio AsyncServer.

For multi-process / multi-host scaling, swap ``AsyncInMemoryManager``
for ``AsyncRedisManager`` and point it at your Redis instance:

    mgr = socketio.AsyncRedisManager("redis://redis:6379/0")
    sio = socketio.AsyncServer(client_manager=mgr, ...)
"""
from __future__ import annotations

import socketio

from app.core.config import get_settings

settings = get_settings()

# ── Manager (swap to AsyncRedisManager for horizontal scaling) ─────────────
# Uncomment the two lines below and comment out the in-memory manager to
# enable Redis-backed pub/sub broadcasting across multiple Uvicorn workers.
#
# mgr = socketio.AsyncRedisManager(settings.redis_url)
# sio = socketio.AsyncServer(
#     async_mode="asgi",
#     client_manager=mgr,
#     ...
# )

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.cors_origins_list,
    ping_timeout=settings.sio_ping_timeout,
    ping_interval=settings.sio_ping_interval,
    max_http_buffer_size=settings.sio_max_http_buffer_size,
    logger=True,
    engineio_logger=settings.debug,
)

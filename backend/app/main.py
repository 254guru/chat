"""
app/main.py
-----------
Application factory.

The ASGI app is a composite of:
  1. FastAPI  → handles REST routes at /api/*
  2. Socket.IO → handles WebSocket + long-polling at /socket.io/*

Uvicorn mounts both under a single process.
"""
from __future__ import annotations

import logging

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import handlers so @sio.event decorators are registered
import app.sio.handlers  # noqa: F401
from app.api.routes import router as api_router
from app.core.config import get_settings
from app.sio.server import sio

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def create_app() -> socketio.ASGIApp:
    """
    Build the combined FastAPI + Socket.IO ASGI application.

    Returns a ``socketio.ASGIApp`` so that Socket.IO can intercept
    WebSocket upgrade requests before FastAPI sees them.
    """
    fastapi_app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── CORS ───────────────────────────────────────────────────────────────
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── REST routes ────────────────────────────────────────────────────────
    fastapi_app.include_router(api_router)

    # ── Mount Socket.IO on top of FastAPI ──────────────────────────────────
    # Socket.IO intercepts /socket.io/* and passes everything else to FastAPI
    return socketio.ASGIApp(
        sio,
        other_asgi_app=fastapi_app,
        socketio_path="/socket.io",
    )


app = create_app()

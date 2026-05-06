"""
tests/test_sio_events.py
------------------------
Async pytest tests for every Socket.IO event handler.
Uses ``python-socketio`` AsyncClient to connect to the live ASGI app.
"""
from __future__ import annotations

import asyncio
from typing import Any

import pytest
import pytest_asyncio
import socketio
import uvicorn

from app.main import app as asgi_app

# ── Fixtures ───────────────────────────────────────────────────────────────

SERVER_PORT = 8765
SERVER_URL = f"http://localhost:{SERVER_PORT}"


@pytest_asyncio.fixture(scope="module")
async def server():
    """Run a real Uvicorn instance for the test module."""
    config = uvicorn.Config(asgi_app, host="127.0.0.1", port=SERVER_PORT, log_level="error")
    server = uvicorn.Server(config)
    task = asyncio.create_task(server.serve())
    await asyncio.sleep(0.5)  # Give server time to start
    yield server
    server.should_exit = True
    await task


async def make_client(**auth_kwargs: Any) -> socketio.AsyncClient:
    client = socketio.AsyncClient(reconnection=False)
    await client.connect(SERVER_URL, auth=auth_kwargs or None)
    return client


# ── Tests ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_connect_emits_ack(server: Any) -> None:
    """Server should emit ``my_response`` with sid on connect."""
    client = socketio.AsyncClient(reconnection=False)
    received: list[dict] = []

    @client.on("my_response")
    def on_ack(data: dict) -> None:
        received.append(data)

    await client.connect(SERVER_URL)
    await asyncio.sleep(0.2)
    await client.disconnect()

    assert len(received) == 1
    assert "sid" in received[0]
    assert received[0]["message"] == "Connected"


@pytest.mark.asyncio
async def test_join_sends_history_and_user_joined(server: Any) -> None:
    client = socketio.AsyncClient(reconnection=False)
    history_events: list[dict] = []
    joined_events: list[dict] = []

    @client.on("chat_history")
    def on_history(data: dict) -> None:
        history_events.append(data)

    @client.on("user_joined")
    def on_joined(data: dict) -> None:
        joined_events.append(data)

    await client.connect(SERVER_URL)
    await client.emit("join", {"username": "pytest_user", "room": "test_room"})
    await asyncio.sleep(0.3)
    await client.disconnect()

    assert len(history_events) == 1
    assert history_events[0]["room"] == "test_room"
    assert any(e.get("is_self") for e in joined_events)


@pytest.mark.asyncio
async def test_send_message_broadcasts(server: Any) -> None:
    sender = socketio.AsyncClient(reconnection=False)
    receiver = socketio.AsyncClient(reconnection=False)
    received: list[dict] = []

    @receiver.on("new_message")
    def on_msg(data: dict) -> None:
        received.append(data)

    await sender.connect(SERVER_URL)
    await receiver.connect(SERVER_URL)

    await sender.emit("join", {"username": "sender", "room": "broadcast_test"})
    await receiver.emit("join", {"username": "receiver", "room": "broadcast_test"})
    await asyncio.sleep(0.2)

    await sender.emit("send_message", {"message": "Hello from pytest!"})
    await asyncio.sleep(0.3)

    await sender.disconnect()
    await receiver.disconnect()

    assert any(m["message"] == "Hello from pytest!" for m in received)


@pytest.mark.asyncio
async def test_send_message_without_join_returns_error(server: Any) -> None:
    client = socketio.AsyncClient(reconnection=False)
    errors: list[dict] = []

    @client.on("error")
    def on_error(data: dict) -> None:
        errors.append(data)

    await client.connect(SERVER_URL)
    await client.emit("send_message", {"message": "orphan message"})
    await asyncio.sleep(0.2)
    await client.disconnect()

    assert len(errors) == 1
    assert errors[0]["code"] == "NOT_JOINED"


@pytest.mark.asyncio
async def test_typing_indicator_broadcast(server: Any) -> None:
    typer = socketio.AsyncClient(reconnection=False)
    watcher = socketio.AsyncClient(reconnection=False)
    indicators: list[dict] = []

    @watcher.on("typing_indicator")
    def on_typing(data: dict) -> None:
        indicators.append(data)

    await typer.connect(SERVER_URL)
    await watcher.connect(SERVER_URL)
    await typer.emit("join", {"username": "typer", "room": "typing_room"})
    await watcher.emit("join", {"username": "watcher", "room": "typing_room"})
    await asyncio.sleep(0.2)

    await typer.emit("typing_start", {})
    await asyncio.sleep(0.2)

    await typer.disconnect()
    await watcher.disconnect()

    assert len(indicators) >= 1
    assert indicators[0]["is_typing"] is True
    assert indicators[0]["username"] == "typer"


@pytest.mark.asyncio
async def test_disconnect_notifies_room(server: Any) -> None:
    leaver = socketio.AsyncClient(reconnection=False)
    watcher = socketio.AsyncClient(reconnection=False)
    left_events: list[dict] = []

    @watcher.on("user_left")
    def on_left(data: dict) -> None:
        left_events.append(data)

    await leaver.connect(SERVER_URL)
    await watcher.connect(SERVER_URL)
    await leaver.emit("join", {"username": "leaver", "room": "leave_room"})
    await watcher.emit("join", {"username": "watcher2", "room": "leave_room"})
    await asyncio.sleep(0.2)

    await leaver.disconnect()
    await asyncio.sleep(0.3)
    await watcher.disconnect()

    assert any(e["username"] == "leaver" for e in left_events)

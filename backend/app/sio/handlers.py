"""
app/sio/handlers.py
-------------------
All Socket.IO event handlers — fully async.
"""
from __future__ import annotations

import logging

from pydantic import ValidationError

from app.core.security import get_token_subject
from app.schemas.events import (
    ChatHistoryEvent,
    ConnectedUsersEvent,
    ConnectionAckEvent,
    ErrorEvent,
    EventName,
    JoinPayload,
    MessageEntry,
    SendMessagePayload,
    TypingIndicatorEvent,
    TypingPayload,
    UserInfo,
    UserJoinedEvent,
    UserLeftEvent,
)
from app.sio.connection_manager import manager
from app.sio.history_store import history_store
from app.sio.server import sio

log = logging.getLogger(__name__)


async def _emit_error(sid: str, code: str, message: str) -> None:
    err = ErrorEvent(code=code, message=message)
    await sio.emit(EventName.ERROR, err.model_dump(), to=sid)


# ── connect ────────────────────────────────────────────────────────────────

@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> bool:
    token: str | None = (auth or {}).get("token")

    if token:
        bearer = token.removeprefix("Bearer ").strip()
        username = get_token_subject(bearer)
        if username is None:
            log.warning("Rejected connection %s — invalid JWT", sid)
            return False

    log.info("Client connected: sid=%s", sid)
    ack = ConnectionAckEvent(sid=sid)
    await sio.emit(EventName.MY_RESPONSE, ack.model_dump(mode="json"), to=sid)
    return True


# ── disconnect ─────────────────────────────────────────────────────────────

@sio.event
async def disconnect(sid: str) -> None:
    state = await manager.unregister(sid)
    if state:
        log.info("Client disconnected: %s (%s)", state.username, sid)
        evt = UserLeftEvent(username=state.username, room=state.room)
        await sio.emit(
            EventName.USER_LEFT,
            evt.model_dump(mode="json"),
            room=state.room,
            skip_sid=sid,
        )
        # Broadcast updated user list to everyone remaining in the room
        remaining = await manager.users_in_room(state.room)
        users_evt = ConnectedUsersEvent(
            room=state.room,
            users=[UserInfo(username=u.username, color=u.color) for u in remaining],
        )
        await sio.emit(
            EventName.CONNECTED_USERS,
            users_evt.model_dump(mode="json"),
            room=state.room,
        )


# ── join ───────────────────────────────────────────────────────────────────

@sio.event
async def join(sid: str, data: dict) -> None:
    try:
        payload = JoinPayload.model_validate(data)
    except ValidationError as exc:
        await _emit_error(sid, "VALIDATION_ERROR", str(exc))
        return

    if payload.token:
        subject = get_token_subject(payload.token.removeprefix("Bearer ").strip())
        if subject and subject != payload.username:
            await _emit_error(sid, "AUTH_MISMATCH", "Token subject does not match username")
            return

    state = await manager.register(sid, payload.username, payload.room)
    await sio.enter_room(sid, payload.room)
    log.info("%s joined room '%s'", state.username, state.room)

    # 1. Tell the joining client about themselves (is_self=True)
    evt_self = UserJoinedEvent(
        username=state.username,
        color=state.color,
        room=state.room,
        is_self=True,
    )
    await sio.emit(EventName.USER_JOINED, evt_self.model_dump(mode="json"), to=sid)

    # 2. Tell everyone else in the room a new user joined
    evt_others = UserJoinedEvent(
        username=state.username,
        color=state.color,
        room=state.room,
        is_self=False,
    )
    await sio.emit(
        EventName.USER_JOINED,
        evt_others.model_dump(mode="json"),
        room=state.room,
        skip_sid=sid,
    )

    # 3. Send the complete current user list to ALL clients in the room
    #    (including the joiner). This is the authoritative source of truth —
    #    everyone's sidebar updates atomically on every join.
    all_in_room = await manager.users_in_room(state.room)
    users_evt = ConnectedUsersEvent(
        room=state.room,
        users=[UserInfo(username=u.username, color=u.color) for u in all_in_room],
    )
    await sio.emit(
        EventName.CONNECTED_USERS,
        users_evt.model_dump(mode="json"),
        room=state.room,
    )

    # 4. Replay chat history only to the joining client
    history = await history_store.get_history(state.room)
    history_evt = ChatHistoryEvent(room=state.room, history=history)
    await sio.emit(EventName.CHAT_HISTORY, history_evt.model_dump(mode="json"), to=sid)


# ── send_message ───────────────────────────────────────────────────────────

@sio.event
async def send_message(sid: str, data: dict) -> None:
    state = await manager.get(sid)
    if not state:
        await _emit_error(sid, "NOT_JOINED", "You must join a room before sending messages")
        return

    try:
        payload = SendMessagePayload.model_validate(data)
    except ValidationError as exc:
        await _emit_error(sid, "VALIDATION_ERROR", str(exc))
        return

    entry = MessageEntry(
        message=payload.message,
        username=state.username,
        color=state.color,
        room=state.room,
    )
    await history_store.append(entry)
    log.debug("[%s] %s: %s", state.room, state.username, payload.message[:80])
    await sio.emit(
        EventName.NEW_MESSAGE,
        entry.model_dump(mode="json"),
        room=state.room,
    )


# ── get_connected_users ────────────────────────────────────────────────────

@sio.event
async def get_connected_users(sid: str) -> None:
    state = await manager.get(sid)
    if not state:
        await _emit_error(sid, "NOT_JOINED", "You must join a room first")
        return

    users_in_room = await manager.users_in_room(state.room)
    evt = ConnectedUsersEvent(
        room=state.room,
        users=[UserInfo(username=u.username, color=u.color) for u in users_in_room],
    )
    await sio.emit(EventName.CONNECTED_USERS, evt.model_dump(mode="json"), to=sid)


# ── typing indicators ──────────────────────────────────────────────────────

@sio.event
async def typing_start(sid: str, data: dict) -> None:
    state = await manager.get(sid)
    if not state:
        return
    evt = TypingIndicatorEvent(username=state.username, room=state.room, is_typing=True)
    await sio.emit(
        EventName.TYPING_INDICATOR,
        evt.model_dump(mode="json"),
        room=state.room,
        skip_sid=sid,
    )


@sio.event
async def typing_stop(sid: str, data: dict) -> None:
    state = await manager.get(sid)
    if not state:
        return
    evt = TypingIndicatorEvent(username=state.username, room=state.room, is_typing=False)
    await sio.emit(
        EventName.TYPING_INDICATOR,
        evt.model_dump(mode="json"),
        room=state.room,
        skip_sid=sid,
    )


# ── reconnect ─────────────────────────────────────────────────────────────

@sio.event
async def reconnect(sid: str, data: dict) -> None:
    try:
        payload = JoinPayload.model_validate(data)
    except ValidationError as exc:
        await _emit_error(sid, "VALIDATION_ERROR", str(exc))
        return

    state = await manager.register(sid, payload.username, payload.room)
    await sio.enter_room(sid, payload.room)

    evt = UserJoinedEvent(
        username=state.username,
        color=state.color,
        room=state.room,
    )
    await sio.emit(
        EventName.USER_RECONNECTED,
        evt.model_dump(mode="json"),
        room=state.room,
    )

    # Broadcast updated user list after reconnect
    all_in_room = await manager.users_in_room(state.room)
    users_evt = ConnectedUsersEvent(
        room=state.room,
        users=[UserInfo(username=u.username, color=u.color) for u in all_in_room],
    )
    await sio.emit(
        EventName.CONNECTED_USERS,
        users_evt.model_dump(mode="json"),
        room=state.room,
    )
    log.info("%s reconnected to room '%s'", state.username, state.room)

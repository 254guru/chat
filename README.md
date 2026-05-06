# ⚡ RealtimeChat — Production Architecture

> **Complete overhaul** of [`flask_websocket`](https://github.com/254guru/flask_websocket):  
> Flask + jQuery → **FastAPI + React + TypeScript + Redis + Docker**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
│  React 18 + TypeScript + Vite + Tailwind CSS + Zustand      │
│  socket.io-client  ←→  useSocket hook  ←→  chatStore        │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket / HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX  (port 80)                          │
│   /api/*  → proxy → FastAPI                                  │
│   /socket.io/* → WebSocket proxy → Socket.IO ASGI           │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌─────────────────────┐  ┌─────────────────────────┐
│   FastAPI REST      │  │  python-socketio (ASGI) │
│   /api/auth/token   │  │  connect / disconnect   │
│   /api/health       │  │  join / send_message    │
│   /api/rooms        │  │  typing_start/stop      │
│   Pydantic v2       │  │  get_connected_users    │
│   JWT Auth          │  │  Pydantic v2 validation │
└─────────────────────┘  └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────┐
              ▼                       ▼                   ▼
┌──────────────────┐  ┌───────────────────────┐  ┌──────────────┐
│  ConnectionMgr   │  │    HistoryStore        │  │  Redis       │
│  (asyncio-safe   │  │    (per-room ring       │  │  (pub/sub    │
│   in-memory)     │  │     buffer, max 200)   │  │   for scale) │
└──────────────────┘  └───────────────────────┘  └──────────────┘
```

---

## What Changed From the Original

| Concern | Before | After |
|---|---|---|
| **Web framework** | Flask (WSGI, sync) | FastAPI (ASGI, async) |
| **WebSocket library** | Flask-SocketIO + eventlet | python-socketio + Uvicorn |
| **Async model** | Greenlet monkey-patching | Native `asyncio` / `async def` |
| **Validation** | None | Pydantic v2 on every payload |
| **Auth** | None | JWT (`python-jose`) on connect + join |
| **Scalability** | Single process | Redis manager (one line to enable) |
| **Frontend** | Jinja2 + jQuery | React 18 + TypeScript + Vite |
| **State** | jQuery DOM mutation | Zustand global store |
| **Styling** | Custom CSS | Tailwind CSS dark-first |
| **Type safety** | None | Strict TS + Pydantic v2 |
| **Packaging** | `requirements.txt` | `pyproject.toml` (uv/pip) |
| **Containerisation** | None | Multi-stage Docker + Compose |
| **Testing** | None | pytest + pytest-asyncio |

---

## Repository Structure

```
realtime-chat/
├── docker-compose.yml            # App + Redis + Postgres
│
├── backend/
│   ├── pyproject.toml            # uv / pip-installable
│   ├── .env.example
│   ├── Dockerfile                # Multi-stage
│   └── app/
│       ├── main.py               # ASGI app factory
│       ├── core/
│       │   ├── config.py         # Pydantic-Settings v2
│       │   └── security.py       # JWT + bcrypt
│       ├── sio/
│       │   ├── server.py         # AsyncServer instance
│       │   ├── handlers.py       # All @sio.event handlers
│       │   ├── connection_manager.py
│       │   └── history_store.py
│       ├── api/
│       │   └── routes.py         # REST endpoints
│       └── schemas/
│           └── events.py         # Pydantic event models
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── types/
│       │   └── socket.ts         # All event interfaces
│       ├── services/
│       │   └── socketService.ts  # Singleton socket client
│       ├── store/
│       │   └── chatStore.ts      # Zustand global state
│       ├── hooks/
│       │   └── useSocket.ts      # Lifecycle + event wiring
│       ├── components/
│       │   ├── ui/
│       │   │   ├── ConnectionStatusBadge.tsx
│       │   │   └── Toast.tsx
│       │   ├── chat/
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageInput.tsx
│       │   │   └── UsersSidebar.tsx
│       │   └── layout/
│       │       ├── LoginPage.tsx
│       │       └── ChatPage.tsx
│       ├── lib/
│       │   └── utils.ts
│       └── styles/
│           └── globals.css
└── tests/
    └── test_sio_events.py        # pytest-asyncio socket tests
```

---

## Quick Start

### Option A — Docker Compose (recommended)

```bash
# 1. Clone and enter
git clone <your-repo>
cd realtime-chat

# 2. Configure backend env
cp backend/.env.example backend/.env
# Edit SECRET_KEY at minimum

# 3. Start everything
docker compose up --build

# App:      http://localhost:5173
# API docs: http://localhost:8000/api/docs
```

### Option B — Local Development

**Backend:**
```bash
cd backend

# Install with uv (fast) or pip
pip install uv
uv pip install -e ".[dev]"

# Or plain pip:
pip install -e ".[dev]"

cp .env.example .env
# Edit .env — set SECRET_KEY

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Redis (for local dev):**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Event Reference

All events mirror the original Flask-SocketIO project, with backward-compatible names.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join` | `{ username, room?, token? }` | Join a room (validated) |
| `send_message` | `{ message }` | Broadcast a message to the room |
| `get_connected_users` | — | Request current user list |
| `typing_start` | — | Notify room: user is typing |
| `typing_stop` | — | Notify room: user stopped typing |
| `reconnect` | `{ username, room }` | Re-register after network recovery |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `my_response` | `{ sid, message, server_time }` | Connection acknowledged |
| `user_joined` | `{ username, color, room, is_self }` | User entered room |
| `user_left` | `{ username, room, timestamp }` | User disconnected |
| `user_reconnected` | `{ username, color, room }` | User reconnected |
| `new_message` | `MessageEntry` | New chat message |
| `chat_history` | `{ room, history[] }` | Room history on join |
| `connected_users` | `{ room, users[] }` | Current user list |
| `typing_indicator` | `{ username, room, is_typing }` | Typing state change |
| `error` | `{ code, message }` | Validation / auth error |

---

## Scaling to Multiple Workers

The codebase is **one line away** from horizontal scaling. In `app/sio/server.py`:

```python
# Uncomment these two lines:
mgr = socketio.AsyncRedisManager(settings.redis_url)
sio = socketio.AsyncServer(client_manager=mgr, ...)

# Comment out the in-memory version below.
```

Socket.IO's Redis manager handles cross-process pub/sub automatically. Room broadcasts
(e.g., `sio.emit(..., room="general")`) will reach clients connected to **any** worker.

Scale with:
```bash
docker compose up --scale backend=4
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v --asyncio-mode=auto
```

The test suite:
- Spins up a real Uvicorn server on port 8765
- Connects real `python-socketio` AsyncClients
- Tests every event handler end-to-end
- Verifies broadcasting across multiple clients
- Validates error paths (send without join, etc.)

---

## REST API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/token` | Get JWT (form: username + password) |
| `GET` | `/api/health` | Liveness probe + connection count |
| `GET` | `/api/rooms` | List active rooms with user counts |
| `GET` | `/api/docs` | Swagger UI |
| `GET` | `/api/redoc` | ReDoc UI |

Demo credentials (swap with real DB auth in production):
- `alice` / `alice123`
- `bob` / `bob456`

---

## Frontend Features

- **Dark-first UI** — Terminal-inspired palette, `JetBrains Mono` + `IBM Plex Sans`
- **Connection badge** — Green/amber/red live indicator with animated dot
- **Toast notifications** — Slide-in toasts for join events and errors
- **Skeleton screens** — Pulse placeholders while history loads
- **Typing indicators** — Bouncing dots + username with auto-expiry (4 s)
- **Auto-scroll** — Smooth scroll to latest message
- **Message deduplication** — `Set`-based listener registry prevents double events
- **Exponential backoff** — socket.io-client built-in, configured to 1 s → 30 s
- **Reconnecting banner** — Full-width amber strip during reconnection
- **Form validation** — Zod schemas on login form; Zod on message input
- **Memoisation** — `React.memo` on all list items + `useMemo` selectors via Zustand

---

## Security Notes

1. **JWT** — Tokens are verified in both `connect` (transport-level) and `join` (app-level).
2. **Message length** — Capped at 2 000 characters server-side (Pydantic) and client-side (Zod).
3. **CORS** — Strict origin list via `settings.cors_origins`.
4. **Non-root Docker** — Backend image runs as unprivileged `app` user.
5. **Secret rotation** — `SECRET_KEY` is a required env var; no insecure default.
6. **SQL injection** — Not applicable to WebSocket events; REST routes use SQLAlchemy ORM.

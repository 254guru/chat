/**
 * services/socketService.ts
 * -------------------------
 * Singleton Socket.IO client.
 *
 * LIFECYCLE DESIGN:
 * -----------------
 * SocketProvider (mounted once at app root) registers all listeners via _on().
 * These are stored in _listeners (a Map of event → Set<handler>).
 *
 * When disconnect() is called (logout), we KEEP _listeners intact and move
 * every handler back into _pending. On the next connect() call the pending
 * queue is flushed onto the brand-new socket — listeners survive across
 * logout/login cycles with zero re-registration needed.
 *
 * _pending is only used for handlers registered BEFORE any socket exists.
 * Once a socket is live, _on() attaches directly to it.
 */

import { io, Socket } from "socket.io-client";
import {
  ChatHistoryEvent,
  ConnectedUsersEvent,
  ConnectionAckEvent,
  ErrorEvent,
  EventName,
  JoinPayload,
  MessageEntry,
  SendMessagePayload,
  TypingIndicatorEvent,
  UserJoinedEvent,
  UserLeftEvent,
} from "@/types/socket";

const SERVER_URL = import.meta.env.VITE_API_URL ?? "";

type AnyHandler = (...args: unknown[]) => void;

interface PendingListener {
  event: string;
  handler: AnyHandler;
}

class SocketService {
  private socket: Socket | null = null;
  // All registered handlers — survives disconnect()
  private _listeners = new Map<string, Set<AnyHandler>>();
  // Handlers queued before a socket exists — flushed on connect()
  private _pending: PendingListener[] = [];

  // ── Lifecycle ────────────────────────────────────────────────────────────

  connect(token?: string): Socket {
    // Already open — nothing to do
    if (this.socket?.connected) return this.socket;
    // Exists but mid-reconnect — let it finish
    if (this.socket) return this.socket;

    this.socket = io(SERVER_URL, {
      path: "/socket.io",
      auth: token ? { token: `Bearer ${token}` } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      transports: ["websocket", "polling"],
      timeout: 10_000,
    });

    // Flush all pending listeners (includes any from a previous session)
    for (const { event, handler } of this._pending) {
      this.socket.on(event, handler);
    }
    this._pending = [];

    this.socket.on("connect_error", (err) => {
      console.error("[socket] connect_error:", err.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      // Move every currently-attached listener back to _pending so they
      // survive the socket being destroyed and reattach on the next connect().
      this._listeners.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          this._pending.push({ event, handler });
        });
      });

      this.socket.disconnect();
      this.socket = null;
    }
    // NOTE: _listeners is intentionally kept intact so future _on() calls
    // can still deduplicate correctly.
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  // ── Emitters ─────────────────────────────────────────────────────────────

  join(payload: JoinPayload): void {
    this.socket?.emit(EventName.JOIN, payload);
  }

  sendMessage(payload: SendMessagePayload): void {
    this.socket?.emit(EventName.SEND_MESSAGE, payload);
  }

  getConnectedUsers(): void {
    this.socket?.emit(EventName.GET_USERS);
  }

  typingStart(): void {
    this.socket?.emit(EventName.TYPING_START, {});
  }

  typingStop(): void {
    this.socket?.emit(EventName.TYPING_STOP, {});
  }

  reconnectUser(payload: JoinPayload): void {
    this.socket?.emit(EventName.RECONNECT_USER, payload);
  }

  // ── Typed listener subscriptions ─────────────────────────────────────────

  onConnectionAck(handler: (data: ConnectionAckEvent) => void): () => void {
    return this._on(EventName.MY_RESPONSE, handler as AnyHandler);
  }
  onUserJoined(handler: (data: UserJoinedEvent) => void): () => void {
    return this._on(EventName.USER_JOINED, handler as AnyHandler);
  }
  onUserLeft(handler: (data: UserLeftEvent) => void): () => void {
    return this._on(EventName.USER_LEFT, handler as AnyHandler);
  }
  onNewMessage(handler: (data: MessageEntry) => void): () => void {
    return this._on(EventName.NEW_MESSAGE, handler as AnyHandler);
  }
  onChatHistory(handler: (data: ChatHistoryEvent) => void): () => void {
    return this._on(EventName.CHAT_HISTORY, handler as AnyHandler);
  }
  onConnectedUsers(handler: (data: ConnectedUsersEvent) => void): () => void {
    return this._on(EventName.CONNECTED_USERS, handler as AnyHandler);
  }
  onTypingIndicator(handler: (data: TypingIndicatorEvent) => void): () => void {
    return this._on(EventName.TYPING_INDICATOR, handler as AnyHandler);
  }
  onError(handler: (data: ErrorEvent) => void): () => void {
    return this._on(EventName.ERROR, handler as AnyHandler);
  }
  onConnect(handler: () => void): () => void {
    return this._on("connect", handler as AnyHandler);
  }
  onDisconnect(handler: (reason: string) => void): () => void {
    return this._on("disconnect", handler as AnyHandler);
  }
  onReconnectAttempt(handler: (attempt: number) => void): () => void {
    return this._on("reconnect_attempt", handler as AnyHandler);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private _on(event: string, handler: AnyHandler): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    const handlers = this._listeners.get(event)!;

    // Deduplicate — same handler reference is never double-registered
    if (!handlers.has(handler)) {
      handlers.add(handler);

      if (this.socket) {
        // Socket is live — attach immediately
        this.socket.on(event, handler);
      } else {
        // No socket yet — queue for the next connect()
        this._pending.push({ event, handler });
      }
    }

    return () => {
      handlers.delete(handler);
      this.socket?.off(event, handler);
      this._pending = this._pending.filter(
        (p) => !(p.event === event && p.handler === handler)
      );
    };
  }
}

export const socketService = new SocketService();

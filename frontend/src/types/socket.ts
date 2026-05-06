/**
 * types/socket.ts
 * ---------------
 * Strict TypeScript interfaces mirroring the Pydantic schemas on the server.
 * Single source of truth for all event payload shapes.
 */

// ── Enums ──────────────────────────────────────────────────────────────────

export const EventName = {
  // Client → Server
  JOIN: "join",
  LEAVE: "leave",
  SEND_MESSAGE: "send_message",
  GET_USERS: "get_connected_users",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  RECONNECT_USER: "reconnect",

  // Server → Client
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  USER_RECONNECTED: "user_reconnected",
  NEW_MESSAGE: "new_message",
  CHAT_HISTORY: "chat_history",
  CONNECTED_USERS: "connected_users",
  TYPING_INDICATOR: "typing_indicator",
  ERROR: "error",
  MY_RESPONSE: "my_response",
} as const;

export type EventNameType = (typeof EventName)[keyof typeof EventName];

// ── Inbound (Client → Server) ──────────────────────────────────────────────

export interface JoinPayload {
  username: string;
  room?: string;
  token?: string;
}

export interface SendMessagePayload {
  message: string;
}

// ── Outbound (Server → Client) ─────────────────────────────────────────────

export interface UserInfo {
  username: string;
  color: string;
}

export interface MessageEntry {
  id: string;
  message: string;
  username: string;
  color: string;
  room: string;
  timestamp: string; // ISO 8601
}

export interface UserJoinedEvent {
  username: string;
  color: string;
  room: string;
  timestamp: string;
  is_self: boolean;
}

export interface UserLeftEvent {
  username: string;
  room: string;
  timestamp: string;
}

export interface ChatHistoryEvent {
  room: string;
  history: MessageEntry[];
}

export interface ConnectedUsersEvent {
  room: string;
  users: UserInfo[];
}

export interface TypingIndicatorEvent {
  username: string;
  room: string;
  is_typing: boolean;
}

export interface ErrorEvent {
  code: string;
  message: string;
}

export interface ConnectionAckEvent {
  sid: string;
  message: string;
  server_time: string;
}

// ── Connection states ──────────────────────────────────────────────────────

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

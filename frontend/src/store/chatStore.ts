/**
 * store/chatStore.ts
 * ------------------
 * Zustand global store.  All real-time state lives here.
 * Components subscribe to slices via selectors to minimise re-renders.
 */

import { create } from "zustand";
import {
  ConnectionStatus,
  MessageEntry,
  UserInfo,
} from "@/types/socket";

interface TypingUser {
  username: string;
  since: number; // epoch ms — used to auto-clear stale indicators
}

interface ChatState {
  // ── Connection ────────────────────────────────────────────────────────
  status: ConnectionStatus;
  serverSid: string | null;

  // ── Session ───────────────────────────────────────────────────────────
  username: string | null;
  userColor: string | null;
  currentRoom: string | null;

  // ── Messages ──────────────────────────────────────────────────────────
  messages: MessageEntry[];
  unreadCount: number;

  // ── Users ─────────────────────────────────────────────────────────────
  connectedUsers: UserInfo[];

  // ── Typing ────────────────────────────────────────────────────────────
  typingUsers: TypingUser[];

  // ── Error ─────────────────────────────────────────────────────────────
  lastError: string | null;
}

interface ChatActions {
  setStatus: (status: ConnectionStatus) => void;
  setServerSid: (sid: string) => void;
  setSession: (username: string, color: string, room: string) => void;
  clearSession: () => void;
  addMessage: (msg: MessageEntry) => void;
  setHistory: (messages: MessageEntry[]) => void;
  setConnectedUsers: (users: UserInfo[]) => void;
  addUser: (user: UserInfo) => void;
  removeUser: (username: string) => void;
  setTyping: (username: string, isTyping: boolean) => void;
  setError: (error: string | null) => void;
  clearUnread: () => void;
}

const initialState: ChatState = {
  status: "disconnected",
  serverSid: null,
  username: null,
  userColor: null,
  currentRoom: null,
  messages: [],
  unreadCount: 0,
  connectedUsers: [],
  typingUsers: [],
  lastError: null,
};

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setServerSid: (sid) => set({ serverSid: sid }),

  setSession: (username, userColor, currentRoom) =>
    set({ username, userColor, currentRoom }),

  clearSession: () => set({ ...initialState }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      unreadCount: s.unreadCount + 1,
    })),

  setHistory: (messages) => set({ messages, unreadCount: 0 }),

  setConnectedUsers: (connectedUsers) => set({ connectedUsers }),

  addUser: (user) =>
    set((s) => {
      if (s.connectedUsers.some((u) => u.username === user.username)) return s;
      return { connectedUsers: [...s.connectedUsers, user] };
    }),

  removeUser: (username) =>
    set((s) => ({
      connectedUsers: s.connectedUsers.filter((u) => u.username !== username),
      typingUsers: s.typingUsers.filter((u) => u.username !== username),
    })),

  setTyping: (username, isTyping) =>
    set((s) => {
      const filtered = s.typingUsers.filter((u) => u.username !== username);
      if (isTyping) {
        return { typingUsers: [...filtered, { username, since: Date.now() }] };
      }
      return { typingUsers: filtered };
    }),

  setError: (lastError) => set({ lastError }),

  clearUnread: () => set({ unreadCount: 0 }),
}));

// Selectors (memoised by Zustand internally)
export const selectMessages = (s: ChatState) => s.messages;
export const selectStatus = (s: ChatState) => s.status;
export const selectConnectedUsers = (s: ChatState) => s.connectedUsers;
export const selectTypingUsers = (s: ChatState) => s.typingUsers;
export const selectSession = (s: ChatState) => ({
  username: s.username,
  color: s.userColor,
  room: s.currentRoom,
});

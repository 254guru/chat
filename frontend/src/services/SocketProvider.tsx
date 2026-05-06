/**
 * services/SocketProvider.tsx
 * ---------------------------
 * Single location where ALL socket event listeners are registered.
 * Mounted ONCE at the app root so no matter how many components call
 * useSocket(), each event handler fires exactly once.
 */
import { createContext, useContext, useCallback, useEffect, useRef, ReactNode } from "react";
import { socketService } from "@/services/socketService";
import { useChatStore } from "@/store/chatStore";
import { JoinPayload, SendMessagePayload } from "@/types/socket";

const TYPING_CLEAR_MS = 4_000;

interface SocketContextValue {
  connect: (token?: string) => void;
  disconnect: () => void;
  join: (payload: JoinPayload) => void;
  sendMessage: (payload: SendMessagePayload) => void;
  typingStart: () => void;
  typingStop: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const {
    setStatus, setServerSid, setSession, clearSession,
    addMessage, setHistory, setConnectedUsers,
    addUser, removeUser, setTyping, setError,
  } = useChatStore();

  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Wire events ONCE for the entire app lifetime ──────────────────────────
  useEffect(() => {
    const unsubs = [
      socketService.onConnect(() => { setStatus("connected"); setError(null); }),
      socketService.onDisconnect((reason) => {
        setStatus(reason === "io client disconnect" ? "disconnected" : "reconnecting");
      }),
      socketService.onReconnectAttempt(() => setStatus("reconnecting")),
      socketService.onConnectionAck((data) => setServerSid(data.sid)),
      socketService.onUserJoined((data) => {
        if (data.is_self) setSession(data.username, data.color, data.room);
        else addUser({ username: data.username, color: data.color });
      }),
      socketService.onUserLeft((data) => removeUser(data.username)),
      socketService.onNewMessage((msg) => addMessage(msg)),
      socketService.onChatHistory((data) => {
        setHistory(data.history);
      }),
      socketService.onConnectedUsers((data) => setConnectedUsers(data.users)),
      socketService.onTypingIndicator((data) => {
        const existing = typingTimers.current.get(data.username);
        if (existing) clearTimeout(existing);
        setTyping(data.username, data.is_typing);
        if (data.is_typing) {
          const t = setTimeout(() => {
            setTyping(data.username, false);
            typingTimers.current.delete(data.username);
          }, TYPING_CLEAR_MS);
          typingTimers.current.set(data.username, t);
        }
      }),
      socketService.onError((err) => setError(`[${err.code}] ${err.message}`)),
    ];
    return () => {
      unsubs.forEach((off) => off());
      typingTimers.current.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stable emitter callbacks ───────────────────────────────────────────────
  const connect    = useCallback((token?: string) => { setStatus("connecting"); socketService.connect(token); }, [setStatus]);
  const disconnect = useCallback(() => { socketService.disconnect(); clearSession(); }, [clearSession]);
  const join       = useCallback((p: JoinPayload) => socketService.join(p), []);
  const sendMessage= useCallback((p: SendMessagePayload) => socketService.sendMessage(p), []);
  const typingStart= useCallback(() => socketService.typingStart(), []);
  const typingStop = useCallback(() => socketService.typingStop(), []);

  return (
    <SocketContext.Provider value={{ connect, disconnect, join, sendMessage, typingStart, typingStop }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore, selectSession, selectStatus } from "@/store/chatStore";
import { useSocket } from "@/services/SocketProvider";
import { useToast } from "@/components/ui/Toast";
import { ConnectionStatusBadge } from "@/components/ui/ConnectionStatusBadge";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { MemberButton, DesktopSidebar } from "@/components/chat/UsersSidebar";

export function ChatPage() {
  const navigate  = useNavigate();
  const session   = useChatStore(selectSession);
  const status    = useChatStore(selectStatus);
  const lastError = useChatStore((s) => s.lastError);
  const { disconnect } = useSocket();
  const { toast } = useToast();

  const isLoading = session.username === null;

  // Input is enabled as soon as the user has a session (username set by server's
  // user_joined is_self event). Don't gate on status === "connected" alone —
  // that's true even before join completes, and false during brief reconnects
  // where the user should still be able to type.
  const canChat = !!session.username && status !== "disconnected" && status !== "error";

  useEffect(() => { if (lastError) toast(lastError, "error"); }, [lastError, toast]);

  return (
    <div className="h-full flex flex-col bg-bg-base">
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-3 border-b border-white/6 bg-bg-surface"
        style={{ paddingTop: "calc(10px + var(--safe-top))", paddingBottom: "10px" }}
      >
        <button
          onClick={() => { disconnect(); navigate("/"); }}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400
                     hover:bg-white/8 active:bg-white/12 transition-colors flex-shrink-0"
          aria-label="Leave room"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-slate-100 truncate">
              #{session.room ?? "…"}
            </p>
            <ConnectionStatusBadge status={status} />
          </div>
          {session.username && (
            <p className="text-[11px] text-slate-500 truncate font-mono">
              you · {session.username}
            </p>
          )}
        </div>

        <MemberButton />
      </header>

      {/* Reconnecting banner */}
      {status === "reconnecting" && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-amber-400 text-[12px] font-mono animate-pulse">
            ⟳ Reconnecting… messages will resume automatically
          </span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <MessageList username={session.username} isLoading={isLoading} />
          <MessageInput disabled={!canChat} />
        </div>
        <DesktopSidebar />
      </div>
    </div>
  );
}

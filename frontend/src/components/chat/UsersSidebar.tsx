/**
 * UsersSidebar — two exports:
 *   MemberButton  → mobile header pill that opens a bottom sheet
 *   DesktopSidebar → fixed right panel on md+ screens
 */
import { memo, useState } from "react";
import { useChatStore, selectConnectedUsers } from "@/store/chatStore";

function MemberRow({ username, color }: { username: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
      <div className="relative flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          {username[0].toUpperCase()}
        </div>
        <span className="absolute -bottom-px -right-px w-2 h-2 rounded-full bg-emerald-400 border-[1.5px] border-bg-surface" />
      </div>
      <span className="text-[13px] text-slate-300 truncate">{username}</span>
    </div>
  );
}

// ── Mobile trigger button ──────────────────────────────────────────────────

export const MemberButton = memo(function MemberButton() {
  const users       = useChatStore(selectConnectedUsers);
  const currentRoom = useChatStore((s) => s.currentRoom);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl
                   bg-white/5 text-slate-400 text-xs active:bg-white/10 transition-colors"
        aria-label="Members"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="7" r="4"/>
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
        </svg>
        <span className="font-mono">{users.length}</span>
      </button>

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 inset-x-0 bg-bg-surface rounded-t-3xl border-t border-white/8
                       max-h-[65dvh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* Room header */}
            <div className="px-5 pb-3 border-b border-white/6 flex-shrink-0">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Room</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-base font-semibold text-slate-100">#{currentRoom}</p>
                <span className="text-xs text-emerald-400 font-mono">{users.length} online</span>
              </div>
            </div>

            {/* Member list */}
            <div className="overflow-y-auto px-3 py-2 space-y-0.5">
              {users.map((u) => (
                <MemberRow key={u.username} username={u.username} color={u.color} />
              ))}
              {users.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-6">No members yet</p>
              )}
            </div>

            {/* Bottom safe area */}
            <div className="flex-shrink-0" style={{ height: "calc(8px + var(--safe-bottom))" }} />
          </div>
        </div>
      )}
    </>
  );
});

// ── Desktop sidebar ────────────────────────────────────────────────────────

export const DesktopSidebar = memo(function DesktopSidebar() {
  const users       = useChatStore(selectConnectedUsers);
  const currentRoom = useChatStore((s) => s.currentRoom);

  return (
    <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-l border-white/6 bg-bg-surface">
      {/* Room name */}
      <div className="px-4 py-4 border-b border-white/6">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Room</p>
        <p className="text-sm font-semibold text-slate-200 mt-0.5 truncate">#{currentRoom}</p>
      </div>

      {/* Members */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-2 mb-2">
          Online · {users.length}
        </p>
        <div className="space-y-0.5">
          {users.map((u) => (
            <MemberRow key={u.username} username={u.username} color={u.color} />
          ))}
        </div>
      </div>
    </aside>
  );
});

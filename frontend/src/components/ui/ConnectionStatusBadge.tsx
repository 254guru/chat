import { memo } from "react";
import { cn } from "@/lib/utils";
import { ConnectionStatus } from "@/types/socket";

const CONFIG: Record<ConnectionStatus, { dot: string; label: string }> = {
  connected:     { dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]", label: "Online" },
  connecting:    { dot: "bg-amber-400 animate-pulse",   label: "Connecting" },
  reconnecting:  { dot: "bg-amber-400 animate-pulse",   label: "Reconnecting" },
  disconnected:  { dot: "bg-slate-600",                 label: "Offline" },
  error:         { dot: "bg-red-500 animate-pulse",     label: "Error" },
};

export const ConnectionStatusBadge = memo(function ConnectionStatusBadge({
  status,
}: { status: ConnectionStatus }) {
  const { dot, label } = CONFIG[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
      <span className="text-[11px] text-slate-400 font-mono">{label}</span>
    </div>
  );
});

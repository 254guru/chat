import { memo } from "react";
import { MessageEntry } from "@/types/socket";
import { formatTime } from "@/lib/utils";

interface Props {
  message: MessageEntry;
  isOwn: boolean;
  showAvatar: boolean; // false when same sender as previous message
}

export const MessageBubble = memo(function MessageBubble({ message, isOwn, showAvatar }: Props) {
  return (
    <div className={`flex items-end gap-2 animate-slide-up ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar — 28 px, hidden when same sender stacks */}
      <div className="w-7 flex-shrink-0">
        {showAvatar && !isOwn && (
          <div
            className="avatar w-7 h-7 text-[10px]"
            style={{ background: message.color }}
          >
            {message.username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Bubble + meta */}
      <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name — only on first in a group */}
        {showAvatar && !isOwn && (
          <span className="text-[11px] font-semibold mb-1 ml-1" style={{ color: message.color }}>
            {message.username}
          </span>
        )}

        <div className="group flex items-end gap-1.5">
          {/* Timestamp on hover — left side for own messages */}
          {isOwn && (
            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 whitespace-nowrap">
              {formatTime(message.timestamp)}
            </span>
          )}

          <div
            className={`
              px-3.5 py-2 rounded-2xl text-[15px] leading-relaxed shadow-msg break-words
              ${isOwn
                ? "bg-emerald-600/90 text-white rounded-br-md"
                : "bg-bg-card text-slate-100 border border-white/6 rounded-bl-md"
              }
            `}
            style={{ wordBreak: "break-word" }}
          >
            {message.message}
          </div>

          {/* Timestamp right side for received */}
          {!isOwn && (
            <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 whitespace-nowrap">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

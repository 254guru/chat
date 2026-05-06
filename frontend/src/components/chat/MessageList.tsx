import { memo, useEffect, useMemo, useRef } from "react";
import { useChatStore, selectMessages } from "@/store/chatStore";
import { MessageBubble } from "./MessageBubble";

interface Props {
  username: string | null;
  isLoading?: boolean;
}

function SkeletonBubble({ right }: { right: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${right ? "flex-row-reverse" : ""}`}>
      <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
      <div className={`h-10 rounded-2xl bg-white/5 animate-pulse ${right ? "w-40" : "w-52"}`} />
    </div>
  );
}

export const MessageList = memo(function MessageList({ username, isLoading = false }: Props) {
  const messages = useChatStore(selectMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Compute which bubbles should show an avatar (first in a consecutive run)
  const enriched = useMemo(() =>
    messages.map((msg, i) => ({
      msg,
      showAvatar: i === 0 || messages[i - 1].username !== msg.username,
    })),
    [messages]
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {[false, false, true, false, true, false].map((r, i) => (
          <SkeletonBubble key={i} right={r} />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-8">
          <div className="text-5xl mb-3 opacity-10">💬</div>
          <p className="text-slate-500 text-sm">No messages yet.<br />Be the first to say hello!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
      {enriched.map(({ msg, showAvatar }) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.username === username}
          showAvatar={showAvatar}
        />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
});

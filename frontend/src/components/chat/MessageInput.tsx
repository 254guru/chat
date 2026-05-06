import { memo, useCallback, useRef, useState, KeyboardEvent, CSSProperties } from "react";
import { useSocket } from "@/services/SocketProvider";
import { useChatStore, selectTypingUsers } from "@/store/chatStore";

interface Props { disabled?: boolean }

export const MessageInput = memo(function MessageInput({ disabled = false }: Props) {
  const { sendMessage, typingStart, typingStop } = useSocket();
  const typingUsers = useChatStore(selectTypingUsers);
  const username    = useChatStore((s) => s.username);

  // Use plain React state instead of react-hook-form.
  // RHF's register() returns its own onChange that conflicts with our custom
  // onChange for typing indicators, causing stale watch() values and a
  // permanently disabled send button.
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasText = message.trim().length > 0;

  const submit = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMessage({ message: trimmed });
    setMessage("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    // Stop typing indicator
    if (isTypingRef.current) {
      typingStop();
      isTypingRef.current = false;
      if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
    }
    // Re-focus after send (important on mobile — keeps keyboard open)
    textareaRef.current?.focus();
  }, [message, sendMessage, typingStop]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-grow textarea
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";

    // Typing indicator
    if (!isTypingRef.current) { typingStart(); isTypingRef.current = true; }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingStop(); isTypingRef.current = false;
    }, 2000);
  }, [typingStart, typingStop]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }, [submit]);

  const others = typingUsers.filter((u) => u.username !== username);

  return (
    <div
      className="flex-shrink-0 border-t border-white/6 bg-bg-surface"
      style={{ paddingBottom: "calc(8px + var(--safe-bottom))" } as CSSProperties}
    >
      {/* Typing indicator */}
      {others.length > 0 && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex gap-[3px] items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-blink"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {others.map((u) => u.username).join(", ")}{" "}
            {others.length === 1 ? "is" : "are"} typing
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2.5 px-3 pt-2 pb-1">
        {/* Textarea wrapper */}
        <div
          className="flex-1 flex items-end bg-bg-card border border-white/8 rounded-2xl
                     px-3.5 py-2.5 min-h-[44px] transition-colors duration-150
                     focus-within:border-emerald-500/50"
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={disabled ? "Joining room…" : "Message…"}
            className="input-msg"
            style={{
              height: "24px",
              overflowY: "hidden",
            } as CSSProperties}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !hasText}
          className="btn-send flex-shrink-0 transition-all duration-150"
          style={{
            opacity: !disabled && hasText ? 1 : 0.35,
            transform: !disabled && hasText ? "scale(1)" : "scale(0.9)",
          }}
          aria-label="Send message"
        >
          <svg
            width="17" height="17"
            viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
});

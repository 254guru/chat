import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: string; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]); // max 4
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast stack — bottom of screen, above keyboard on mobile */}
      <div className="fixed bottom-20 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              w-full max-w-sm px-4 py-3 rounded-2xl text-sm font-medium shadow-xl
              animate-slide-up pointer-events-auto
              ${t.type === "success" ? "bg-emerald-600 text-white" : ""}
              ${t.type === "error"   ? "bg-red-600 text-white" : ""}
              ${t.type === "info"    ? "bg-bg-card border border-white/10 text-slate-200" : ""}
            `}
          >
            <span className="mr-2">
              {t.type === "success" ? "✓" : t.type === "error" ? "✗" : "→"}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

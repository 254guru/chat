import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSocket } from "@/services/SocketProvider";
import { useChatStore } from "@/store/chatStore";
import { useToast } from "@/components/ui/Toast";
import { ConnectionStatusBadge } from "@/components/ui/ConnectionStatusBadge";

const schema = z.object({
  username: z.string().min(2,"Min 2 chars").max(32,"Too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, _ - only"),
  room: z.string().min(1,"Required").max(64,"Too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, _ - only"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate   = useNavigate();
  const { connect, join } = useSocket();
  const { toast }  = useToast();
  const status     = useChatStore((s) => s.status);
  const username   = useChatStore((s) => s.username);
  const lastError  = useChatStore((s) => s.lastError);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: "", room: "general" } });

  useEffect(() => { if (username) navigate("/chat"); }, [username, navigate]);
  useEffect(() => { if (lastError) toast(lastError, "error"); }, [lastError, toast]);

  const onSubmit = (values: FormValues) => {
    connect();
    join({ username: values.username, room: values.room });
  };

  const isLoading = isSubmitting || status === "connecting" || status === "reconnecting";

  return (
    <div className="h-full flex flex-col items-center justify-center px-5 bg-bg-base">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-pop">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-10 gap-3">
          <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center text-3xl shadow-glow-green">
            ⚡
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">RealtimeChat</h1>
            <p className="text-slate-500 text-xs mt-0.5 font-mono">FastAPI · Socket.IO · Redis</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-200">Join a room</h2>
            <ConnectionStatusBadge status={status} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
                Your name
              </label>
              <input
                {...register("username")}
                placeholder="e.g. alice"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full bg-bg-base border border-white/8 rounded-xl px-4 py-3
                           text-[15px] text-slate-100 placeholder-slate-600
                           outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30
                           transition-all duration-150"
              />
              {errors.username && (
                <p className="text-red-400 text-[11px] mt-1 font-mono">{errors.username.message}</p>
              )}
            </div>

            {/* Room */}
            <div>
              <label className="block text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
                Room
              </label>
              <input
                {...register("room")}
                placeholder="general"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full bg-bg-base border border-white/8 rounded-xl px-4 py-3
                           text-[15px] text-slate-100 placeholder-slate-600
                           outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30
                           transition-all duration-150"
              />
              {errors.room && (
                <p className="text-red-400 text-[11px] mt-1 font-mono">{errors.room.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold text-[15px]
                         active:scale-[0.98] transition-transform duration-100
                         disabled:opacity-50 disabled:pointer-events-none
                         shadow-glow-green"
            >
              {isLoading ? "Connecting…" : "Enter Room →"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-[11px] mt-5 font-mono">
          No account needed · end-to-end room broadcast
        </p>
      </div>
    </div>
  );
}

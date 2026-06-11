"use client";

import { useState } from "react";
import { BarChart3, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "register";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback`;
    const result =
      mode === "register"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectTo
            }
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "register" && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    window.location.assign("/dashboard");
  }

  const segmentClasses = (active: boolean) =>
    [
      "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200",
      active
        ? "bg-graphite-700/80 text-white shadow-sm shadow-black/30 ring-1 ring-white/10"
        : "text-slate-400 hover:text-slate-200"
    ].join(" ");

  return (
    <div className="relative w-full max-w-md">
      {/* Card glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-px rounded-3xl bg-gradient-to-b from-amberline/25 via-white/[0.06] to-mintline/20 blur-[2px]"
      />

      <div className="relative rounded-3xl border border-white/10 bg-graphite-900/90 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-3.5">
          <div className="rounded-2xl border border-amberline/25 bg-amberline/10 p-3 text-amberline shadow-[0_0_24px_rgba(246,184,75,0.15)]">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-slate-500">
              Tradecraft
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Backtesting Engine
            </h1>
          </div>
        </div>

        {/* Sign in / Register segmented control */}
        <div
          className="mb-7 flex gap-1 rounded-xl border border-white/[0.08] bg-graphite-950/60 p-1"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            aria-selected={mode === "sign-in"}
            className={segmentClasses(mode === "sign-in")}
            onClick={() => {
              setMode("sign-in");
              setMessage(null);
            }}
            role="tab"
            type="button"
          >
            Sign in
          </button>
          <button
            aria-selected={mode === "register"}
            className={segmentClasses(mode === "register")}
            onClick={() => {
              setMode("register");
              setMessage(null);
            }}
            role="tab"
            type="button"
          >
            Register
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-graphite-950/70 py-3 pl-11 pr-4 text-sm text-white shadow-inner shadow-black/20 outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/20 focus:border-amberline/60 focus:ring-2 focus:ring-amberline/25 focus-visible:outline-none"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="quant@example.com"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                className="w-full rounded-xl border border-white/10 bg-graphite-950/70 py-3 pl-11 pr-4 text-sm text-white shadow-inner shadow-black/20 outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/20 focus:border-amberline/60 focus:ring-2 focus:ring-amberline/25 focus-visible:outline-none"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                required
                type="password"
                value={password}
              />
            </div>
          </div>

          {message ? (
            <p
              className="rounded-xl border border-amberline/30 bg-amberline/10 px-4 py-3 text-sm leading-6 text-amber-100"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <button
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amberline px-4 py-3 text-sm font-semibold text-graphite-950 shadow-lg shadow-amberline/20 transition-all duration-200 hover:from-amber-200 hover:to-amber-300 hover:shadow-amberline/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {mode === "register" ? "Create account" : "Sign in to terminal"}
          </button>
        </form>

        <p className="mt-7 border-t border-white/[0.06] pt-5 text-center text-xs leading-5 text-slate-500">
          {mode === "register"
            ? "Already have an account? Switch to Sign in above."
            : "New to Tradecraft? Switch to Register above."}
        </p>
      </div>
    </div>
  );
}

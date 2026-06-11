"use client";

import { useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
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

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-graphite-900/85 p-8 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl bg-amberline/15 p-3 text-amberline">
          <BarChart3 aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Tradecraft</p>
          <h1 className="text-2xl font-semibold text-white">Backtesting Engine</h1>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="quant@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
            required
            type="password"
            value={password}
          />
        </div>

        {message ? (
          <p className="rounded-2xl border border-amberline/30 bg-amberline/10 px-4 py-3 text-sm text-amber-100">
            {message}
          </p>
        ) : null}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amberline px-4 py-3 font-semibold text-graphite-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {mode === "register" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        className="mt-6 text-sm text-slate-400 transition hover:text-white"
        onClick={() => {
          setMode(mode === "register" ? "sign-in" : "register");
          setMessage(null);
        }}
        type="button"
      >
        {mode === "register" ? "Already have an account? Sign in" : "Need an account? Register"}
      </button>
    </div>
  );
}

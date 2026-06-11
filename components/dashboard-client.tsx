"use client";

import { useMemo, useState } from "react";
import { Code2, Database, Download, Loader2, LogOut, Play, Save } from "lucide-react";
import { defaultStrategy } from "@/lib/default-strategy";
import { downloadNinjaScript, runBacktest } from "@/lib/api/backtest";
import { createClient } from "@/lib/supabase/client";
import type { BacktestResponse, StrategyConfig, StrategyRecord } from "@/lib/types/strategy";
import { MetricsPanel } from "@/components/metrics-panel";
import { StrategyBuilder } from "@/components/strategy-builder";
import { TradingChart } from "@/components/trading-chart";

type DashboardClientProps = {
  userId: string;
  email?: string;
  initialStrategies: StrategyRecord[];
};

export function DashboardClient({ userId, email, initialStrategies }: DashboardClientProps) {
  const [strategies, setStrategies] = useState<StrategyRecord[]>(initialStrategies);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(initialStrategies[0]?.id ?? null);
  const [strategy, setStrategy] = useState<StrategyConfig>(initialStrategies[0]?.config_json ?? defaultStrategy);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStrategy = useMemo(
    () => strategies.find((item) => item.id === selectedStrategyId) ?? null,
    [selectedStrategyId, strategies]
  );

  async function saveStrategy() {
    setIsSaving(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      user_id: userId,
      name: strategy.name,
      config_json: strategy
    };

    const query = selectedStrategy
      ? supabase.from("strategies").update(payload).eq("id", selectedStrategy.id).select("*").single()
      : supabase.from("strategies").insert(payload).select("*").single();

    const { data, error: saveError } = await query;
    setIsSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    const saved = data as StrategyRecord;
    setSelectedStrategyId(saved.id);
    setStrategies((current) => {
      const withoutSaved = current.filter((item) => item.id !== saved.id);
      return [saved, ...withoutSaved];
    });
  }

  async function executeBacktest() {
    setIsRunning(true);
    setError(null);

    try {
      const nextResult = await runBacktest(strategy);
      setResult(nextResult);

      const supabase = createClient();
      await supabase.from("backtest_results").insert({
        user_id: userId,
        strategy_id: selectedStrategyId,
        symbol: strategy.symbol,
        timeframe: strategy.timeframe,
        metrics: nextResult.metrics,
        config_json: strategy,
        total_return: nextResult.metrics.totalReturn,
        win_rate: nextResult.metrics.winRate
      });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Backtest failed");
    } finally {
      setIsRunning(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/auth");
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-amberline">Tradecraft Console</p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">Historical Backtesting Engine</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Authenticated strategy catalog, recursive JSON rules, DuckDB parquet reads, pandas-ta indicators,
            payload-safe chart data, and NinjaScript export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">{email ?? "Authenticated"}</span>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={signOut}
            type="button"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-6 2xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4 rounded-3xl border border-white/10 bg-graphite-900/75 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Catalog</p>
              <h2 className="text-lg font-semibold text-white">Saved strategies</h2>
            </div>
            <Database className="h-5 w-5 text-mintline" aria-hidden="true" />
          </div>

          <button
            className="w-full rounded-2xl border border-amberline/30 bg-amberline/10 px-4 py-3 text-left text-sm font-medium text-amber-100 transition hover:bg-amberline/20"
            onClick={() => {
              setStrategy(defaultStrategy);
              setSelectedStrategyId(null);
            }}
            type="button"
          >
            New RSI strategy
          </button>

          <div className="space-y-2">
            {strategies.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                No saved strategies yet. Configure the default template and save it to Supabase.
              </p>
            ) : null}
            {strategies.map((item) => (
              <button
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedStrategyId === item.id
                    ? "border-mintline/60 bg-mintline/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"
                }`}
                key={item.id}
                onClick={() => {
                  setSelectedStrategyId(item.id);
                  setStrategy(item.config_json);
                }}
                type="button"
              >
                <span className="block font-medium">{item.name}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.config_json.symbol} · {item.config_json.timeframe}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-amberline px-5 py-3 font-semibold text-graphite-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={saveStrategy}
              type="button"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              Save strategy
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-mintline px-5 py-3 font-semibold text-graphite-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRunning}
              onClick={executeBacktest}
              type="button"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              Run backtest
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
              onClick={() => downloadNinjaScript(strategy).catch((downloadError) => setError(downloadError.message))}
              type="button"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              NinjaScript
            </button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-dangerline/30 bg-dangerline/10 px-4 py-3 text-sm text-rose-100">{error}</p>
          ) : null}

          <MetricsPanel metrics={result?.metrics} />
          <TradingChart candles={result?.candles ?? []} />
          <StrategyBuilder value={strategy} onChange={setStrategy} />

          <section className="rounded-3xl border border-white/10 bg-black/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-300">
              <Code2 className="h-4 w-4 text-amberline" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em]">Strategy JSON</h2>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-2xl bg-graphite-950 p-4 text-xs leading-6 text-slate-300">
              {JSON.stringify(strategy, null, 2)}
            </pre>
          </section>
        </section>
      </div>
    </main>
  );
}

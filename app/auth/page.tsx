import {
  Activity,
  CandlestickChart,
  Database,
  Layers,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { AuthForm } from "@/components/auth-form";

const tickerRows = [
  { symbol: "SPY", price: "612.48", delta: "+0.84%", up: true },
  { symbol: "QQQ", price: "548.12", delta: "+1.12%", up: true },
  { symbol: "NVDA", price: "188.36", delta: "-0.42%", up: false },
  { symbol: "ES=F", price: "6,214.25", delta: "+0.67%", up: true }
];

const features = [
  {
    icon: Layers,
    title: "Recursive JSON rules",
    description: "Compose nested AND/OR indicator logic with full serialization."
  },
  {
    icon: Database,
    title: "DuckDB over Parquet",
    description: "Stream research-grade OHLCV data without a warehouse."
  },
  {
    icon: CandlestickChart,
    title: "Bar-by-bar replay",
    description: "Inspect fills, equity curves, and payload-safe charts."
  }
];

export default function AuthPage() {
  return (
    <main className="chart-grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amberline/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-mintline/10 blur-3xl"
      />

      <section className="relative z-10 grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Brand / hero panel */}
        <div className="space-y-10">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 shadow-glow backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mintline opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mintline" />
            </span>
            Supabase Auth · Vercel FastAPI · Parquet research data
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl xl:text-7xl">
              Build, test, and export{" "}
              <span className="bg-gradient-to-r from-amberline via-amber-200 to-mintline bg-clip-text text-transparent">
                systematic
              </span>{" "}
              equity strategies.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-400">
              Compose nested indicator rules, stream parquet data through
              DuckDB, inspect bar-by-bar performance, and export a starter
              NinjaScript.
            </p>
          </div>

          {/* Mock terminal ticker strip */}
          <div className="hidden max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/70 shadow-2xl shadow-black/40 backdrop-blur md:block">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                <Activity className="h-3.5 w-3.5 text-mintline" aria-hidden="true" />
                Market snapshot
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-dangerline/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amberline/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-mintline/70" />
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/[0.06] sm:grid-cols-4">
              {tickerRows.map((row) => (
                <div key={row.symbol} className="px-4 py-3 font-mono text-sm">
                  <p className="text-xs tracking-widest text-slate-500">{row.symbol}</p>
                  <p className="mt-1 font-semibold text-white">{row.price}</p>
                  <p
                    className={`mt-0.5 flex items-center gap-1 text-xs ${
                      row.up ? "text-mintline" : "text-dangerline"
                    }`}
                  >
                    <TrendingUp
                      className={`h-3 w-3 ${row.up ? "" : "rotate-180"}`}
                      aria-hidden="true"
                    />
                    {row.delta}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature highlights */}
          <ul className="grid max-w-xl gap-3 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors duration-200 hover:border-amberline/30 hover:bg-white/[0.05]"
              >
                <Icon
                  className="h-5 w-5 text-amberline transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-slate-200">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-mintline" aria-hidden="true" />
            Secured with Supabase Auth — row-level security on every strategy.
          </div>
        </div>

        {/* Login panel — leads on mobile, right column on desktop */}
        <div className="order-first flex justify-center lg:order-none lg:justify-end">
          <AuthForm />
        </div>
      </section>
    </main>
  );
}

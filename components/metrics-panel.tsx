import { Activity, BadgePercent, CircleDollarSign, LineChart, Percent, ShieldAlert } from "lucide-react";
import type { BacktestMetrics } from "@/lib/types/strategy";

const metricFormatters = {
  percent: (value: number) => `${value.toFixed(2)}%`,
  currency: (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value),
  number: (value: number) => value.toLocaleString()
};

export function MetricsPanel({ metrics }: { metrics?: BacktestMetrics }) {
  const items = [
    {
      label: "Total return",
      value: metrics ? metricFormatters.percent(metrics.totalReturn) : "--",
      icon: Percent,
      accent: "text-mintline"
    },
    {
      label: "Win rate",
      value: metrics ? metricFormatters.percent(metrics.winRate) : "--",
      icon: BadgePercent,
      accent: "text-amberline"
    },
    {
      label: "Trades",
      value: metrics ? metricFormatters.number(metrics.trades) : "--",
      icon: Activity,
      accent: "text-slate-300"
    },
    {
      label: "Final equity",
      value: metrics ? metricFormatters.currency(metrics.finalEquity) : "--",
      icon: CircleDollarSign,
      accent: "text-mintline"
    },
    {
      label: "Max drawdown",
      value: metrics ? metricFormatters.percent(metrics.maxDrawdown) : "--",
      icon: ShieldAlert,
      accent: "text-dangerline"
    },
    {
      label: "Exposure",
      value: metrics ? metricFormatters.percent(metrics.exposurePct) : "--",
      icon: LineChart,
      accent: "text-slate-300"
    }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-graphite-900/75 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <Icon className={`h-4 w-4 ${item.accent}`} aria-hidden="true" />
            </div>
            <p className="text-2xl font-semibold text-white">{item.value}</p>
          </div>
        );
      })}
    </section>
  );
}

import type { BacktestResponse, StrategyConfig } from "@/lib/types/strategy";

export async function runBacktest(strategy: StrategyConfig): Promise<BacktestResponse> {
  const response = await fetch("/api/backtest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ strategy })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Backtest failed");
  }

  return response.json() as Promise<BacktestResponse>;
}

export async function downloadNinjaScript(strategy: StrategyConfig) {
  const response = await fetch("/api/export_ninjascript", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ strategy })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "NinjaScript export failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${strategy.name.replace(/[^a-z0-9]+/gi, "_")}.cs`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

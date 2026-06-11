"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi
} from "lightweight-charts";
import type { ChartCandle } from "@/lib/types/strategy";

function toChartTime(value: string) {
  return Math.floor(new Date(value).getTime() / 1000) as never;
}

export function TradingChart({ candles }: { candles: ChartCandle[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const indicatorKeys = useMemo(() => {
    const firstWithIndicators = candles.find((candle) => candle.indicators && Object.keys(candle.indicators).length > 0);
    return firstWithIndicators?.indicators ? Object.keys(firstWithIndicators.indicators).slice(0, 4) : [];
  }, [candles]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      height: 520,
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8"
      },
      grid: {
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
        vertLines: { color: "rgba(148, 163, 184, 0.08)" }
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.16)"
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.16)",
        timeVisible: true
      }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#2dd4bf",
      downColor: "#fb7185",
      borderVisible: false,
      wickUpColor: "#2dd4bf",
      wickDownColor: "#fb7185"
    });

    candleSeries.setData(
      candles.map((candle) => ({
        time: toChartTime(candle.time),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(148, 163, 184, 0.28)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume"
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });

    volumeSeries.setData(
      candles.map((candle) => ({
        time: toChartTime(candle.time),
        value: candle.volume,
        color: candle.close >= candle.open ? "rgba(45, 212, 191, 0.3)" : "rgba(251, 113, 133, 0.3)"
      }))
    );

    const colors = ["#f6b84b", "#60a5fa", "#a78bfa", "#f472b6"];
    indicatorKeys.forEach((key, index) => {
      const values = candles
        .map((candle) => ({
          time: toChartTime(candle.time),
          value: candle.indicators?.[key] ?? null
        }))
        .filter((point): point is { time: never; value: number } => typeof point.value === "number");

      if (values.length === 0) {
        return;
      }

      const series = chart.addSeries(key.toLowerCase().includes("rsi") ? AreaSeries : LineSeries, {
        color: colors[index % colors.length],
        lineWidth: 2,
        priceScaleId: "right"
      });
      series.setData(values);
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, indicatorKeys]);

  return (
    <section className="chart-grid-bg overflow-hidden rounded-3xl border border-white/10 bg-graphite-900/70 p-3 shadow-glow">
      {candles.length > 0 ? (
        <div ref={containerRef} className="h-[520px] w-full" />
      ) : (
        <div className="flex h-[520px] items-center justify-center text-center text-slate-500">
          Run a backtest to render OHLCV candles, volume, and indicator overlays.
        </div>
      )}
    </section>
  );
}

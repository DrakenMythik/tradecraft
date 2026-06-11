import type { StrategyConfig } from "@/lib/types/strategy";

export const defaultStrategy: StrategyConfig = {
  name: "RSI recovery with trend filter",
  symbol: "SPY",
  timeframe: "1D",
  data: {
    bucket: "market-data",
    path: "stocks/SPY/1D.parquet",
    symbol: "SPY",
    timeframe: "1D",
    maxPoints: 3000
  },
  entry: {
    type: "group",
    operator: "AND",
    conditions: [
      {
        type: "condition",
        left: {
          type: "indicator",
          name: "rsi",
          params: { length: 14 },
          timeframe: "1D"
        },
        comparator: "<",
        right: { type: "value", value: 35 }
      },
      {
        type: "condition",
        left: { type: "price", field: "close" },
        comparator: ">",
        right: {
          type: "indicator",
          name: "sma",
          params: { length: 200 },
          timeframe: "1D"
        }
      }
    ]
  },
  exit: {
    type: "group",
    operator: "OR",
    conditions: [
      {
        type: "condition",
        left: {
          type: "indicator",
          name: "rsi",
          params: { length: 14 },
          timeframe: "1D"
        },
        comparator: ">",
        right: { type: "value", value: 58 }
      },
      {
        type: "condition",
        left: { type: "price", field: "close" },
        comparator: "<",
        right: {
          type: "indicator",
          name: "sma",
          params: { length: 50 },
          timeframe: "1D"
        }
      }
    ]
  },
  risk: {
    initialCapital: 100000,
    positionSizePct: 95,
    feeBps: 1
  }
};

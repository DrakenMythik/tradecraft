export type LogicalOperator = "AND" | "OR";
export type Comparator = ">" | ">=" | "<" | "<=" | "==" | "!=" | "crosses_above" | "crosses_below";
export type PriceField = "open" | "high" | "low" | "close" | "volume";

export type PriceOperand = {
  type: "price";
  field: PriceField;
  timeframe?: string;
  shift?: number;
};

export type IndicatorOperand = {
  type: "indicator";
  name: string;
  params: Record<string, number | string | boolean>;
  field?: string;
  timeframe?: string;
  shift?: number;
};

export type ValueOperand = {
  type: "value";
  value: number;
};

export type StrategyOperand = PriceOperand | IndicatorOperand | ValueOperand;

export type StrategyCondition = {
  type: "condition";
  left: StrategyOperand;
  comparator: Comparator;
  right: StrategyOperand;
};

export type StrategyGroup = {
  type: "group";
  operator: LogicalOperator;
  conditions: StrategyNode[];
};

export type StrategyNode = StrategyCondition | StrategyGroup;

export type StrategyRisk = {
  initialCapital: number;
  positionSizePct: number;
  feeBps: number;
};

export type StrategyDataSource = {
  bucket: string;
  path: string;
  publicUrl?: string;
  start?: string;
  end?: string;
  symbol?: string;
  timeframe?: string;
  maxPoints?: number;
};

export type StrategyConfig = {
  name: string;
  symbol: string;
  timeframe: string;
  data: StrategyDataSource;
  entry: StrategyGroup;
  exit: StrategyGroup;
  risk: StrategyRisk;
};

export type StrategyRecord = {
  id: string;
  user_id: string;
  name: string;
  config_json: StrategyConfig;
  created_at?: string;
  updated_at?: string;
};

export type ChartCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  indicators?: Record<string, number | null>;
};

export type BacktestMetrics = {
  totalReturn: number;
  winRate: number;
  trades: number;
  finalEquity: number;
  maxDrawdown: number;
  exposurePct: number;
};

export type BacktestResponse = {
  symbol: string;
  timeframe: string;
  metrics: BacktestMetrics;
  candles: ChartCandle[];
  trades: Array<{
    entryTime: string;
    exitTime: string;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    returnPct: number;
  }>;
  pagination: {
    originalRows: number;
    returnedRows: number;
    downsampled: boolean;
    page?: number;
    pageSize?: number;
    nextPage?: number | null;
  };
};

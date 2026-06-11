# Tradecraft Historical Backtesting Engine

An MVP quantitative research workstation built for Vercel:

- Next.js App Router frontend with TailwindCSS and `lucide-react`
- Supabase Auth with `@supabase/ssr`
- Supabase PostgreSQL strategy and result storage with row level security
- FastAPI Python serverless functions in `/api`
- DuckDB parquet-over-HTTP reads from Supabase Storage
- pandas + pandas-ta procedural indicators
- Bar-by-bar long-only backtest loop
- TradingView `lightweight-charts` visualization
- NinjaScript C# scaffold export

## Repository layout

```text
app/
  api/auth/callback/route.ts   # Supabase auth code exchange
  auth/page.tsx                # Login/register screen
  dashboard/page.tsx           # Protected dashboard route
api/
  backtest.py                  # POST /api/backtest
  export_ninjascript.py        # POST /api/export_ninjascript
  engine.py                    # DuckDB, pandas-ta, strategy parser, backtest loop
components/
  dashboard-client.tsx
  strategy-builder.tsx
  trading-chart.tsx
  metrics-panel.tsx
lib/
  api/backtest.ts
  supabase/
  types/strategy.ts
supabase/schema.sql
```

## Local setup

```bash
npm install
npm run dev
```

Python dependencies are installed by Vercel from `requirements.txt`. For local Python API experiments:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Environment variables

Copy `.env.example` to `.env.local` for local development and configure the same values in Vercel.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATA_BUCKET=market-data
```

No database keys are hardcoded. The browser only receives the public Supabase URL and anon key. The service role key is only used by the Python API to create signed Supabase Storage URLs for private parquet files.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a Storage bucket, for example `market-data`.
4. Upload parquet files using paths like:

```text
stocks/SPY/1D.parquet
stocks/AAPL/1D.parquet
```

Parquet files must include:

- `timestamp`, `datetime`, `date`, or `time`
- `open`
- `high`
- `low`
- `close`
- `volume`

## Strategy JSON shape

The dashboard edits a recursive JSON schema. Groups may contain nested groups or leaf conditions.

```json
{
  "name": "RSI recovery with trend filter",
  "symbol": "SPY",
  "timeframe": "1D",
  "data": {
    "bucket": "market-data",
    "path": "stocks/SPY/1D.parquet",
    "maxPoints": 3000
  },
  "entry": {
    "type": "group",
    "operator": "AND",
    "conditions": [
      {
        "type": "condition",
        "left": {
          "type": "indicator",
          "name": "rsi",
          "params": { "length": 14 },
          "timeframe": "1D"
        },
        "comparator": "<",
        "right": { "type": "value", "value": 35 }
      }
    ]
  },
  "exit": {
    "type": "group",
    "operator": "OR",
    "conditions": []
  },
  "risk": {
    "initialCapital": 100000,
    "positionSizePct": 95,
    "feeBps": 1
  }
}
```

Supported operand types:

- `price`: `open`, `high`, `low`, `close`, `volume`
- `indicator`: any callable pandas-ta indicator available in the deployed environment
- `value`: numeric literal

Supported comparators:

- `>`
- `>=`
- `<`
- `<=`
- `==`
- `!=`
- `crosses_above`
- `crosses_below`

## Multi-timeframe analysis

If an operand specifies a timeframe different from the strategy timeframe, the Python engine resamples OHLCV data with pandas, calculates the requested price or indicator series on the resampled frame, then forward-fills it back to the base frame before the bar-by-bar loop.

Examples:

- Base strategy timeframe: `1D`
- Indicator operand timeframe: `1W`
- Price operand timeframe: `1H`

## Vercel constraints

The Python engine includes explicit safeguards:

- DuckDB is initialized with `SET memory_limit='1GB'` and `SET threads=1`.
- Responses are downsampled by default and rechecked against a 4.5 MB hard payload limit.
- Request `data.page` and `data.pageSize` to paginate chart rows instead of using default downsampling.
- `requirements.txt` is intentionally minimal:
  - `fastapi`
  - `duckdb`
  - `pandas`
  - `pandas-ta`
  - `supabase`

## API endpoints

### `POST /api/backtest`

Request:

```json
{
  "strategy": { "...": "StrategyConfig" }
}
```

Response:

```json
{
  "symbol": "SPY",
  "timeframe": "1D",
  "metrics": {
    "totalReturn": 12.4,
    "winRate": 58.3,
    "trades": 24,
    "finalEquity": 112400,
    "maxDrawdown": 9.1,
    "exposurePct": 42.0
  },
  "candles": [],
  "trades": [],
  "pagination": {
    "originalRows": 5000,
    "returnedRows": 3000,
    "downsampled": true
  }
}
```

### `POST /api/export_ninjascript`

Returns a `.cs` download containing a safe NinjaScript strategy scaffold and comments describing the JSON rules. The MVP exporter does not claim one-to-one pandas-ta to NinjaTrader indicator parity; review and complete the generated `entrySignal` and `exitSignal` conditions before live use.

## Deployment

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Add the environment variables listed above.
4. Ensure Vercel installs Node and Python dependencies.
5. Deploy.

The root Next.js app and `/api/*.py` FastAPI functions are both deployable by Vercel from this monorepo.

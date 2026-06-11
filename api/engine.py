from __future__ import annotations

import inspect
import json
import math
import os
from dataclasses import dataclass
from typing import Any

import duckdb
import pandas as pd
import pandas_ta as ta
from supabase import create_client


MAX_RESPONSE_BYTES = 4_500_000
SAFE_RESPONSE_BYTES = 4_200_000
DEFAULT_MAX_POINTS = 3_000
MAX_POINTS = 5_000
OHLCV_COLUMNS = ["open", "high", "low", "close", "volume"]


class BacktestError(ValueError):
    """Raised for invalid strategy inputs or unsupported market data."""


@dataclass
class PreparedContext:
    data: pd.DataFrame
    operand_cache: dict[str, pd.Series | float]
    indicator_columns: dict[str, str]


def run_strategy_backtest(strategy: dict[str, Any]) -> dict[str, Any]:
    data = read_market_data(strategy.get("data", {}))
    context = prepare_context(strategy, data)
    trades, equity_curve, exposure_bars = run_bar_loop(strategy, context)

    initial_capital = float(strategy.get("risk", {}).get("initialCapital", 100_000))
    final_equity = float(equity_curve[-1]) if equity_curve else initial_capital
    total_return = ((final_equity / initial_capital) - 1) * 100 if initial_capital else 0
    wins = sum(1 for trade in trades if trade["pnl"] > 0)
    win_rate = (wins / len(trades) * 100) if trades else 0
    max_drawdown = calculate_max_drawdown(equity_curve)
    exposure_pct = exposure_bars / len(context.data) * 100 if len(context.data) else 0

    chart_frame = build_chart_frame(context)
    response = {
        "symbol": strategy.get("symbol") or strategy.get("data", {}).get("symbol", "UNKNOWN"),
        "timeframe": strategy.get("timeframe") or strategy.get("data", {}).get("timeframe", "1D"),
        "metrics": {
            "totalReturn": round(total_return, 4),
            "winRate": round(win_rate, 4),
            "trades": len(trades),
            "finalEquity": round(final_equity, 2),
            "maxDrawdown": round(max_drawdown, 4),
            "exposurePct": round(exposure_pct, 4),
        },
        "candles": [],
        "trades": trades,
        "pagination": {
            "originalRows": int(len(chart_frame)),
            "returnedRows": 0,
            "downsampled": False,
        },
    }

    return attach_payload_safe_candles(response, chart_frame, strategy.get("data", {}))


def read_market_data(data_source: dict[str, Any]) -> pd.DataFrame:
    parquet_url = build_parquet_url(data_source)
    escaped_url = parquet_url.replace("'", "''")

    connection = duckdb.connect(database=":memory:")
    try:
        connection.execute("SET memory_limit='1GB'")
        connection.execute("SET threads=1")
        connection.execute("INSTALL httpfs")
        connection.execute("LOAD httpfs")
        frame = connection.execute(f"SELECT * FROM read_parquet('{escaped_url}')").fetchdf()
    finally:
        connection.close()

    if frame.empty:
        raise BacktestError("The parquet source returned no rows.")

    frame = normalize_market_frame(frame)
    start = data_source.get("start")
    end = data_source.get("end")

    if start:
        frame = frame.loc[frame.index >= pd.Timestamp(start)]
    if end:
        frame = frame.loc[frame.index <= pd.Timestamp(end)]

    if frame.empty:
        raise BacktestError("No rows remain after applying the requested date range.")

    return frame


def build_parquet_url(data_source: dict[str, Any]) -> str:
    if data_source.get("publicUrl"):
        return str(data_source["publicUrl"])

    bucket = data_source.get("bucket") or os.environ.get("SUPABASE_DATA_BUCKET")
    path = data_source.get("path")
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")

    if not bucket or not path:
        raise BacktestError("Strategy data must include a Supabase Storage bucket and parquet path.")
    if not supabase_url:
        raise BacktestError("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required for storage access.")

    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if service_key:
        client = create_client(supabase_url, service_key)
        signed = client.storage.from_(bucket).create_signed_url(path, 3600)
        signed_url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
        if not signed_url:
            raise BacktestError("Supabase did not return a signed URL for the parquet file.")
        if str(signed_url).startswith("http"):
            return str(signed_url)
        return f"{supabase_url.rstrip('/')}/storage/v1{signed_url}"

    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{path.lstrip('/')}"


def normalize_market_frame(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.rename(columns={column: str(column).lower() for column in frame.columns})
    time_column = next((name for name in ["timestamp", "datetime", "date", "time"] if name in frame.columns), None)

    if not time_column:
        raise BacktestError("Parquet data must include timestamp, datetime, date, or time column.")

    frame[time_column] = pd.to_datetime(frame[time_column], utc=True, errors="coerce")
    frame = frame.dropna(subset=[time_column]).set_index(time_column).sort_index()

    missing = [column for column in OHLCV_COLUMNS if column not in frame.columns]
    if missing:
        raise BacktestError(f"Parquet data is missing required OHLCV columns: {', '.join(missing)}")

    for column in OHLCV_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    return frame.dropna(subset=["open", "high", "low", "close"])


def prepare_context(strategy: dict[str, Any], data: pd.DataFrame) -> PreparedContext:
    context = PreparedContext(data=data.copy(), operand_cache={}, indicator_columns={})
    for operand in collect_operands(strategy.get("entry")) + collect_operands(strategy.get("exit")):
        resolve_operand(operand, context, strategy)
    return context


def collect_operands(node: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not node:
        return []
    if node.get("type") == "condition":
        return [node.get("left", {}), node.get("right", {})]
    operands: list[dict[str, Any]] = []
    for child in node.get("conditions", []):
        operands.extend(collect_operands(child))
    return operands


def resolve_operand(
    operand: dict[str, Any],
    context: PreparedContext,
    strategy: dict[str, Any],
) -> pd.Series | float:
    operand_type = operand.get("type")
    if operand_type == "value":
        return float(operand.get("value", 0))

    cache_key = json.dumps(operand, sort_keys=True)
    if cache_key in context.operand_cache:
        return context.operand_cache[cache_key]

    if operand_type == "price":
        series = resolve_price_operand(operand, context.data, strategy)
    elif operand_type == "indicator":
        series = resolve_indicator_operand(operand, context.data, strategy)
        context.indicator_columns[series.name or cache_key] = series.name or cache_key
    else:
        raise BacktestError(f"Unsupported operand type: {operand_type}")

    shift = int(operand.get("shift") or 0)
    if shift:
        series = series.shift(shift)

    context.operand_cache[cache_key] = series
    if isinstance(series, pd.Series) and series.name:
        context.data[series.name] = series
    return series


def resolve_price_operand(
    operand: dict[str, Any],
    data: pd.DataFrame,
    strategy: dict[str, Any],
) -> pd.Series:
    field = str(operand.get("field", "close")).lower()
    if field not in OHLCV_COLUMNS:
        raise BacktestError(f"Unsupported price field: {field}")

    timeframe = operand.get("timeframe")
    base_timeframe = strategy.get("timeframe") or strategy.get("data", {}).get("timeframe")
    if timeframe and timeframe != base_timeframe:
        resampled = resample_ohlcv(data, str(timeframe))
        series = resampled[field].reindex(data.index, method="ffill")
    else:
        series = data[field]

    series = series.rename(f"price_{field}_{timeframe or base_timeframe or 'base'}")
    return series


def resolve_indicator_operand(
    operand: dict[str, Any],
    data: pd.DataFrame,
    strategy: dict[str, Any],
) -> pd.Series:
    indicator_name = str(operand.get("name", "")).lower().strip()
    if not indicator_name or not hasattr(ta, indicator_name):
        raise BacktestError(f"Unsupported pandas-ta indicator: {indicator_name}")

    timeframe = operand.get("timeframe")
    base_timeframe = strategy.get("timeframe") or strategy.get("data", {}).get("timeframe")
    source = resample_ohlcv(data, str(timeframe)) if timeframe and timeframe != base_timeframe else data

    indicator_func = getattr(ta, indicator_name)
    params = dict(operand.get("params") or {})
    signature = inspect.signature(indicator_func)
    for parameter_name in signature.parameters:
        column_name = "open" if parameter_name == "open_" else parameter_name
        if column_name in source.columns and parameter_name not in params:
            params[parameter_name] = source[column_name]

    result = indicator_func(**params)
    if result is None:
        raise BacktestError(f"pandas-ta returned no values for indicator: {indicator_name}")

    if isinstance(result, pd.DataFrame):
        numeric = result.select_dtypes(include="number")
        field = operand.get("field")
        if field and field in numeric.columns:
            series = numeric[field]
        elif field:
            matching = [column for column in numeric.columns if str(field).lower() in str(column).lower()]
            series = numeric[matching[0]] if matching else numeric.iloc[:, 0]
        else:
            series = numeric.iloc[:, 0]
    else:
        series = pd.to_numeric(result, errors="coerce")

    if timeframe and timeframe != base_timeframe:
        series = series.reindex(data.index, method="ffill")

    label = indicator_label(indicator_name, timeframe or base_timeframe or "base", operand, series.name)
    return pd.Series(series, index=data.index, name=label)


def indicator_label(indicator_name: str, timeframe: str, operand: dict[str, Any], output_name: Any) -> str:
    params = operand.get("params") or {}
    param_label = "_".join(f"{key}{value}" for key, value in sorted(params.items()) if isinstance(value, (int, float, str)))
    output_label = operand.get("field") or output_name or "value"
    return "_".join(part for part in [indicator_name, str(timeframe), str(output_label), param_label] if part).replace(" ", "_")


def resample_ohlcv(data: pd.DataFrame, timeframe: str) -> pd.DataFrame:
    rule = pandas_rule(timeframe)
    return (
        data[OHLCV_COLUMNS]
        .resample(rule)
        .agg({
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum",
        })
        .dropna(subset=["open", "high", "low", "close"])
    )


def pandas_rule(timeframe: str) -> str:
    value = timeframe.strip()
    amount = "".join(character for character in value if character.isdigit()) or "1"
    unit = "".join(character for character in value if character.isalpha()).lower() or "d"
    mapping = {
        "m": "min",
        "min": "min",
        "minute": "min",
        "h": "h",
        "hr": "h",
        "hour": "h",
        "d": "D",
        "day": "D",
        "w": "W",
        "week": "W",
        "mo": "ME",
        "month": "ME",
    }
    if unit not in mapping:
        raise BacktestError(f"Unsupported timeframe: {timeframe}")
    return f"{amount}{mapping[unit]}"


def run_bar_loop(strategy: dict[str, Any], context: PreparedContext) -> tuple[list[dict[str, Any]], list[float], int]:
    risk = strategy.get("risk", {})
    initial_capital = float(risk.get("initialCapital", 100_000))
    position_size_pct = float(risk.get("positionSizePct", 100)) / 100
    fee_rate = float(risk.get("feeBps", 0)) / 10_000

    cash = initial_capital
    quantity = 0.0
    entry_price = 0.0
    entry_time: pd.Timestamp | None = None
    entry_notional = 0.0
    trades: list[dict[str, Any]] = []
    equity_curve: list[float] = []
    exposure_bars = 0

    for index in range(1, len(context.data)):
        row = context.data.iloc[index]
        close = float(row["close"])
        in_position = quantity > 0

        if in_position:
            exposure_bars += 1
            if evaluate_node(strategy.get("exit"), index, context):
                gross = quantity * close
                fee = gross * fee_rate
                cash += gross - fee
                pnl = cash - initial_capital if not trades else cash - equity_curve[-1]
                trade_pnl = (close - entry_price) * quantity - (entry_notional * fee_rate) - fee
                trades.append({
                    "entryTime": isoformat(entry_time),
                    "exitTime": isoformat(context.data.index[index]),
                    "entryPrice": round(entry_price, 4),
                    "exitPrice": round(close, 4),
                    "quantity": round(quantity, 6),
                    "pnl": round(trade_pnl, 2),
                    "returnPct": round((trade_pnl / entry_notional) * 100, 4) if entry_notional else 0,
                })
                quantity = 0.0
                entry_notional = 0.0
                entry_price = 0.0
                entry_time = None
        elif evaluate_node(strategy.get("entry"), index, context):
            notional = max(cash, 0) * position_size_pct
            if notional > 0 and close > 0:
                fee = notional * fee_rate
                quantity = (notional - fee) / close
                cash -= notional
                entry_price = close
                entry_time = context.data.index[index]
                entry_notional = notional

        mark_to_market = cash + quantity * close
        equity_curve.append(float(mark_to_market))

    if quantity > 0:
        close = float(context.data.iloc[-1]["close"])
        gross = quantity * close
        fee = gross * fee_rate
        cash += gross - fee
        trade_pnl = (close - entry_price) * quantity - (entry_notional * fee_rate) - fee
        trades.append({
            "entryTime": isoformat(entry_time),
            "exitTime": isoformat(context.data.index[-1]),
            "entryPrice": round(entry_price, 4),
            "exitPrice": round(close, 4),
            "quantity": round(quantity, 6),
            "pnl": round(trade_pnl, 2),
            "returnPct": round((trade_pnl / entry_notional) * 100, 4) if entry_notional else 0,
        })
        equity_curve.append(float(cash))

    return trades, equity_curve or [initial_capital], exposure_bars


def evaluate_node(node: dict[str, Any] | None, index: int, context: PreparedContext) -> bool:
    if not node:
        return False
    if node.get("type") == "group":
        values = [evaluate_node(child, index, context) for child in node.get("conditions", [])]
        return all(values) if node.get("operator") == "AND" else any(values)
    if node.get("type") != "condition":
        return False

    left = resolve_operand(node.get("left", {}), context, {})
    right = resolve_operand(node.get("right", {}), context, {})
    comparator = node.get("comparator")

    left_value = value_at(left, index)
    right_value = value_at(right, index)
    if not finite(left_value) or not finite(right_value):
        return False

    if comparator == ">":
        return left_value > right_value
    if comparator == ">=":
        return left_value >= right_value
    if comparator == "<":
        return left_value < right_value
    if comparator == "<=":
        return left_value <= right_value
    if comparator == "==":
        return left_value == right_value
    if comparator == "!=":
        return left_value != right_value
    if comparator in {"crosses_above", "crosses_below"}:
        previous_left = value_at(left, index - 1)
        previous_right = value_at(right, index - 1)
        if not finite(previous_left) or not finite(previous_right):
            return False
        if comparator == "crosses_above":
            return previous_left <= previous_right and left_value > right_value
        return previous_left >= previous_right and left_value < right_value

    raise BacktestError(f"Unsupported comparator: {comparator}")


def value_at(value: pd.Series | float, index: int) -> float:
    if isinstance(value, pd.Series):
        if index < 0 or index >= len(value):
            return math.nan
        return float(value.iloc[index])
    return float(value)


def finite(value: float) -> bool:
    return not (math.isnan(value) or math.isinf(value))


def calculate_max_drawdown(equity_curve: list[float]) -> float:
    peak = -math.inf
    max_drawdown = 0.0
    for equity in equity_curve:
        peak = max(peak, equity)
        if peak > 0:
            max_drawdown = max(max_drawdown, (peak - equity) / peak * 100)
    return max_drawdown


def build_chart_frame(context: PreparedContext) -> pd.DataFrame:
    columns = OHLCV_COLUMNS + list(context.indicator_columns.values())
    frame = context.data.loc[:, [column for column in columns if column in context.data.columns]].copy()
    frame.insert(0, "time", context.data.index)
    return frame


def attach_payload_safe_candles(
    response: dict[str, Any],
    chart_frame: pd.DataFrame,
    data_source: dict[str, Any],
) -> dict[str, Any]:
    page = data_source.get("page")
    page_size = data_source.get("pageSize") or data_source.get("page_size")
    max_points = int(data_source.get("maxPoints") or DEFAULT_MAX_POINTS)
    max_points = max(100, min(max_points, MAX_POINTS))

    if page is not None and page_size:
        page_number = max(int(page), 1)
        size = max(100, min(int(page_size), MAX_POINTS))
        start = (page_number - 1) * size
        selected = chart_frame.iloc[start:start + size]
        response["pagination"].update({
            "page": page_number,
            "pageSize": size,
            "nextPage": page_number + 1 if start + size < len(chart_frame) else None,
            "downsampled": False,
        })
    else:
        selected = downsample_chart_frame(chart_frame, max_points)
        response["pagination"]["downsampled"] = len(selected) < len(chart_frame)

    while True:
        response["candles"] = chart_records(selected)
        response["pagination"]["returnedRows"] = len(response["candles"])
        payload_size = len(json.dumps(response, separators=(",", ":"), allow_nan=False).encode("utf-8"))
        if payload_size <= SAFE_RESPONSE_BYTES or len(selected) <= 100:
            break
        selected = downsample_chart_frame(selected, max(100, len(selected) // 2))
        response["pagination"]["downsampled"] = True

    if len(json.dumps(response, separators=(",", ":"), allow_nan=False).encode("utf-8")) > MAX_RESPONSE_BYTES:
        raise BacktestError("Backtest response exceeded the 4.5 MB Vercel payload limit after downsampling.")

    return response


def downsample_chart_frame(frame: pd.DataFrame, max_points: int) -> pd.DataFrame:
    if len(frame) <= max_points:
        return frame

    working = frame.reset_index(drop=True).copy()
    working["_bucket"] = (pd.Series(range(len(working))) * max_points // len(working)).to_numpy()
    aggregations: dict[str, str] = {
        "time": "first",
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
        "volume": "sum",
    }
    for column in working.columns:
        if column not in aggregations and column != "_bucket":
            aggregations[column] = "last"
    return working.groupby("_bucket", as_index=False).agg(aggregations).drop(columns=["_bucket"], errors="ignore")


def chart_records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    indicator_columns = [column for column in frame.columns if column not in ["time", *OHLCV_COLUMNS]]
    records: list[dict[str, Any]] = []
    for row in frame.itertuples(index=False):
        row_dict = row._asdict()
        indicators = {
            column: nullable_float(row_dict[column])
            for column in indicator_columns
            if column in row_dict
        }
        records.append({
            "time": isoformat(row_dict["time"]),
            "open": round(float(row_dict["open"]), 6),
            "high": round(float(row_dict["high"]), 6),
            "low": round(float(row_dict["low"]), 6),
            "close": round(float(row_dict["close"]), 6),
            "volume": round(float(row_dict.get("volume") or 0), 4),
            "indicators": indicators,
        })
    return records


def nullable_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if finite(result) else None


def isoformat(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    return pd.Timestamp(value).isoformat()

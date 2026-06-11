from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.engine import BacktestError, run_strategy_backtest


app = FastAPI(title="Tradecraft Backtest API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/backtest")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/backtest")
def backtest(payload: dict[str, Any]) -> dict[str, Any]:
    strategy = payload.get("strategy")
    if not isinstance(strategy, dict):
        raise HTTPException(status_code=422, detail="Request body must include a strategy object.")

    try:
        return run_strategy_backtest(strategy)
    except BacktestError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Backtest engine failed: {error}") from error

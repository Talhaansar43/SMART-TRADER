"""Trend-breakout strategy (Donchian 55/20 with ATR risk control), shared by the live bot and the backtest."""

import math
from typing import Any

BREAKOUT_DAYS = 55
EXIT_DAYS = 20
ATR_DAYS = 20
TREND_DAYS = 200
MOMENTUM_DAYS = 126
STOP_ATR = 2.0
RISK_PCT = 0.015
MAX_POSITION_PCT = 0.20
FEE_RATE = 0.001
MIN_BARS = TREND_DAYS + 1

STRATEGY_NAME = "Trend Breakout (Donchian 55/20, ATR risk control)"
STRATEGY_RULES = [
    "Market filter: only buy while SPY (stocks) or Bitcoin (crypto) trades above its own 200-day average.",
    f"Entry: a symbol closes above its {BREAKOUT_DAYS}-day high and above its {TREND_DAYS}-day average, with positive 6-month momentum.",
    "Ranking: when several symbols qualify in one scan pass, the strongest 6-month momentum is bought first.",
    f"Sizing: risk {RISK_PCT:.1%} of equity per trade with a stop {STOP_ATR:g} ATR below entry, at most {MAX_POSITION_PCT:.0%} of equity in one position, no leverage.",
    f"Exit: close below the {EXIT_DAYS}-day low (trend ended) or below the protective stop. Winners are not capped.",
    f"Costs: {FEE_RATE:.1%} simulated fee on every buy and sell.",
]


def analyze_arrays(closes: list[float], highs: list[float], lows: list[float], end: int) -> dict[str, Any] | None:
    """Indicators as of bar `end - 1`; None when there is not enough history."""
    if end < MIN_BARS:
        return None
    close = closes[end - 1]
    true_ranges = []
    for index in range(end - ATR_DAYS, end):
        previous_close = closes[index - 1]
        true_ranges.append(max(highs[index] - lows[index], abs(highs[index] - previous_close), abs(lows[index] - previous_close)))
    return {
        "close": close,
        "priorHigh": max(highs[end - 1 - BREAKOUT_DAYS:end - 1]),
        "priorLow": min(lows[end - 1 - EXIT_DAYS:end - 1]),
        "sma200": sum(closes[end - TREND_DAYS:end]) / TREND_DAYS,
        "atr": sum(true_ranges) / ATR_DAYS,
        "momentum": close / closes[end - 1 - MOMENTUM_DAYS] - 1,
    }


def analyze(bars: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Indicators for the latest bar of a daily history; None when invalid or too short."""
    try:
        closes = [float(bar["close"]) for bar in bars]
        highs = [float(bar.get("high") or bar["close"]) for bar in bars]
        lows = [float(bar.get("low") or bar["close"]) for bar in bars]
    except (KeyError, TypeError, ValueError, AttributeError):
        return None
    if not closes or any(not math.isfinite(value) or value <= 0 for value in closes + highs + lows):
        return None
    result = analyze_arrays(closes, highs, lows, len(closes))
    if result is not None:
        result["date"] = bars[-1].get("date")
    return result


def regime_is_on(analysis: dict[str, Any]) -> bool:
    return analysis["close"] > analysis["sma200"]


def entry_reason(analysis: dict[str, Any], regime_label: str) -> str | None:
    """The buy reason when every entry rule holds, otherwise None. The caller supplies a passing market regime."""
    if analysis["close"] <= analysis["priorHigh"] or analysis["close"] <= analysis["sma200"] or analysis["momentum"] <= 0:
        return None
    return (
        f"Breakout: close ${analysis['close']:,.2f} is above the {BREAKOUT_DAYS}-day high ${analysis['priorHigh']:,.2f} "
        f"and above its {TREND_DAYS}-day average ${analysis['sma200']:,.2f}; 6-month momentum {analysis['momentum']:+.1%}; {regime_label}."
    )


def exit_reason(analysis: dict[str, Any], entry_price: float, stop_price: float) -> str | None:
    """The sell reason when an exit rule fires, otherwise None."""
    close = analysis["close"]
    if close <= stop_price:
        return (
            f"Protective stop hit: close ${close:,.2f} is at or below the stop ${stop_price:,.2f} "
            f"({STOP_ATR:g} ATR under the ${entry_price:,.2f} entry)."
        )
    if close < analysis["priorLow"]:
        return f"Trend ended: close ${close:,.2f} is below the {EXIT_DAYS}-day low ${analysis['priorLow']:,.2f}."
    return None


def initial_stop(price: float, atr: float) -> float:
    return max(price - STOP_ATR * atr, price * 0.01)


def position_size(equity: float, cash: float, price: float, atr: float) -> dict[str, Any]:
    """Units to buy: the smallest of the risk budget, the per-position cap and the cash available."""
    stop_distance = STOP_ATR * atr
    risk_dollars = equity * RISK_PCT
    by_risk = risk_dollars / stop_distance if stop_distance > 0 else 0.0
    by_cap = equity * MAX_POSITION_PCT / price
    by_cash = cash / (price * (1 + FEE_RATE))
    quantity = min(by_risk, by_cap, by_cash)
    limit = "risk budget" if quantity == by_risk else "position cap" if quantity == by_cap else "available cash"
    return {"quantity": max(quantity, 0.0), "riskDollars": risk_dollars, "limitedBy": limit}

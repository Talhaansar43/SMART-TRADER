"""Read-only baseline strategy evaluation with strict data provenance checks."""

import json
import logging
import math
from datetime import date, datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

FAST_WINDOW = 20
SLOW_WINDOW = 50
STRATEGY_NAME = "sma_crossover"
STRATEGY_VERSION = "1.0.0"


def _finish_event(event: dict[str, Any]) -> dict[str, Any]:
    log_event = {key: value for key, value in event.items() if key != "priceHistory"}
    logger.info("Signal evaluation: %s", json.dumps(log_event, sort_keys=True))
    return event


def evaluate_sma_crossover(symbol: str, history: dict[str, Any]) -> dict[str, Any]:
    """Evaluate a long-only moving-average baseline; this function never places orders."""
    bars = history.get("data")
    bars = bars if isinstance(bars, list) else []
    event: dict[str, Any] = {
        "symbol": symbol,
        "strategy": STRATEGY_NAME,
        "strategyVersion": STRATEGY_VERSION,
        "status": "NOT_EVALUATED",
        "signal": None,
        "reason": None,
        "source": history.get("source"),
        "mock": history.get("mock"),
        "barsUsed": len(bars),
        "asOf": bars[-1].get("date") if bars and isinstance(bars[-1], dict) else None,
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        "fastWindow": FAST_WINDOW,
        "slowWindow": SLOW_WINDOW,
    }

    if history.get("source") != "finnhub" or history.get("mock") is not False:
        event["reason"] = "SOURCE_NOT_VERIFIED"
        return _finish_event(event)

    if len(bars) < SLOW_WINDOW + 1:
        event["reason"] = "INSUFFICIENT_HISTORY"
        return _finish_event(event)

    try:
        dates = [datetime.strptime(bar["date"], "%Y-%m-%d").date() for bar in bars]
        closes = [float(bar["close"]) for bar in bars]
    except (KeyError, TypeError, ValueError):
        event["reason"] = "INVALID_HISTORY_FORMAT"
        return _finish_event(event)

    if dates != sorted(set(dates)) or dates[-1] > date.today():
        event["reason"] = "INVALID_HISTORY_CHRONOLOGY"
        return _finish_event(event)

    if any(not math.isfinite(close) or close <= 0 for close in closes):
        event["reason"] = "INVALID_CLOSE_PRICE"
        return _finish_event(event)

    previous_fast = sum(closes[-FAST_WINDOW - 1:-1]) / FAST_WINDOW
    previous_slow = sum(closes[-SLOW_WINDOW - 1:-1]) / SLOW_WINDOW
    current_fast = sum(closes[-FAST_WINDOW:]) / FAST_WINDOW
    current_slow = sum(closes[-SLOW_WINDOW:]) / SLOW_WINDOW

    if previous_fast <= previous_slow and current_fast > current_slow:
        signal = "BUY"
        reason = "FAST_AVERAGE_CROSSED_ABOVE_SLOW_AVERAGE"
    elif previous_fast >= previous_slow and current_fast < current_slow:
        signal = "SELL"
        reason = "FAST_AVERAGE_CROSSED_BELOW_SLOW_AVERAGE"
    else:
        signal = "HOLD"
        reason = "NO_CROSSOVER"

    event.update({
        "status": "EVALUATED",
        "signal": signal,
        "reason": reason,
        "fastAverage": round(current_fast, 6),
        "slowAverage": round(current_slow, 6),
    })
    return _finish_event(event)


def analyze_stock_history(
    symbol: str,
    history: dict[str, Any],
    quote: dict[str, Any] | None = None,
    fundamentals: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Calculate descriptive technical metrics from verified daily candles."""
    bars = history.get("data")
    bars = bars if isinstance(bars, list) else []
    result: dict[str, Any] = {
        "symbol": symbol,
        "status": "NOT_EVALUATED",
        "reason": None,
        "source": history.get("source"),
        "mock": history.get("mock"),
        "barsUsed": len(bars),
        "asOf": bars[-1].get("date") if bars and isinstance(bars[-1], dict) else None,
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        "quote": quote if isinstance(quote, dict) else None,
        "company": fundamentals.get("profile") if isinstance(fundamentals, dict) else None,
        "fundamentals": fundamentals.get("metrics") if isinstance(fundamentals, dict) else None,
    }

    if history.get("source") != "finnhub" or history.get("mock") is not False:
        result["reason"] = "SOURCE_NOT_VERIFIED"
        return result
    if len(bars) < SLOW_WINDOW + 1:
        result["reason"] = "INSUFFICIENT_HISTORY"
        return result

    try:
        dates = [datetime.strptime(bar["date"], "%Y-%m-%d").date() for bar in bars]
        closes = [float(bar["close"]) for bar in bars]
        volumes = [float(bar["volume"]) for bar in bars]
        highs = [float(bar["high"]) for bar in bars]
        lows = [float(bar["low"]) for bar in bars]
    except (KeyError, TypeError, ValueError):
        result["reason"] = "INVALID_HISTORY_FORMAT"
        return result

    if dates != sorted(set(dates)) or dates[-1] > date.today():
        result["reason"] = "INVALID_HISTORY_CHRONOLOGY"
        return result
    if any(
        not math.isfinite(value) or value < 0
        for series in (closes, volumes, highs, lows)
        for value in series
    ) or any(value == 0 for value in closes + highs + lows):
        result["reason"] = "INVALID_HISTORY_VALUES"
        return result

    def average(values: list[float], window: int) -> float | None:
        if len(values) < window:
            return None
        return sum(values[-window:]) / window

    def ema(values: list[float], window: int) -> list[float]:
        multiplier = 2 / (window + 1)
        output = [values[0]]
        for value in values[1:]:
            output.append((value - output[-1]) * multiplier + output[-1])
        return output

    daily_returns = [
        closes[index] / closes[index - 1] - 1
        for index in range(1, len(closes))
    ]
    recent_returns = daily_returns[-252:]
    volatility = None
    if len(recent_returns) > 1:
        mean_return = sum(recent_returns) / len(recent_returns)
        variance = sum((value - mean_return) ** 2 for value in recent_returns) / (len(recent_returns) - 1)
        volatility = math.sqrt(variance * 252) * 100

    gains = [max(value, 0) for value in daily_returns]
    losses = [max(-value, 0) for value in daily_returns]
    rsi = None
    if len(daily_returns) >= 14:
        average_gain = sum(gains[:14]) / 14
        average_loss = sum(losses[:14]) / 14
        for index in range(14, len(daily_returns)):
            average_gain = (average_gain * 13 + gains[index]) / 14
            average_loss = (average_loss * 13 + losses[index]) / 14
        rsi = 100.0 if average_loss == 0 else 100 - 100 / (1 + average_gain / average_loss)

    fast_ema = ema(closes, 12)
    slow_ema = ema(closes, 26)
    macd_values = [fast - slow for fast, slow in zip(fast_ema, slow_ema)]
    macd_signal_values = ema(macd_values, 9)
    macd_line = macd_values[-1]
    macd_signal = macd_signal_values[-1]

    moving_averages = {
        str(window): average(closes, window)
        for window in (20, 50, 200)
    }
    current_price = closes[-1]
    previous_fast = average(closes[:-1], FAST_WINDOW)
    previous_slow = average(closes[:-1], SLOW_WINDOW)
    current_fast = moving_averages[str(FAST_WINDOW)]
    current_slow = moving_averages[str(SLOW_WINDOW)]
    if previous_fast is not None and previous_slow is not None and previous_fast <= previous_slow and current_fast > current_slow:
        crossover = "BULLISH_CROSSOVER"
    elif previous_fast is not None and previous_slow is not None and previous_fast >= previous_slow and current_fast < current_slow:
        crossover = "BEARISH_CROSSOVER"
    else:
        crossover = "NO_CROSSOVER"

    if current_price > current_slow and current_fast > current_slow:
        bias = "BULLISH"
    elif current_price < current_slow and current_fast < current_slow:
        bias = "BEARISH"
    else:
        bias = "MIXED"

    periods = {"1W": 5, "1M": 21, "3M": 63, "6M": 126, "1Y": 252}
    performance = {
        label: round((current_price / closes[-bars_ago - 1] - 1) * 100, 2)
        if len(closes) > bars_ago else None
        for label, bars_ago in periods.items()
    }
    peak = closes[0]
    max_drawdown = 0.0
    for close in closes:
        peak = max(peak, close)
        max_drawdown = min(max_drawdown, (close / peak - 1) * 100)

    average_volume = average(volumes, 20)
    chart_history = []
    for index, bar in enumerate(bars):
        chart_row = {"date": bar["date"], "close": closes[index]}
        for window in (20, 50, 200):
            chart_row[f"sma{window}"] = average(closes[:index + 1], window)
        chart_history.append(chart_row)

    result.update({
        "status": "EVALUATED",
        "price": round(current_price, 4),
        "performancePct": performance,
        "trend": {
            "bias": bias,
            "movingAverages": {
                key: round(value, 4) if value is not None else None
                for key, value in moving_averages.items()
            },
            "priceVsSma20Pct": round((current_price / moving_averages["20"] - 1) * 100, 2),
            "priceVsSma50Pct": round((current_price / moving_averages["50"] - 1) * 100, 2),
            "priceVsSma200Pct": round((current_price / moving_averages["200"] - 1) * 100, 2)
            if moving_averages["200"] is not None else None,
            "crossover": crossover,
        },
        "momentum": {
            "rsi14": round(rsi, 2) if rsi is not None else None,
            "rsiState": "OVERBOUGHT" if rsi is not None and rsi >= 70
            else "OVERSOLD" if rsi is not None and rsi <= 30
            else "NEUTRAL" if rsi is not None else None,
            "macd": round(macd_line, 4),
            "macdSignal": round(macd_signal, 4),
            "macdHistogram": round(macd_line - macd_signal, 4),
        },
        "risk": {
            "annualizedVolatilityPct": round(volatility, 2) if volatility is not None else None,
            "maxDrawdownPct": round(max_drawdown, 2),
            "high52Week": round(max(highs[-252:]), 4),
            "low52Week": round(min(lows[-252:]), 4),
            "averageVolume20": round(average_volume) if average_volume is not None else None,
            "latestVolume": round(volumes[-1]),
            "volumeVsAverage20Pct": round((volumes[-1] / average_volume - 1) * 100, 2)
            if average_volume else None,
        },
        "priceHistory": chart_history[-252:],
    })
    return _finish_event(result)
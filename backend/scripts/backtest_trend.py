"""Backtest of the trend-breakout strategy on S&P 500 stocks and major crypto, starting from a small account.

Run from backend/:  .\venv\Scripts\python.exe scripts\backtest_trend.py [--days 2900] [--cash 1000] [--max-positions 6]
Signals use a day's close; orders fill at the next bar's open with the same fee as the live bot.
"""

import argparse
import csv
import io
import json
import math
import pickle
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.services import trend_strategy as ts  # noqa: E402
from app.services.market_service import get_stock_history  # noqa: E402
from app.services.universe import REGIME_SYMBOLS, SP500_CSV_URL, build_universe, load_sp500_symbols  # noqa: E402

DATA_DIR = BACKEND / "data"
MIN_ORDER = 5.0


def fetch(symbol: str, days: int):
    history = get_stock_history(symbol, days=days, allow_mock=False, use_finnhub=False)
    if history.get("mock") is not False or history.get("source") != "yahoo_finance":
        return symbol, None
    bars = history.get("data") or []
    return symbol, [(b["date"], b["open"], b["high"], b["low"], b["close"]) for b in bars]


def load_data(universe, days: int, refresh: bool):
    cache = DATA_DIR / f"backtest_history_{days}.pkl"
    if cache.exists() and not refresh and time.time() - cache.stat().st_mtime < 86400:
        return pickle.loads(cache.read_bytes())
    data = {}
    started = time.time()
    with ThreadPoolExecutor(max_workers=8) as pool:
        for done, (symbol, bars) in enumerate(pool.map(lambda item: fetch(item[0], days), universe), 1):
            if bars:
                data[symbol] = bars
            if done % 50 == 0:
                print(f"  fetched {done}/{len(universe)} symbols ({time.time() - started:.0f}s)", flush=True)
    DATA_DIR.mkdir(exist_ok=True)
    cache.write_bytes(pickle.dumps(data))
    return data


def run(data, kinds, cash0: float, max_positions: int):
    symbols = sorted(data)
    arrays = {
        s: {
            "dates": [b[0] for b in data[s]], "open": [b[1] for b in data[s]], "high": [b[2] for b in data[s]],
            "low": [b[3] for b in data[s]], "close": [b[4] for b in data[s]],
        }
        for s in symbols
    }
    all_dates = sorted({d for s in symbols for d in arrays[s]["dates"]})
    ptr = {s: 0 for s in symbols}
    cash = cash0
    positions, pending_sells, pending_buys = {}, {}, []
    regime = {"STOCK": None, "CRYPTO": None}
    curve, trades, exposure = [], [], []
    fee = ts.FEE_RATE
    started_at = None

    for d in all_dates:
        today = {}
        for s in symbols:
            dates = arrays[s]["dates"]
            i = ptr[s]
            while i < len(dates) and dates[i] <= d:
                i += 1
            ptr[s] = i
            if i > 0 and dates[i - 1] == d:
                today[s] = i - 1

        for s in list(pending_sells):
            if s in today and s in positions:
                price = arrays[s]["open"][today[s]]
                pos = positions.pop(s)
                proceeds = pos["qty"] * price * (1 - fee)
                cash += proceeds
                trades.append({"symbol": s, "pnl": proceeds - pos["cost"], "pct": proceeds / pos["cost"] - 1,
                               "entry": pos["date"], "exit": d, "reason": pending_sells[s]})
                del pending_sells[s]
        remaining = []
        for order in pending_buys:
            s = order["symbol"]
            if s in today and s not in positions:
                price = arrays[s]["open"][today[s]]
                qty = order["qty"]
                cost = qty * price * (1 + fee)
                if cost > cash:
                    qty = cash / (price * (1 + fee))
                    cost = qty * price * (1 + fee)
                if qty * price >= MIN_ORDER:
                    cash -= cost
                    positions[s] = {"qty": qty, "entry": price, "stop": ts.initial_stop(price, order["atr"]), "cost": cost, "date": d}
                continue
            order["age"] += 1
            if order["age"] <= 4:
                remaining.append(order)
        pending_buys = remaining

        value = sum(p["qty"] * arrays[s]["close"][ptr[s] - 1] for s, p in positions.items())
        equity = cash + value
        if started_at is not None:
            curve.append((d, equity))
            exposure.append(value / equity if equity else 0)

        for s in list(positions):
            if s in today and s not in pending_sells:
                a = arrays[s]
                an = ts.analyze_arrays(a["close"], a["high"], a["low"], today[s] + 1)
                reason = an and ts.exit_reason(an, positions[s]["entry"], positions[s]["stop"])
                if reason:
                    pending_sells[s] = reason

        for kind, benchmark in REGIME_SYMBOLS.items():
            if benchmark in today:
                a = arrays[benchmark]
                an = ts.analyze_arrays(a["close"], a["high"], a["low"], today[benchmark] + 1)
                if an:
                    regime[kind] = ts.regime_is_on(an)
                    if started_at is None:
                        started_at = d
                        curve.append((d, equity))
                        exposure.append(0.0)

        slots = max_positions - len(positions) - len(pending_buys)
        if slots > 0 and any(regime.values()):
            busy = set(positions) | {o["symbol"] for o in pending_buys}
            candidates = []
            for s in symbols:
                if s in busy or s not in today or not regime[kinds[s]]:
                    continue
                a = arrays[s]
                an = ts.analyze_arrays(a["close"], a["high"], a["low"], today[s] + 1)
                if an and ts.entry_reason(an, "regime on"):
                    candidates.append((an["momentum"], s, an))
            candidates.sort(reverse=True)
            reserved = sum(o["qty"] * o["price"] * (1 + fee) for o in pending_buys)
            for _, s, an in candidates[:slots]:
                size = ts.position_size(equity, cash - reserved, an["close"], an["atr"])
                if size["quantity"] * an["close"] >= MIN_ORDER:
                    pending_buys.append({"symbol": s, "qty": size["quantity"], "price": an["close"], "atr": an["atr"], "age": 0})
                    reserved += size["quantity"] * an["close"] * (1 + fee)

    return curve, trades, exposure, started_at


def benchmark(data, symbol, start, end):
    bars = [b for b in data.get(symbol, []) if start <= b[0] <= end]
    return (bars[-1][4] / bars[0][4] - 1) if len(bars) > 1 else None


def summarize(curve, trades, exposure, cash0):
    values = [v for _, v in curve]
    days = max((len(curve) - 1), 1)
    final = values[-1]
    peak, max_dd = values[0], 0.0
    for v in values:
        peak = max(peak, v)
        max_dd = min(max_dd, v / peak - 1)
    rets = [values[i] / values[i - 1] - 1 for i in range(1, len(values))]
    mean = sum(rets) / len(rets)
    std = math.sqrt(sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)) if len(rets) > 1 else 0
    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] <= 0]
    years = {}
    for d, v in curve:
        years.setdefault(d[:4], [v, v])[1] = v
    prev = cash0
    yearly = {}
    for year, (_, last) in sorted(years.items()):
        first_of_year = [v for d, v in curve if d[:4] == year][0]
        yearly[year] = last / (prev if prev else first_of_year) - 1
        prev = last
    return {
        "start": curve[0][0], "end": curve[-1][0], "days": days, "final": final, "totalReturn": final / cash0 - 1,
        "cagr": (final / cash0) ** (365.25 / days) - 1 if final > 0 else -1, "maxDrawdown": max_dd,
        "sharpe": mean / std * math.sqrt(365) if std else 0, "trades": len(trades), "winRate": len(wins) / len(trades) if trades else 0,
        "avgWin": sum(t["pct"] for t in wins) / len(wins) if wins else 0, "avgLoss": sum(t["pct"] for t in losses) / len(losses) if losses else 0,
        "profitFactor": sum(t["pnl"] for t in wins) / abs(sum(t["pnl"] for t in losses)) if losses and sum(t["pnl"] for t in losses) else None,
        "avgExposure": sum(exposure) / len(exposure), "yearly": yearly,
    }


def sp500_added_dates() -> dict[str, str]:
    rows = csv.DictReader(io.StringIO(requests.get(SP500_CSV_URL, timeout=15).text))
    return {row["Symbol"].strip().upper().replace(".", "-"): row.get("Date added") or "" for row in rows}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=2900)
    parser.add_argument("--cash", type=float, default=1000.0)
    parser.add_argument("--max-positions", type=int, default=6)
    parser.add_argument("--no-stocks", action="store_true")
    parser.add_argument("--no-crypto", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--added-before", help="Only stocks added to the S&P 500 before this date (YYYY-MM-DD), so later additions that were already winners are excluded")
    args = parser.parse_args()

    full_universe = build_universe(load_sp500_symbols(), True, True)
    print(f"Universe: {len(full_universe)} symbols; loading {args.days} days of history...", flush=True)
    data = load_data(full_universe, args.days, args.refresh)

    added = sp500_added_dates() if args.added_before else {}
    kinds = {}
    for symbol, kind in full_universe:
        if kind == "CRYPTO" and not args.no_crypto:
            kinds[symbol] = kind
        elif kind == "STOCK" and not args.no_stocks:
            if symbol == "SPY" or not args.added_before or (added.get(symbol) or "9999") < args.added_before:
                kinds[symbol] = kind
    data = {symbol: bars for symbol, bars in data.items() if symbol in kinds}
    print(f"Simulating {len(data)} symbols...", flush=True)

    curve, trades, exposure, started = run(data, kinds, args.cash, args.max_positions)
    result = summarize(curve, trades, exposure, args.cash)
    spy = benchmark(data, "SPY", result["start"], result["end"])
    btc = benchmark(data, "BTC-USD", result["start"], result["end"])
    result["benchmarks"] = {"SPY buy and hold": spy, "BTC buy and hold": btc}
    result["bySymbol"] = sorted(
        ({"symbol": s, "pnl": sum(t["pnl"] for t in trades if t["symbol"] == s), "trades": sum(1 for t in trades if t["symbol"] == s)} for s in {t["symbol"] for t in trades}),
        key=lambda item: item["pnl"], reverse=True,
    )

    print(f"\nWindow {result['start']} to {result['end']} ({result['days']} days), start ${args.cash:,.0f}, max {args.max_positions} positions")
    print(f"Final equity       ${result['final']:,.2f}  ({result['totalReturn']:+.1%} total, {result['cagr']:+.1%} per year)")
    print(f"Max drawdown       {result['maxDrawdown']:.1%}     Sharpe {result['sharpe']:.2f}     Avg exposure {result['avgExposure']:.0%}")
    print(f"Closed trades      {result['trades']}  win rate {result['winRate']:.0%}  avg win {result['avgWin']:+.1%}  avg loss {result['avgLoss']:+.1%}  profit factor {result['profitFactor'] and round(result['profitFactor'], 2)}")
    for name, value in result["benchmarks"].items():
        print(f"{name:<18} {value:+.1%}" if value is not None else f"{name:<18} n/a")
    print("By year: " + "  ".join(f"{year} {ret:+.1%}" for year, ret in result["yearly"].items()))
    top = result["bySymbol"]
    print("Best symbols : " + ", ".join(f"{i['symbol']} ${i['pnl']:+.0f}" for i in top[:5]))
    print("Worst symbols: " + ", ".join(f"{i['symbol']} ${i['pnl']:+.0f}" for i in top[-5:]))
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "backtest_result.json").write_text(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

"""In-memory paper trading that scans S&P 500 stocks and major crypto with the SMA crossover baseline."""

import asyncio
import copy
import csv
import io
import logging
import math
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from decimal import ROUND_DOWN, Decimal
from typing import Any

import requests

from app.services.market_service import get_stock_history
from app.services.strategy_service import FAST_WINDOW, SLOW_WINDOW, evaluate_sma_crossover

logger = logging.getLogger(__name__)

MAX_EVENTS = 150
BATCH_SIZE = 8
HISTORY_DAYS = 150
SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
CRYPTO_SYMBOLS = [
    "BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD", "ADA-USD", "DOGE-USD", "TRX-USD", "AVAX-USD",
    "LINK-USD", "DOT-USD", "LTC-USD", "BCH-USD", "XLM-USD", "ATOM-USD", "ETC-USD", "XMR-USD", "NEAR-USD",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _money(value: Decimal) -> str:
    return f"${value:,.2f}" if abs(value) >= 1 else f"${value:,.6f}"


def _load_sp500_symbols() -> list[str]:
    response = requests.get(SP500_CSV_URL, timeout=15)
    response.raise_for_status()
    symbols = []
    for row in csv.DictReader(io.StringIO(response.text)):
        # Yahoo uses dashes for share classes, e.g. BRK-B.
        symbol = (row.get("Symbol") or "").strip().upper().replace(".", "-")
        if re.fullmatch(r"[A-Z0-9-]{1,10}", symbol):
            symbols.append(symbol)
    return symbols


def _scan_symbol(symbol: str) -> dict[str, Any]:
    try:
        history = get_stock_history(symbol, days=HISTORY_DAYS, allow_mock=False, use_finnhub=False)
        signal = evaluate_sma_crossover(symbol, history)
        bars = history.get("data")
        last_bar = bars[-1] if isinstance(bars, list) and bars else None
        price = last_bar.get("close") if isinstance(last_bar, dict) else None
        return {"symbol": symbol, "signal": signal, "price": price}
    except Exception:
        logger.debug("Paper bot scan failed for %s", symbol, exc_info=True)
        return {"symbol": symbol, "signal": {"status": "NOT_EVALUATED", "reason": "FETCH_FAILED"}, "price": None}


class PaperTradingBot:
    def __init__(self) -> None:
        self._running = False
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._interval_seconds = 10
        self._position_size = Decimal("0")
        self._max_positions = 0
        self._starting_cash = Decimal("0")
        self._cash = Decimal("0")
        self._realized_pnl = Decimal("0")
        self._positions: dict[str, dict[str, Any]] = {}
        self._universe: list[tuple[str, str]] = []
        self._states: dict[str, dict[str, Any]] = {}
        self._acted: dict[str, str] = {}
        self._cursor = 0
        self._pass = 1
        self._pass_trades_start = 0
        self._current_batch: list[str] = []
        self._last_error: str | None = None
        self._trades: list[dict[str, Any]] = []
        self._events: list[dict[str, str]] = []
        self._checks = 0
        self._checking = False
        self._started_at: str | None = None
        self._last_checked_at: str | None = None
        self._next_check_at: str | None = None

    def _log(self, level: str, message: str) -> None:
        self._events.append({"time": _now(), "level": level, "message": message})
        del self._events[:-MAX_EVENTS]

    def start(
        self,
        position_size: Decimal,
        max_positions: int,
        starting_cash: Decimal,
        interval_seconds: int,
        include_stocks: bool,
        include_crypto: bool,
    ) -> None:
        if self._running:
            raise RuntimeError("The paper trading bot is already running")
        if not (include_stocks or include_crypto):
            raise ValueError("Select at least one market to scan")
        if position_size > starting_cash:
            raise ValueError("Position size cannot exceed the starting paper cash")

        self._interval_seconds = interval_seconds
        self._position_size = position_size
        self._max_positions = max_positions
        self._starting_cash = starting_cash
        self._cash = starting_cash
        self._realized_pnl = Decimal("0")
        self._positions = {}
        self._universe = []
        self._states = {}
        self._acted = {}
        self._cursor = 0
        self._pass = 1
        self._pass_trades_start = 0
        self._current_batch = []
        self._last_error = None
        self._trades = []
        self._events = []
        self._checks = 0
        self._checking = False
        self._started_at = _now()
        self._last_checked_at = None
        self._next_check_at = None
        self._running = True
        self._log(
            "info",
            f"Started: {_money(position_size)} per position, up to {max_positions} open positions, "
            f"{_money(starting_cash)} paper cash, one batch every {interval_seconds} s.",
        )
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run(include_stocks, include_crypto))

    def stop(self) -> None:
        if self._running:
            self._log("info", "Stopped. Open simulated positions are kept.")
        self._running = False
        self._next_check_at = None
        if self._stop_event:
            self._stop_event.set()

    def status(self) -> dict[str, Any]:
        positions = []
        market_value = Decimal("0")
        unrealized = Decimal("0")
        for symbol, position in sorted(self._positions.items()):
            value = position["quantity"] * position["price"]
            pnl = (position["price"] - position["entry"]) * position["quantity"]
            market_value += value
            unrealized += pnl
            positions.append({
                "symbol": symbol,
                "assetType": position["assetType"],
                "quantity": float(position["quantity"]),
                "averageEntryPrice": float(position["entry"]),
                "lastPrice": float(position["price"]),
                "marketValue": float(value),
                "unrealizedPnl": float(pnl),
            })
        readable = [state for state in self._states.values() if state["status"] == "OK"]
        return copy.deepcopy({
            "running": self._running,
            "mode": "PAPER",
            "strategy": "sma_crossover",
            "strategyInfo": {
                "name": f"SMA {FAST_WINDOW}/{SLOW_WINDOW} crossover (long only)",
                "fastWindow": FAST_WINDOW,
                "slowWindow": SLOW_WINDOW,
                "rules": [
                    f"BUY a symbol when its {FAST_WINDOW}-day average crosses above its {SLOW_WINDOW}-day average, if it is not held and a position slot and cash are free.",
                    f"SELL the whole position when the {FAST_WINDOW}-day average crosses below the {SLOW_WINDOW}-day average.",
                    f"Every tick scans the next {BATCH_SIZE} symbols; the full universe is covered over many ticks because data providers limit request rates.",
                ],
            },
            "checking": self._checking,
            "checks": self._checks,
            "startedAt": self._started_at,
            "lastCheckedAt": self._last_checked_at,
            "nextCheckAt": self._next_check_at,
            "intervalSeconds": self._interval_seconds,
            "universe": {
                "total": len(self._universe),
                "stocks": sum(1 for _, kind in self._universe if kind == "STOCK"),
                "crypto": sum(1 for _, kind in self._universe if kind == "CRYPTO"),
                "pass": self._pass,
                "scannedThisPass": min(self._cursor, len(self._universe)),
                "batchSize": BATCH_SIZE,
                "currentBatch": self._current_batch,
                "uptrend": sum(1 for state in readable if state["trend"] == "UPTREND"),
                "downtrend": sum(1 for state in readable if state["trend"] == "DOWNTREND"),
                "unavailable": sum(1 for state in self._states.values() if state["status"] != "OK"),
            },
            "positionSize": float(self._position_size),
            "maxPositions": self._max_positions,
            "startingCash": float(self._starting_cash),
            "cash": float(self._cash),
            "equity": float(self._cash + market_value),
            "realizedPnl": float(self._realized_pnl),
            "unrealizedPnl": float(unrealized),
            "positions": positions,
            "events": self._events[-MAX_EVENTS:],
            "lastError": self._last_error,
            "trades": self._trades[-50:],
        })

    async def _run(self, include_stocks: bool, include_crypto: bool) -> None:
        stop_event = self._stop_event
        if stop_event is None:
            return

        def active() -> bool:
            # A newer start() replaces the stop event, which retires this loop.
            return self._running and self._stop_event is stop_event

        if not await self._prepare_universe(include_stocks, include_crypto, active):
            if active():
                self._running = False
            return

        while active():
            self._checking = True
            self._next_check_at = None
            try:
                batch = self._next_batch()
                results = await asyncio.to_thread(self._scan_batch, batch)
                if not active():
                    break
                for result in results:
                    self._process_result(result)
                self._finish_pass_if_complete()
            except Exception:
                logger.exception("Paper trading scan failed")
                self._last_error = "A scan could not be completed; no order was placed for that batch"
                self._log("warn", self._last_error)
            finally:
                if active():
                    self._checking = False
                    self._checks += 1
                    self._last_checked_at = _now()

            if not active():
                break
            self._next_check_at = (datetime.now(timezone.utc) + timedelta(seconds=self._interval_seconds)).isoformat()
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=self._interval_seconds)
            except asyncio.TimeoutError:
                continue
            break

    async def _prepare_universe(self, include_stocks: bool, include_crypto: bool, active: Any) -> bool:
        universe: list[tuple[str, str]] = []
        if include_crypto:
            universe.extend((symbol, "CRYPTO") for symbol in CRYPTO_SYMBOLS)
        if include_stocks:
            self._log("info", "Loading the S&P 500 constituent list...")
            try:
                stocks = await asyncio.to_thread(_load_sp500_symbols)
                universe.extend((symbol, "STOCK") for symbol in stocks)
            except Exception:
                logger.exception("Could not load the S&P 500 constituent list")
                self._log("warn", "Could not load the S&P 500 list; continuing without stocks.")
        if not active():
            return False
        if not universe:
            self._last_error = "No symbols to scan; the bot stopped"
            self._log("warn", self._last_error)
            return False

        self._universe = universe
        passes = math.ceil(len(universe) / BATCH_SIZE)
        self._log(
            "info",
            f"Universe ready: {sum(1 for _, kind in universe if kind == 'STOCK')} stocks and "
            f"{sum(1 for _, kind in universe if kind == 'CRYPTO')} crypto pairs. A full pass takes "
            f"{passes} ticks (at least {passes * self._interval_seconds // 60} min).",
        )
        return True

    def _next_batch(self) -> list[str]:
        self._finish_pass_if_complete()
        batch = [symbol for symbol, _ in self._universe[self._cursor:self._cursor + BATCH_SIZE]]
        self._cursor += len(batch)
        self._current_batch = batch
        return batch

    def _scan_batch(self, batch: list[str]) -> list[dict[str, Any]]:
        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as pool:
            return list(pool.map(_scan_symbol, batch))

    def _finish_pass_if_complete(self) -> None:
        if not self._universe or self._cursor < len(self._universe):
            return
        readable = [state for state in self._states.values() if state["status"] == "OK"]
        self._log(
            "info",
            f"Pass {self._pass} complete: {len(readable)} symbols read, "
            f"{len(self._states) - len(readable)} unavailable, "
            f"{sum(1 for state in readable if state['trend'] == 'UPTREND')} in uptrend, "
            f"{len(self._trades) - self._pass_trades_start} trade(s) this pass, "
            f"{len(self._positions)} open position(s).",
        )
        self._pass += 1
        self._cursor = 0
        self._pass_trades_start = len(self._trades)

    def _asset_type(self, symbol: str) -> str:
        return next((kind for item, kind in self._universe if item == symbol), "STOCK")

    def _process_result(self, result: dict[str, Any]) -> None:
        symbol = result["symbol"]
        signal = result["signal"]
        if signal.get("status") != "EVALUATED" or result["price"] is None:
            self._states[symbol] = {"status": "UNAVAILABLE", "reason": signal.get("reason")}
            return

        try:
            price = Decimal(str(result["price"]))
        except ArithmeticError:
            self._states[symbol] = {"status": "UNAVAILABLE", "reason": "INVALID_PRICE"}
            return
        if price <= 0:
            self._states[symbol] = {"status": "UNAVAILABLE", "reason": "INVALID_PRICE"}
            return

        fast, slow = signal["fastAverage"], signal["slowAverage"]
        signal_date = signal.get("asOf")
        action = signal.get("signal")
        self._states[symbol] = {"status": "OK", "trend": "UPTREND" if fast > slow else "DOWNTREND"}
        position = self._positions.get(symbol)
        if position:
            position["price"] = price
        # One action per symbol per bar date avoids churn on a partial daily bar.
        if not isinstance(signal_date, str) or self._acted.get(symbol) == signal_date:
            return

        detail = f"SMA{FAST_WINDOW} {fast:,.2f} vs SMA{SLOW_WINDOW} {slow:,.2f}, bar {signal_date}"
        if action == "BUY" and position is None:
            self._acted[symbol] = signal_date
            if len(self._positions) >= self._max_positions:
                self._log("warn", f"BUY signal on {symbol} skipped: already at the {self._max_positions} position limit ({detail}).")
                return
            quantity = (self._position_size / price).quantize(Decimal("0.000001"), rounding=ROUND_DOWN)
            cost = quantity * price
            if quantity <= 0 or cost > self._cash:
                self._log("warn", f"BUY signal on {symbol} skipped: not enough paper cash ({detail}).")
                return
            self._cash -= cost
            self._positions[symbol] = {"assetType": self._asset_type(symbol), "quantity": quantity, "entry": price, "price": price}
            self._record_trade(symbol, "BUY", quantity, price, signal_date, None)
            self._log("trade", f"BUY {symbol}: fast average crossed above slow average ({detail}). Bought {quantity} at {_money(price)} for {_money(cost)}.")
        elif action == "SELL" and position is not None:
            self._acted[symbol] = signal_date
            quantity = position["quantity"]
            realized = (price - position["entry"]) * quantity
            self._cash += price * quantity
            self._realized_pnl += realized
            del self._positions[symbol]
            self._record_trade(symbol, "SELL", quantity, price, signal_date, realized)
            self._log("trade", f"SELL {symbol}: fast average crossed below slow average ({detail}). Sold {quantity} at {_money(price)}, P&L {_money(realized)}.")

    def _record_trade(
        self,
        symbol: str,
        side: str,
        quantity: Decimal,
        price: Decimal,
        signal_date: str,
        realized_pnl: Decimal | None,
    ) -> None:
        self._trades.append({
            "id": f"paper-{len(self._trades) + 1}",
            "symbol": symbol,
            "assetType": self._asset_type(symbol),
            "side": side,
            "quantity": float(quantity),
            "price": float(price),
            "total": float(price * quantity),
            "realizedPnl": float(realized_pnl) if realized_pnl is not None else None,
            "signalDate": signal_date,
            "createdAt": _now(),
        })


paper_trading_bot = PaperTradingBot()

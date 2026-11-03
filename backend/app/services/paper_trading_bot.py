"""Persistent paper-trading bot running the trend-breakout strategy over S&P 500 stocks and major crypto."""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from decimal import ROUND_DOWN, Decimal
from typing import Any

from app.services import trend_strategy as strategy
from app.services.bot_store import BotStore
from app.services.market_service import get_stock_history
from app.services.universe import REGIME_SYMBOLS, build_universe, load_sp500_symbols

logger = logging.getLogger(__name__)

BATCH_SIZE = 8
HISTORY_DAYS = 420
MAX_EVENTS = 200
STATUS_TRADE_LIMIT = 200
MAX_STALE_DAYS = 7
FEE_RATE = Decimal(str(strategy.FEE_RATE))
MIN_ORDER_VALUE = Decimal("5")
UNIT = Decimal("0.000001")
VERIFIED_SOURCES = {"finnhub", "yahoo_finance"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _money(value: Decimal) -> str:
    return f"${value:,.2f}" if abs(value) >= 1 else f"${value:,.6f}"


def _scan_symbol(symbol: str) -> dict[str, Any]:
    try:
        history = get_stock_history(symbol, days=HISTORY_DAYS, allow_mock=False, use_finnhub=False)
        bars = history.get("data")
        if history.get("mock") is not False or history.get("source") not in VERIFIED_SOURCES or not isinstance(bars, list):
            return {"symbol": symbol, "analysis": None, "error": "SOURCE_NOT_VERIFIED"}
        analysis = strategy.analyze(bars)
        if analysis is None:
            return {"symbol": symbol, "analysis": None, "error": "INSUFFICIENT_OR_INVALID_HISTORY"}
        age = (datetime.now(timezone.utc).date() - datetime.strptime(analysis["date"], "%Y-%m-%d").date()).days
        if age > MAX_STALE_DAYS:
            return {"symbol": symbol, "analysis": None, "error": "STALE_DATA"}
        return {"symbol": symbol, "analysis": analysis, "error": None}
    except Exception:
        logger.debug("Paper bot scan failed for %s", symbol, exc_info=True)
        return {"symbol": symbol, "analysis": None, "error": "FETCH_FAILED"}


class PaperTradingBot:
    def __init__(self, store: BotStore | None = None) -> None:
        self._store_obj = store
        self._running = False
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._run_id: int | None = None
        self._started_at: str | None = None
        self._saved_universe_size = 0
        self._reset_run_state()

    @property
    def _store(self) -> BotStore:
        if self._store_obj is None:
            self._store_obj = BotStore()
        return self._store_obj

    def _reset_run_state(self) -> None:
        self._config: dict[str, Any] = {}
        self._interval_seconds = 10
        self._max_positions = 0
        self._starting_cash = Decimal("0")
        self._cash = Decimal("0")
        self._realized_pnl = Decimal("0")
        self._positions: dict[str, dict[str, Any]] = {}
        self._universe: list[tuple[str, str]] = []
        self._states: dict[str, dict[str, Any]] = {}
        self._regime: dict[str, dict[str, Any]] = {}
        self._candidates: dict[str, dict[str, Any]] = {}
        self._acted: dict[str, str] = {}
        self._cursor = 0
        self._pass = 1
        self._pass_buys = 0
        self._pass_sells = 0
        self._current_batch: list[str] = []
        self._last_error: str | None = None
        self._checks = 0
        self._checking = False
        self._last_checked_at: str | None = None
        self._next_check_at: str | None = None

    # ---- persistence -------------------------------------------------------------------------

    def _state_dict(self) -> dict[str, Any]:
        return {
            "cash": str(self._cash),
            "realizedPnl": str(self._realized_pnl),
            "cursor": self._cursor,
            "pass": self._pass,
            "checks": self._checks,
            "universeSize": len(self._universe),
            "regime": self._regime,
            "acted": self._acted,
            "positions": {
                symbol: {
                    "assetType": position["assetType"],
                    "quantity": str(position["quantity"]),
                    "entry": str(position["entry"]),
                    "price": str(position["price"]),
                    "stop": str(position["stop"]),
                    "costBasis": str(position["costBasis"]),
                    "entryDate": position["entryDate"],
                    "reason": position["reason"],
                }
                for symbol, position in self._positions.items()
            },
        }

    def _load_state(self, state: dict[str, Any]) -> None:
        self._cash = Decimal(str(state.get("cash", self._starting_cash)))
        self._realized_pnl = Decimal(str(state.get("realizedPnl", "0")))
        self._cursor = int(state.get("cursor", 0))
        self._pass = int(state.get("pass", 1))
        self._checks = int(state.get("checks", 0))
        self._saved_universe_size = int(state.get("universeSize", 0))
        self._regime = state.get("regime", {})
        self._acted = state.get("acted", {})
        self._positions = {
            symbol: {
                "assetType": position["assetType"],
                "quantity": Decimal(str(position["quantity"])),
                "entry": Decimal(str(position["entry"])),
                "price": Decimal(str(position["price"])),
                "stop": Decimal(str(position["stop"])),
                "costBasis": Decimal(str(position["costBasis"])),
                "entryDate": position["entryDate"],
                "reason": position["reason"],
            }
            for symbol, position in state.get("positions", {}).items()
        }

    def _save_state(self, status: str | None = None) -> None:
        if self._run_id is None:
            return
        try:
            self._store.save_state(self._run_id, self._state_dict(), _now(), status)
        except Exception:
            logger.exception("Could not save the paper bot state")
            self._last_error = "The bot state could not be saved to disk; check the backend log"

    def _log(self, level: str, message: str) -> None:
        if self._run_id is None:
            return
        try:
            self._store.add_event(self._run_id, _now(), level, message)
        except Exception:
            logger.exception("Could not save a paper bot event")

    def _commit_trade(self, trade: dict[str, Any]) -> None:
        try:
            self._store.record_trade(self._run_id, trade, self._state_dict(), _now())
        except Exception:
            logger.exception("Could not save a paper bot trade")
            self._last_error = "A trade could not be saved to disk; check the backend log"

    # ---- lifecycle ---------------------------------------------------------------------------

    def start(
        self,
        starting_cash: Decimal,
        max_positions: int,
        interval_seconds: int,
        include_stocks: bool,
        include_crypto: bool,
    ) -> None:
        if self._running:
            raise RuntimeError("The paper trading bot is already running")
        if not (include_stocks or include_crypto):
            raise ValueError("Select at least one market to scan")

        self._reset_run_state()
        self._config = {
            "includeStocks": include_stocks,
            "includeCrypto": include_crypto,
            "maxPositions": max_positions,
            "intervalSeconds": interval_seconds,
            "startingCash": str(starting_cash),
        }
        self._interval_seconds = interval_seconds
        self._max_positions = max_positions
        self._starting_cash = starting_cash
        self._cash = starting_cash
        self._saved_universe_size = 0
        self._started_at = _now()
        self._run_id = self._store.create_run(self._config, self._state_dict(), self._started_at)
        self._running = True
        self._log(
            "info",
            f"Started run #{self._run_id} with {_money(starting_cash)} of paper cash, up to {max_positions} positions, "
            f"one batch every {interval_seconds} s. Strategy: {strategy.STRATEGY_NAME}.",
        )
        self._launch()

    def stop(self) -> None:
        if self._running:
            self._running = False
            self._next_check_at = None
            self._log("info", "Stopped. Open simulated positions are kept and saved.")
            self._save_state(status="stopped")
        if self._stop_event:
            self._stop_event.set()

    def restore(self) -> None:
        """Load the saved account at app start and resume the run if it was still running."""
        try:
            run = self._store.latest_run()
        except Exception:
            logger.exception("Could not read the saved paper bot history")
            return
        if run is None:
            return

        self._reset_run_state()
        self._run_id = run["id"]
        self._started_at = run["startedAt"]
        self._config = run["config"]
        self._interval_seconds = int(self._config.get("intervalSeconds", 10))
        self._max_positions = int(self._config.get("maxPositions", 6))
        self._starting_cash = Decimal(str(self._config.get("startingCash", "0")))
        self._load_state(run["state"])
        if run["status"] == "running":
            self._running = True
            self._log(
                "info",
                f"Resumed run #{self._run_id} after an application restart: restored {_money(self._cash)} cash, "
                f"{len(self._positions)} open position(s) and the full trade history.",
            )
            self._launch()

    def list_trades(self, limit: int, run_id: int | None = None) -> list[dict[str, Any]]:
        return self._store.list_trades(limit, run_id)

    async def shutdown(self) -> None:
        """Stop the loop without marking the run stopped, so the next start resumes it."""
        task = self._task
        if task and not task.done():
            task.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await task
        self._save_state()

    def _launch(self) -> None:
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(
            self._run(bool(self._config.get("includeStocks", True)), bool(self._config.get("includeCrypto", True)))
        )

    # ---- status ------------------------------------------------------------------------------

    def _equity(self) -> Decimal:
        return self._cash + sum((p["quantity"] * p["price"] for p in self._positions.values()), Decimal("0"))

    def status(self) -> dict[str, Any]:
        positions = []
        market_value = Decimal("0")
        unrealized = Decimal("0")
        for symbol, position in sorted(self._positions.items()):
            value = position["quantity"] * position["price"]
            pnl = value - position["costBasis"]
            market_value += value
            unrealized += pnl
            positions.append({
                "symbol": symbol,
                "assetType": position["assetType"],
                "quantity": float(position["quantity"]),
                "averageEntryPrice": float(position["entry"]),
                "lastPrice": float(position["price"]),
                "stopPrice": float(position["stop"]),
                "marketValue": float(value),
                "unrealizedPnl": float(pnl),
                "unrealizedPct": float(pnl / position["costBasis"]) if position["costBasis"] else None,
                "entryDate": position["entryDate"],
                "reason": position["reason"],
            })
        equity = self._cash + market_value

        trades: list[dict[str, Any]] = []
        events: list[dict[str, str]] = []
        stats: dict[str, Any] = {}
        run_count = 0
        read_error = None
        try:
            trades = self._store.list_trades(STATUS_TRADE_LIMIT)
            run_count = self._store.run_count()
            if self._run_id is not None:
                events = self._store.list_events(self._run_id, MAX_EVENTS)
                stats = self._store.closed_trade_stats(self._run_id)
        except Exception:
            logger.exception("Could not read the saved paper bot history")
            read_error = "The saved trade history could not be read from disk; check the backend log"

        readable = [state for state in self._states.values() if state["status"] == "OK"]
        return {
            "running": self._running,
            "mode": "PAPER",
            "runId": self._run_id,
            "runCount": run_count,
            "persistence": {"path": str(self._store.path), "saved": True},
            "strategyInfo": {"name": strategy.STRATEGY_NAME, "rules": strategy.STRATEGY_RULES},
            "checking": self._checking,
            "checks": self._checks,
            "startedAt": self._started_at,
            "lastCheckedAt": self._last_checked_at,
            "nextCheckAt": self._next_check_at,
            "intervalSeconds": self._interval_seconds,
            "maxPositions": self._max_positions,
            "startingCash": float(self._starting_cash),
            "cash": float(self._cash),
            "equity": float(equity),
            "returnPct": float(equity / self._starting_cash - 1) if self._starting_cash > 0 else None,
            "realizedPnl": float(self._realized_pnl),
            "unrealizedPnl": float(unrealized),
            "stats": stats,
            "regime": self._regime,
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
            "positions": positions,
            "trades": trades,
            "events": events,
            "lastError": read_error or self._last_error,
        }

    # ---- scan loop ---------------------------------------------------------------------------

    async def _run(self, include_stocks: bool, include_crypto: bool) -> None:
        stop_event = self._stop_event
        run_id = self._run_id
        if stop_event is None:
            return

        def active() -> bool:
            # A newer start() replaces the stop event and run id, which retires this loop.
            return self._running and self._stop_event is stop_event and self._run_id == run_id

        if not await self._prepare_universe(include_stocks, include_crypto, active):
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
                self._save_state()
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
        stocks: list[str] = []
        if include_stocks:
            self._log("info", "Loading the S&P 500 constituent list...")
            try:
                stocks = await asyncio.to_thread(load_sp500_symbols)
            except Exception:
                logger.exception("Could not load the S&P 500 constituent list")
                self._log("warn", "Could not load the S&P 500 list; continuing without stocks.")
        if not active():
            return False

        universe = build_universe(stocks, include_stocks and bool(stocks), include_crypto)
        if not universe:
            self._last_error = "No symbols to scan; the bot stopped"
            self._log("warn", self._last_error)
            self.stop()
            return False

        self._universe = universe
        if self._saved_universe_size != len(universe) or self._cursor >= len(universe):
            self._cursor = 0
        ticks = -(-len(universe) // BATCH_SIZE)
        self._log(
            "info",
            f"Universe ready: {sum(1 for _, kind in universe if kind == 'STOCK')} stocks and "
            f"{sum(1 for _, kind in universe if kind == 'CRYPTO')} crypto pairs. A full pass takes {ticks} ticks "
            f"(at least {ticks * self._interval_seconds // 60} min).",
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

    def _asset_type(self, symbol: str) -> str:
        return next((kind for item, kind in self._universe if item == symbol), "STOCK")

    def _finish_pass_if_complete(self) -> None:
        if not self._universe or self._cursor < len(self._universe):
            return
        self._execute_entries()
        readable = [state for state in self._states.values() if state["status"] == "OK"]
        equity = self._equity()
        change = equity / self._starting_cash - 1 if self._starting_cash > 0 else Decimal("0")
        self._log(
            "info",
            f"Pass {self._pass} complete: {len(readable)} symbols read, {len(self._states) - len(readable)} unavailable, "
            f"{self._pass_buys} bought, {self._pass_sells} sold, {len(self._positions)} open; "
            f"equity {_money(equity)} ({change:+.1%} vs start).",
        )
        self._pass += 1
        self._cursor = 0
        self._pass_buys = 0
        self._pass_sells = 0
        self._candidates = {}
        self._save_state()

    # ---- strategy ----------------------------------------------------------------------------

    def _process_result(self, result: dict[str, Any]) -> None:
        symbol = result["symbol"]
        analysis = result["analysis"]
        if analysis is None:
            self._states[symbol] = {"status": "UNAVAILABLE", "reason": result["error"]}
            return

        price = Decimal(str(analysis["close"]))
        self._states[symbol] = {"status": "OK", "trend": "UPTREND" if strategy.regime_is_on(analysis) else "DOWNTREND"}
        kind = self._asset_type(symbol)
        if symbol == REGIME_SYMBOLS.get(kind):
            self._update_regime(kind, symbol, analysis)

        position = self._positions.get(symbol)
        if position is not None:
            position["price"] = price
            reason = strategy.exit_reason(analysis, float(position["entry"]), float(position["stop"]))
            if reason:
                self._close_position(symbol, position, price, analysis["date"], reason)
            return

        if self._acted.get(symbol) == analysis["date"]:
            return
        regime = self._regime.get(kind)
        if not regime or not regime["on"]:
            return
        label = f"market filter on ({regime['symbol']} ${regime['close']:,.2f} is above its 200-day average ${regime['sma200']:,.2f})"
        reason = strategy.entry_reason(analysis, label)
        if reason:
            self._candidates[symbol] = {
                "symbol": symbol,
                "kind": kind,
                "price": price,
                "atr": analysis["atr"],
                "momentum": analysis["momentum"],
                "date": analysis["date"],
                "reason": reason,
            }

    def _update_regime(self, kind: str, symbol: str, analysis: dict[str, Any]) -> None:
        on = strategy.regime_is_on(analysis)
        previous = self._regime.get(kind)
        self._regime[kind] = {"symbol": symbol, "on": on, "close": analysis["close"], "sma200": analysis["sma200"]}
        if previous is not None and previous["on"] != on:
            self._log(
                "info",
                f"Market filter for {kind.lower()} turned {'ON' if on else 'OFF'}: {symbol} ${analysis['close']:,.2f} vs "
                f"200-day average ${analysis['sma200']:,.2f}. New {kind.lower()} entries are {'allowed' if on else 'paused'}.",
            )

    def _execute_entries(self) -> None:
        ranked = sorted(self._candidates.values(), key=lambda item: item["momentum"], reverse=True)
        if not ranked:
            return
        self._log(
            "info",
            "Breakout candidates this pass, strongest 6-month momentum first: "
            + ", ".join(f"{item['symbol']} {item['momentum']:+.0%}" for item in ranked[:8])
            + (f" and {len(ranked) - 8} more" if len(ranked) > 8 else "")
            + ".",
        )
        for rank, candidate in enumerate(ranked, 1):
            if len(self._positions) >= self._max_positions:
                self._log("info", f"{len(ranked) - rank + 1} lower-ranked candidate(s) skipped: all {self._max_positions} position slots are in use.")
                break
            if self._cash < MIN_ORDER_VALUE:
                self._log("info", f"{len(ranked) - rank + 1} lower-ranked candidate(s) skipped: no cash left ({_money(self._cash)}).")
                break
            regime = self._regime.get(candidate["kind"])
            if regime and regime["on"]:
                self._open_position(candidate, rank, len(ranked))

    def _open_position(self, candidate: dict[str, Any], rank: int, total: int) -> None:
        symbol = candidate["symbol"]
        price: Decimal = candidate["price"]
        equity = self._equity()
        size = strategy.position_size(float(equity), float(self._cash), float(price), candidate["atr"])
        quantity = Decimal(str(size["quantity"])).quantize(UNIT, rounding=ROUND_DOWN)
        gross = quantity * price
        if gross < MIN_ORDER_VALUE:
            self._log("warn", f"BUY {symbol} skipped: the order would be under {_money(MIN_ORDER_VALUE)} (cash {_money(self._cash)}).")
            return
        fee = gross * FEE_RATE
        cost = gross + fee
        stop = Decimal(str(strategy.initial_stop(float(price), candidate["atr"]))).quantize(UNIT)
        reason = (
            f"BUY {symbol}: {candidate['reason']} Ranked #{rank} of {total} breakout candidates this pass. "
            f"Risk budget {strategy.RISK_PCT:.1%} of equity ({_money(Decimal(str(size['riskDollars'])))}) with the stop at "
            f"{_money(stop)} ({strategy.STOP_ATR:g} ATR below entry); size limited by {size['limitedBy']}: "
            f"{quantity} units = {_money(gross)} ({gross / equity:.0%} of equity) plus {_money(fee)} fee."
        )
        self._cash -= cost
        self._positions[symbol] = {
            "assetType": candidate["kind"],
            "quantity": quantity,
            "entry": price,
            "price": price,
            "stop": stop,
            "costBasis": cost,
            "entryDate": candidate["date"],
            "reason": reason,
        }
        self._pass_buys += 1
        self._commit_trade(self._trade_record(symbol, candidate["kind"], "BUY", quantity, price, fee, None, reason, candidate["date"]))
        self._log("trade", reason)

    def _close_position(self, symbol: str, position: dict[str, Any], price: Decimal, date: str, why: str) -> None:
        quantity = position["quantity"]
        gross = quantity * price
        fee = gross * FEE_RATE
        proceeds = gross - fee
        realized = proceeds - position["costBasis"]
        reason = (
            f"SELL {symbol}: {why} Sold {quantity} at {_money(price)} (bought at {_money(position['entry'])} on "
            f"{position['entryDate']}); result {_money(realized)} ({realized / position['costBasis']:+.1%}) after {_money(fee)} fee."
        )
        self._cash += proceeds
        self._realized_pnl += realized
        del self._positions[symbol]
        self._acted[symbol] = date
        self._pass_sells += 1
        self._commit_trade(self._trade_record(symbol, position["assetType"], "SELL", quantity, price, fee, realized, reason, date))
        self._log("trade", reason)

    @staticmethod
    def _trade_record(
        symbol: str,
        asset_type: str,
        side: str,
        quantity: Decimal,
        price: Decimal,
        fee: Decimal,
        realized: Decimal | None,
        reason: str,
        signal_date: str,
    ) -> dict[str, Any]:
        return {
            "symbol": symbol,
            "assetType": asset_type,
            "side": side,
            "quantity": float(quantity),
            "price": float(price),
            "total": float(quantity * price),
            "fee": float(fee),
            "realizedPnl": float(realized) if realized is not None else None,
            "reason": reason,
            "signalDate": signal_date,
            "createdAt": _now(),
        }


paper_trading_bot = PaperTradingBot()

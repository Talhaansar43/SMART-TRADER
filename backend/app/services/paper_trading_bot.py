"""In-memory paper trading for the verified SMA crossover baseline."""

import asyncio
import copy
import logging
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from app.services.market_service import get_stock_history
from app.services.strategy_service import evaluate_sma_crossover

logger = logging.getLogger(__name__)


class PaperTradingBot:
    def __init__(self) -> None:
        self._running = False
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._symbol = ""
        self._quantity = 0
        self._interval_seconds = 300
        self._starting_cash = Decimal("0")
        self._cash = Decimal("0")
        self._position_quantity = 0
        self._average_entry = Decimal("0")
        self._last_price = Decimal("0")
        self._last_evaluated_date: str | None = None
        self._last_signal: dict[str, Any] | None = None
        self._last_error: str | None = None
        self._trades: list[dict[str, Any]] = []

    def start(
        self,
        symbol: str,
        quantity: int,
        starting_cash: Decimal,
        interval_seconds: int,
    ) -> None:
        if self._running:
            raise RuntimeError("The paper trading bot is already running")

        self._symbol = symbol.upper()
        self._quantity = quantity
        self._interval_seconds = interval_seconds
        self._starting_cash = starting_cash
        self._cash = starting_cash
        self._position_quantity = 0
        self._average_entry = Decimal("0")
        self._last_price = Decimal("0")
        self._last_evaluated_date = None
        self._last_signal = None
        self._last_error = None
        self._trades = []
        self._running = True
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run())

    def stop(self) -> None:
        self._running = False
        if self._stop_event:
            self._stop_event.set()

    def status(self) -> dict[str, Any]:
        position_value = self._last_price * self._position_quantity
        return copy.deepcopy({
            "running": self._running,
            "mode": "PAPER",
            "strategy": "sma_crossover",
            "symbol": self._symbol or None,
            "quantity": self._quantity or None,
            "intervalSeconds": self._interval_seconds,
            "startingCash": float(self._starting_cash),
            "cash": float(self._cash),
            "position": {
                "quantity": self._position_quantity,
                "averageEntryPrice": float(self._average_entry),
                "lastPrice": float(self._last_price),
                "marketValue": float(position_value),
                "unrealizedPnl": float((self._last_price - self._average_entry) * self._position_quantity),
            },
            "equity": float(self._cash + position_value),
            "lastSignal": self._last_signal,
            "lastError": self._last_error,
            "trades": self._trades[-50:],
        })

    async def _run(self) -> None:
        while self._running:
            try:
                signal, bars = await asyncio.to_thread(self._fetch_evaluation)
                if not self._running:
                    break
                self._process_evaluation(signal, bars)
            except Exception:
                logger.exception("Paper trading evaluation failed")
                self._last_error = "Market data could not be evaluated; no order was placed"

            if not self._running or not self._stop_event:
                break
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self._interval_seconds)
            except asyncio.TimeoutError:
                continue
            break

    def _fetch_evaluation(self) -> tuple[dict[str, Any], list[Any]]:
        history = get_stock_history(self._symbol, days=365, allow_mock=False)
        signal = evaluate_sma_crossover(self._symbol, history)
        bars = history.get("data") if isinstance(history.get("data"), list) else []
        return signal, bars

    def _process_evaluation(self, signal: dict[str, Any], bars: list[Any]) -> None:
        if bars and isinstance(bars[-1], dict):
            try:
                self._last_price = Decimal(str(bars[-1]["close"]))
            except (KeyError, ValueError, ArithmeticError):
                self._last_error = "Latest market price was invalid; no order was placed"
                return

        if signal.get("status") != "EVALUATED":
            self._last_error = signal.get("reason") or "Signal unavailable; no order was placed"
            return

        self._last_error = None
        signal_date = signal.get("asOf")
        if not isinstance(signal_date, str) or signal_date == self._last_evaluated_date:
            return

        self._last_evaluated_date = signal_date
        self._last_signal = {
            "signal": signal.get("signal"),
            "reason": signal.get("reason"),
            "asOf": signal_date,
            "source": signal.get("source"),
        }
        action = signal.get("signal")
        if action == "BUY" and self._position_quantity == 0:
            cost = self._last_price * self._quantity
            if self._last_price > 0 and cost <= self._cash:
                self._cash -= cost
                self._position_quantity = self._quantity
                self._average_entry = self._last_price
                self._record_trade("BUY", self._quantity, signal_date)
        elif action == "SELL" and self._position_quantity > 0:
            quantity = self._position_quantity
            self._cash += self._last_price * quantity
            self._position_quantity = 0
            self._average_entry = Decimal("0")
            self._record_trade("SELL", quantity, signal_date)

    def _record_trade(self, side: str, quantity: int, signal_date: str) -> None:
        self._trades.append({
            "id": f"paper-{len(self._trades) + 1}",
            "symbol": self._symbol,
            "side": side,
            "quantity": quantity,
            "price": float(self._last_price),
            "total": float(self._last_price * quantity),
            "signalDate": signal_date,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })


paper_trading_bot = PaperTradingBot()


def normalize_bot_symbol(symbol: str) -> str:
    normalized = symbol.strip().upper()
    if not normalized or not re.fullmatch(r"[A-Z0-9.-]{1,12}", normalized):
        raise ValueError("Invalid stock symbol")
    return normalized

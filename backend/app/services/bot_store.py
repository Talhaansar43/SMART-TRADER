"""SQLite persistence for the paper bot so runs, trades and events survive any number of restarts."""

import json
import logging
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "paper_bot.sqlite3"
MAX_EVENTS_PER_RUN = 2000

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL,
    config TEXT NOT NULL,
    state TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id),
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    fee REAL NOT NULL,
    realized_pnl REAL,
    reason TEXT NOT NULL,
    signal_date TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trades_run ON trades(run_id, id);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id),
    time TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id, id);
"""

TRADE_COLUMNS = (
    "id, run_id, symbol, asset_type, side, quantity, price, total, fee, realized_pnl, reason, signal_date, created_at"
)


def _trade_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "runId": row["run_id"],
        "symbol": row["symbol"],
        "assetType": row["asset_type"],
        "side": row["side"],
        "quantity": row["quantity"],
        "price": row["price"],
        "total": row["total"],
        "fee": row["fee"],
        "realizedPnl": row["realized_pnl"],
        "reason": row["reason"],
        "signalDate": row["signal_date"],
        "createdAt": row["created_at"],
    }


class BotStore:
    def __init__(self, path: str | Path | None = None) -> None:
        self.path = Path(os.environ.get("PAPER_BOT_DB") or path or DEFAULT_DB_PATH)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as conn, conn:
            conn.executescript(SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=FULL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def create_run(self, config: dict[str, Any], state: dict[str, Any], now: str) -> int:
        with closing(self._connect()) as conn, conn:
            cursor = conn.execute(
                "INSERT INTO runs (started_at, status, config, state, updated_at) VALUES (?, 'running', ?, ?, ?)",
                (now, json.dumps(config), json.dumps(state), now),
            )
            return int(cursor.lastrowid)

    def save_state(self, run_id: int, state: dict[str, Any], now: str, status: str | None = None) -> None:
        ended_at = now if status == "stopped" else None
        with closing(self._connect()) as conn, conn:
            conn.execute(
                "UPDATE runs SET state = ?, updated_at = ?, status = COALESCE(?, status), "
                "ended_at = COALESCE(?, ended_at) WHERE id = ?",
                (json.dumps(state), now, status, ended_at, run_id),
            )

    def record_trade(self, run_id: int, trade: dict[str, Any], state: dict[str, Any], now: str) -> int:
        """Insert the trade and the resulting account state in one transaction so they can never disagree."""
        with closing(self._connect()) as conn, conn:
            cursor = conn.execute(
                "INSERT INTO trades (run_id, symbol, asset_type, side, quantity, price, total, fee, realized_pnl, "
                "reason, signal_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    run_id, trade["symbol"], trade["assetType"], trade["side"], trade["quantity"], trade["price"],
                    trade["total"], trade["fee"], trade["realizedPnl"], trade["reason"], trade["signalDate"],
                    trade["createdAt"],
                ),
            )
            conn.execute(
                "UPDATE runs SET state = ?, updated_at = ? WHERE id = ?", (json.dumps(state), now, run_id)
            )
            return int(cursor.lastrowid)

    def add_event(self, run_id: int, time: str, level: str, message: str) -> None:
        with closing(self._connect()) as conn, conn:
            cursor = conn.execute(
                "INSERT INTO events (run_id, time, level, message) VALUES (?, ?, ?, ?)", (run_id, time, level, message)
            )
            if cursor.lastrowid % 200 == 0:
                conn.execute(
                    "DELETE FROM events WHERE run_id = ? AND id <= ?", (run_id, cursor.lastrowid - MAX_EVENTS_PER_RUN)
                )

    def latest_run(self) -> dict[str, Any] | None:
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT * FROM runs ORDER BY id DESC LIMIT 1").fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "startedAt": row["started_at"],
            "endedAt": row["ended_at"],
            "status": row["status"],
            "config": json.loads(row["config"]),
            "state": json.loads(row["state"]),
        }

    def run_count(self) -> int:
        with closing(self._connect()) as conn:
            return int(conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0])

    def list_trades(self, limit: int, run_id: int | None = None) -> list[dict[str, Any]]:
        """Newest first."""
        query = f"SELECT {TRADE_COLUMNS} FROM trades"
        params: list[Any] = []
        if run_id is not None:
            query += " WHERE run_id = ?"
            params.append(run_id)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        with closing(self._connect()) as conn:
            return [_trade_row(row) for row in conn.execute(query, params)]

    def list_events(self, run_id: int, limit: int) -> list[dict[str, str]]:
        """The latest `limit` events, newest first."""
        with closing(self._connect()) as conn:
            rows = conn.execute(
                "SELECT time, level, message FROM events WHERE run_id = ? ORDER BY id DESC LIMIT ?", (run_id, limit)
            ).fetchall()
        return [{"time": row["time"], "level": row["level"], "message": row["message"]} for row in rows]

    def closed_trade_stats(self, run_id: int) -> dict[str, Any]:
        with closing(self._connect()) as conn:
            rows = conn.execute(
                "SELECT realized_pnl FROM trades WHERE run_id = ? AND side = 'SELL' AND realized_pnl IS NOT NULL",
                (run_id,),
            ).fetchall()
            total_trades = conn.execute("SELECT COUNT(*) FROM trades WHERE run_id = ?", (run_id,)).fetchone()[0]
        pnls = [row["realized_pnl"] for row in rows]
        wins = [pnl for pnl in pnls if pnl > 0]
        losses = [pnl for pnl in pnls if pnl <= 0]
        return {
            "trades": int(total_trades),
            "closed": len(pnls),
            "wins": len(wins),
            "losses": len(losses),
            "winRate": len(wins) / len(pnls) if pnls else None,
            "avgWin": sum(wins) / len(wins) if wins else None,
            "avgLoss": sum(losses) / len(losses) if losses else None,
        }

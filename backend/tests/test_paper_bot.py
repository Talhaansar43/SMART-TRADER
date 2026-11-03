import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from app.services import trend_strategy as strategy
from app.services.bot_store import BotStore
from app.services.paper_trading_bot import PaperTradingBot

BREAKOUT = {"close": 110.0, "priorHigh": 100.0, "priorLow": 90.0, "sma200": 80.0, "atr": 2.0, "momentum": 0.30, "date": "2026-11-02"}
REGIME_ON = {"symbol": "SPY", "on": True, "close": 500.0, "sma200": 450.0}


def make_bot(path: Path):
    bot = PaperTradingBot(BotStore(path))
    bot.launches = 0

    def fake_launch():
        bot.launches += 1

    bot._launch = fake_launch
    return bot


class StrategyTests(unittest.TestCase):
    def test_breakout_needs_every_rule(self):
        self.assertIsNotNone(strategy.entry_reason(BREAKOUT, "regime on"))
        self.assertIsNone(strategy.entry_reason({**BREAKOUT, "close": 99.0}, "regime on"))
        self.assertIsNone(strategy.entry_reason({**BREAKOUT, "sma200": 120.0}, "regime on"))
        self.assertIsNone(strategy.entry_reason({**BREAKOUT, "momentum": -0.1}, "regime on"))

    def test_exit_on_stop_or_trend_break(self):
        self.assertIn("Protective stop", strategy.exit_reason({**BREAKOUT, "close": 95.0}, 110.0, 96.0))
        self.assertIn("Trend ended", strategy.exit_reason({**BREAKOUT, "close": 89.0}, 110.0, 80.0))
        self.assertIsNone(strategy.exit_reason(BREAKOUT, 100.0, 90.0))

    def test_sizing_respects_risk_cap_and_cash(self):
        size = strategy.position_size(equity=1000.0, cash=1000.0, price=10.0, atr=1.0)
        self.assertAlmostEqual(size["quantity"], 1000 * strategy.RISK_PCT / (strategy.STOP_ATR * 1.0))
        self.assertEqual(size["limitedBy"], "risk budget")
        capped = strategy.position_size(equity=1000.0, cash=1000.0, price=100.0, atr=0.1)
        self.assertAlmostEqual(capped["quantity"] * 100.0, 1000 * strategy.MAX_POSITION_PCT)
        poor = strategy.position_size(equity=1000.0, cash=50.0, price=100.0, atr=0.1)
        self.assertLessEqual(poor["quantity"] * 100.0 * (1 + strategy.FEE_RATE), 50.0 + 1e-9)

    def test_analyze_detects_breakout_in_a_rising_series(self):
        bars = [{"date": f"d{i}", "close": 100 + i * 0.5, "high": 100.5 + i * 0.5, "low": 99.5 + i * 0.5} for i in range(260)]
        bars[-1]["close"] += 10
        bars[-1]["high"] += 10
        analysis = strategy.analyze(bars)
        self.assertIsNotNone(analysis)
        self.assertGreater(analysis["close"], analysis["priorHigh"])
        self.assertIsNone(strategy.analyze(bars[:100]))


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "bot.sqlite3"

    def tearDown(self):
        self.dir.cleanup()

    def buy(self, bot, symbol="AAA"):
        bot._universe = [("SPY", "STOCK"), (symbol, "STOCK")]
        bot._regime = {"STOCK": dict(REGIME_ON)}
        bot._process_result({"symbol": symbol, "analysis": dict(BREAKOUT), "error": None})
        bot._cursor = len(bot._universe)
        bot._finish_pass_if_complete()

    def test_trade_reason_account_and_history_survive_a_restart(self):
        bot = make_bot(self.path)
        bot.start(Decimal("1000"), 6, 10, True, True)
        self.buy(bot)

        trades = bot.status()["trades"]
        self.assertEqual(len(trades), 1)
        self.assertEqual(trades[0]["side"], "BUY")
        self.assertIn("Breakout", trades[0]["reason"])
        cash_before = bot.status()["cash"]

        restarted = make_bot(self.path)
        restarted.restore()
        status = restarted.status()
        self.assertEqual(restarted.launches, 1, "a running run must resume after a restart")
        self.assertEqual(len(status["trades"]), 1)
        self.assertEqual(status["trades"][0]["reason"], trades[0]["reason"])
        self.assertEqual([p["symbol"] for p in status["positions"]], ["AAA"])
        self.assertAlmostEqual(status["cash"], cash_before)
        self.assertLess(status["cash"], 1000)

    def test_sell_after_restart_books_pnl_and_keeps_buy_history(self):
        bot = make_bot(self.path)
        bot.start(Decimal("1000"), 6, 10, True, True)
        self.buy(bot)

        restarted = make_bot(self.path)
        restarted.restore()
        restarted._universe = [("SPY", "STOCK"), ("AAA", "STOCK")]
        restarted._process_result({"symbol": "AAA", "analysis": {**BREAKOUT, "close": 140.0, "priorLow": 150.0}, "error": None})

        status = restarted.status()
        self.assertEqual([t["side"] for t in status["trades"]], ["SELL", "BUY"])
        self.assertIn("Trend ended", status["trades"][0]["reason"])
        self.assertGreater(status["realizedPnl"], 0)
        self.assertEqual(status["positions"], [])
        self.assertEqual(status["stats"]["wins"], 1)

        third = make_bot(self.path)
        third.restore()
        self.assertEqual(len(third.status()["trades"]), 2)
        self.assertAlmostEqual(third.status()["realizedPnl"], status["realizedPnl"])

    def test_stopped_run_is_loaded_but_not_resumed_and_new_run_keeps_history(self):
        bot = make_bot(self.path)
        bot.start(Decimal("1000"), 6, 10, True, True)
        self.buy(bot)
        bot.stop()

        restarted = make_bot(self.path)
        restarted.restore()
        self.assertEqual(restarted.launches, 0)
        self.assertFalse(restarted.status()["running"])
        self.assertEqual(len(restarted.status()["positions"]), 1)

        restarted.start(Decimal("1000"), 6, 10, True, True)
        status = restarted.status()
        self.assertEqual(status["runCount"], 2)
        self.assertEqual(status["cash"], 1000)
        self.assertEqual(len(status["trades"]), 1, "the earlier run's trade must stay in the history")

    def test_events_are_saved(self):
        bot = make_bot(self.path)
        bot.start(Decimal("1000"), 6, 10, True, True)
        restarted = make_bot(self.path)
        restarted.restore()
        messages = [event["message"] for event in restarted.status()["events"]]
        self.assertTrue(any("Started run" in message for message in messages))
        self.assertTrue(any("Resumed run" in message for message in messages))


if __name__ == "__main__":
    unittest.main()

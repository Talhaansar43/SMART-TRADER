"""Symbols the paper bot and the backtest scan: S&P 500 constituents and major crypto pairs."""

import csv
import io
import re

import requests

SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
CRYPTO_SYMBOLS = [
    "BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD", "ADA-USD", "DOGE-USD", "TRX-USD", "AVAX-USD",
    "LINK-USD", "DOT-USD", "LTC-USD", "BCH-USD", "XLM-USD", "ATOM-USD", "ETC-USD", "XMR-USD", "NEAR-USD",
]
# Each market is only traded while its benchmark is above its 200-day average.
REGIME_SYMBOLS = {"STOCK": "SPY", "CRYPTO": "BTC-USD"}


def load_sp500_symbols() -> list[str]:
    response = requests.get(SP500_CSV_URL, timeout=15)
    response.raise_for_status()
    symbols = []
    for row in csv.DictReader(io.StringIO(response.text)):
        # Yahoo uses dashes for share classes, e.g. BRK-B.
        symbol = (row.get("Symbol") or "").strip().upper().replace(".", "-")
        if re.fullmatch(r"[A-Z0-9-]{1,10}", symbol):
            symbols.append(symbol)
    return symbols


def build_universe(stocks: list[str], include_stocks: bool, include_crypto: bool) -> list[tuple[str, str]]:
    """(symbol, asset type) pairs with the regime benchmarks first so the filter is known before any entry."""
    universe: list[tuple[str, str]] = []
    if include_stocks:
        universe.append((REGIME_SYMBOLS["STOCK"], "STOCK"))
    if include_crypto:
        universe.append((REGIME_SYMBOLS["CRYPTO"], "CRYPTO"))
        universe.extend((symbol, "CRYPTO") for symbol in CRYPTO_SYMBOLS if symbol != REGIME_SYMBOLS["CRYPTO"])
    if include_stocks:
        universe.extend((symbol, "STOCK") for symbol in stocks if symbol != REGIME_SYMBOLS["STOCK"])
    return universe

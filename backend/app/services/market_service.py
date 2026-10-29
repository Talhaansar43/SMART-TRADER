"""
File Purpose: Market data service using Finnhub API with fallback to mock data
Last Updated: 29 July 2026
Dependencies: finnhub, requests, redis
Related Files: app/api/routes/market.py, app/config.py
"""

import logging
import json
import math
import redis
import requests
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta, timezone
from app.config import settings
import truststore

truststore.inject_into_ssl()

import finnhub

logger = logging.getLogger(__name__)

# Initialize Finnhub client
try:
    finnhub_client = finnhub.Client(api_key=settings.FINNHUB_API_KEY)
    logger.info("✅ Finnhub API client initialized")
    FINNHUB_AVAILABLE = True
except Exception as e:
    logger.warning(f"⚠️ Finnhub API not available: {str(e)}")
    finnhub_client = None
    FINNHUB_AVAILABLE = False

# Redis setup
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    logger.info("✅ Redis connected for caching")
    REDIS_AVAILABLE = True
except Exception as e:
    logger.warning(f"⚠️ Redis not available: {str(e)}")
    redis_client = None
    REDIS_AVAILABLE = False

CACHE_TIMEOUT = 300  # 5 minutes

# Mock data for fallback
MOCK_STOCKS = {
    "AAPL": {"name": "Apple Inc.", "currentPrice": 189.95, "open": 188.50, "high": 190.25, "low": 187.80, "volume": 52847300},
    "MSFT": {"name": "Microsoft Corporation", "currentPrice": 423.60, "open": 420.15, "high": 425.80, "low": 419.50, "volume": 18934500},
    "GOOGL": {"name": "Alphabet Inc.", "currentPrice": 141.80, "open": 140.20, "high": 142.90, "low": 139.70, "volume": 21447800},
    "TSLA": {"name": "Tesla, Inc.", "currentPrice": 242.50, "open": 238.75, "high": 245.20, "low": 236.90, "volume": 145628900},
    "AMZN": {"name": "Amazon.com Inc.", "currentPrice": 175.20, "open": 173.50, "high": 176.80, "low": 172.90, "volume": 52314200},
}


def get_mock_price(symbol: str) -> Optional[Dict[str, Any]]:
    """Get mock price data for fallback"""
    if symbol in MOCK_STOCKS:
        stock = MOCK_STOCKS[symbol]
        import random
        retrieved_at = datetime.now(timezone.utc).isoformat()
        return {
            "symbol": symbol,
            "currentPrice": stock["currentPrice"] + random.uniform(-2, 2),
            "open": stock["open"],
            "high": stock["high"],
            "low": stock["low"],
            "volume": stock["volume"],
            "marketCap": "N/A",
            "pe": round(random.uniform(15, 40), 2),
            "eps": round(random.uniform(2, 15), 2),
            "lastUpdated": retrieved_at,
            "dataTimestamp": None,
            "retrievedAt": retrieved_at,
            "cached": False,
            "mock": True,
            "source": "mock",
            "note": "Using mock data - real-time data unavailable"
        }
    return None


def get_stock_price(symbol: str) -> Dict[str, Any]:
    """
    Get current stock price from Finnhub with Redis caching and fallback to mock data
    
    Args:
        symbol: Stock symbol (e.g., AAPL)
    
    Returns:
        dict: Stock price data with metadata
    """
    cache_key = f"stock_price:{symbol}"
    
    # Check Redis cache first
    if REDIS_AVAILABLE and redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"✅ Cache HIT for {symbol}")
                result = json.loads(cached_data)
                result["cached"] = True
                return result
        except Exception as e:
            logger.warning(f"Cache read error: {str(e)}")
    
    # Try Finnhub first
    if FINNHUB_AVAILABLE and finnhub_client:
        try:
            logger.info(f"📡 Fetching {symbol} from Finnhub...")
            
            # Get quote data
            quote = finnhub_client.quote(symbol)
            current_price = quote.get('c') if quote else None
            quote_timestamp = quote.get('t') if quote else None
            
            if (
                isinstance(current_price, (int, float))
                and math.isfinite(current_price)
                and current_price > 0
                and isinstance(quote_timestamp, (int, float))
                and math.isfinite(quote_timestamp)
                and quote_timestamp > 0
            ):
                retrieved_at = datetime.now(timezone.utc).isoformat()
                data_timestamp = datetime.fromtimestamp(
                    quote_timestamp, tz=timezone.utc
                ).isoformat()
                result = {
                    "symbol": symbol,
                    "currentPrice": current_price,
                    "open": quote.get('o'),
                    "high": quote.get('h'),
                    "low": quote.get('l'),
                    "volume": quote.get('v'),
                    "previousClose": quote.get('pc'),
                    "marketCap": "N/A",
                    "pe": None,
                    "eps": None,
                    "lastUpdated": data_timestamp,
                    "dataTimestamp": data_timestamp,
                    "retrievedAt": retrieved_at,
                    "cached": False,
                    "mock": False,
                    "source": "finnhub",
                    "note": "Real-time data from Finnhub"
                }
                
                # Cache the result
                if REDIS_AVAILABLE and redis_client:
                    try:
                        redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(result))
                        logger.info(f"💾 Cached {symbol} from Finnhub for {CACHE_TIMEOUT} seconds")
                    except Exception as e:
                        logger.warning(f"Cache write error: {str(e)}")
                
                return result
            else:
                logger.warning(f"Invalid response from Finnhub for {symbol}")
                raise ValueError("Finnhub returned no valid price or quote timestamp")
                
        except Exception as e:
            logger.error(f"Error fetching from Finnhub for {symbol}: {str(e)}")
    
    # Fallback to mock data
    logger.warning(f"⚠️ Falling back to mock data for {symbol}")
    mock_data = get_mock_price(symbol)
    
    if mock_data:
        # Cache mock data too
        if REDIS_AVAILABLE and redis_client:
            try:
                redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(mock_data))
                logger.info(f"💾 Cached mock data for {symbol} for {CACHE_TIMEOUT} seconds")
            except Exception as e:
                logger.warning(f"Cache write error: {str(e)}")
        return mock_data
    
    return {
        "error": f"Unable to fetch data for {symbol}",
        "symbol": symbol,
        "source": "error"
    }


def get_stock_history(
    symbol: str,
    days: int = 30,
    allow_mock: bool = True,
) -> Dict[str, Any]:
    """
    Get historical stock data from Finnhub
    
    Args:
        symbol: Stock symbol
        days: Calendar days of daily candle history to retrieve
        allow_mock: Whether to return generated candles after all real sources fail
    
    Returns:
        dict: Historical data
    """
    cache_key = f"stock_history:{symbol}:{days}d"
    
    # Check Redis cache first
    if REDIS_AVAILABLE and redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"✅ Cache HIT for {symbol} history")
                cached_result = json.loads(cached_data)
                if isinstance(cached_result, dict):
                    if cached_result.get("mock") is False and cached_result.get("source") in {"finnhub", "yahoo_finance"}:
                        cached_result["cached"] = True
                        return cached_result
                    if allow_mock:
                        cached_result["cached"] = True
                        return cached_result
                elif allow_mock:
                    return {
                        "symbol": symbol,
                        "days": days,
                        "data": cached_result,
                        "cached": True,
                        "mock": True,
                        "source": "mock"
                    }
        except Exception as e:
            logger.warning(f"Cache read error: {str(e)}")

    provider_errors = []
    
    if FINNHUB_AVAILABLE and finnhub_client:
        try:
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(days=days)
            candles = finnhub_client.stock_candles(
                symbol,
                "D",
                int(start_time.timestamp()),
                int(end_time.timestamp())
            )

            if candles and candles.get("s") == "ok":
                timestamps = candles.get("t", [])
                columns = [candles.get(key, []) for key in ("o", "h", "l", "c", "v")]
                if timestamps and all(len(column) == len(timestamps) for column in columns):
                    historical_data = []
                    for index, timestamp in enumerate(timestamps):
                        prices = [float(column[index]) for column in columns[:4]]
                        if (
                            not isinstance(timestamp, (int, float))
                            or not math.isfinite(timestamp)
                            or timestamp <= 0
                            or any(not math.isfinite(price) or price <= 0 for price in prices)
                        ):
                            raise ValueError("Finnhub returned invalid historical candle data")

                        historical_data.append({
                            "date": datetime.fromtimestamp(
                                timestamp, tz=timezone.utc
                            ).strftime("%Y-%m-%d"),
                            "open": prices[0],
                            "high": prices[1],
                            "low": prices[2],
                            "close": prices[3],
                            "volume": candles["v"][index]
                        })

                    dates = [bar["date"] for bar in historical_data]
                    if dates != sorted(set(dates)):
                        raise ValueError("Finnhub returned unordered historical candles")

                    retrieved_at = datetime.now(timezone.utc).isoformat()
                    result = {
                        "symbol": symbol,
                        "days": days,
                        "data": historical_data,
                        "cached": False,
                        "mock": False,
                        "source": "finnhub",
                        "dataTimestamp": f"{dates[-1]}T00:00:00+00:00",
                        "retrievedAt": retrieved_at
                    }

                    if REDIS_AVAILABLE and redis_client:
                        try:
                            redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(result))
                        except Exception as e:
                            logger.warning(f"Cache write error: {str(e)}")
                    return result
            else:
                logger.warning(f"No historical candles available from Finnhub for {symbol}")
                provider_errors.append("Finnhub returned no historical candles")
        except Exception as e:
            logger.warning(f"Finnhub history unavailable for {symbol}: {str(e)}")
            provider_errors.append(f"Finnhub: {str(e)}")

    try:
        end_time = datetime.now(timezone.utc)
        response = requests.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={
                "period1": int((end_time - timedelta(days=days)).timestamp()),
                "period2": int(end_time.timestamp()),
                "interval": "1d",
            },
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15,
        )
        response.raise_for_status()
        chart = response.json().get("chart", {})
        if chart.get("error"):
            raise ValueError(str(chart["error"].get("description") or "Yahoo chart request failed"))
        chart_result = (chart.get("result") or [None])[0]
        if not chart_result:
            raise ValueError("Yahoo Finance returned no chart data")

        timestamps = chart_result.get("timestamp") or []
        quote_data = (chart_result.get("indicators", {}).get("quote") or [{}])[0]
        columns = [quote_data.get(key) or [] for key in ("open", "high", "low", "close", "volume")]
        if not timestamps or any(len(column) != len(timestamps) for column in columns):
            raise ValueError("Yahoo Finance returned incomplete candle columns")

        historical_data = []
        for index, timestamp in enumerate(timestamps):
            values = [column[index] for column in columns]
            if timestamp is None or any(value is None for value in values):
                continue
            prices = [float(value) for value in values[:4]]
            volume = float(values[4])
            if (
                not isinstance(timestamp, (int, float))
                or not math.isfinite(timestamp)
                or timestamp <= 0
                or any(not math.isfinite(price) or price <= 0 for price in prices)
                or not math.isfinite(volume)
                or volume < 0
            ):
                raise ValueError("Yahoo Finance returned invalid historical candle data")
            historical_data.append({
                "date": datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d"),
                "open": prices[0],
                "high": prices[1],
                "low": prices[2],
                "close": prices[3],
                "volume": volume,
            })

        dates = [bar["date"] for bar in historical_data]
        if not dates or dates != sorted(set(dates)):
            raise ValueError("Yahoo Finance returned unordered or empty daily candles")

        retrieved_at = datetime.now(timezone.utc).isoformat()
        result = {
            "symbol": symbol,
            "days": days,
            "data": historical_data,
            "cached": False,
            "mock": False,
            "source": "yahoo_finance",
            "dataTimestamp": f"{dates[-1]}T00:00:00+00:00",
            "retrievedAt": retrieved_at,
        }
        if REDIS_AVAILABLE and redis_client:
            try:
                redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(result))
            except Exception as e:
                logger.warning(f"Cache write error: {str(e)}")
        return result
    except Exception as e:
        logger.warning("Yahoo Finance history unavailable for %s: %s", symbol, e)
        provider_errors.append(f"Yahoo Finance: {str(e)}")

    if not allow_mock:
        return {
            "symbol": symbol,
            "days": days,
            "data": [],
            "cached": False,
            "mock": False,
            "source": "unavailable",
            "error": "; ".join(provider_errors) or "No historical data provider is available",
        }

    logger.info(f"Using mock historical data for {symbol}")
    
    historical_data = []
    import random
    
    base_price = 150.0
    for i in range(days - 1, -1, -1):
        date = datetime.now() - timedelta(days=i)
        price_change = random.uniform(-5, 5)
        base_price += price_change
        
        historical_data.append({
            "date": date.strftime('%Y-%m-%d'),
            "open": round(base_price - 2, 2),
            "high": round(base_price + 3, 2),
            "low": round(base_price - 4, 2),
            "close": round(base_price, 2),
            "volume": random.randint(1000000, 5000000)
        })
    
    result = {
        "symbol": symbol,
        "days": days,
        "data": historical_data,
        "cached": False,
        "mock": True,
        "source": "mock",
        "providerErrors": provider_errors,
    }
    
    # Cache the historical data
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(result))
            logger.info(f"💾 Cached historical data for {symbol}")
        except Exception as e:
            logger.warning(f"Cache write error: {str(e)}")
    
    return result


def get_stock_fundamentals(symbol: str) -> Dict[str, Any]:
    """Fetch company profile and basic financial metrics when Finnhub permits."""
    result: Dict[str, Any] = {
        "source": "finnhub" if FINNHUB_AVAILABLE else None,
        "profile": None,
        "metrics": None,
        "statements": {"latestBalanceSheet": None, "latestAnnual": None, "annualHistory": []},
    }
    if not FINNHUB_AVAILABLE or not finnhub_client:
        return result

    try:
        profile = finnhub_client.company_profile2(symbol=symbol)
        if isinstance(profile, dict) and profile:
            result["profile"] = profile
    except Exception as error:
        logger.info("Finnhub profile unavailable for %s: %s", symbol, error)

    try:
        financials = finnhub_client.company_basic_financials(symbol, "all")
        if isinstance(financials, dict):
            metrics = financials.get("metric")
            if isinstance(metrics, dict):
                result["metrics"] = metrics
    except Exception as error:
        logger.info("Finnhub financial metrics unavailable for %s: %s", symbol, error)

    def statement_rows(report: Dict[str, Any], key: str) -> List[Dict[str, Any]]:
        rows = report.get(key, [])
        return [
            {"label": row.get("label"), "value": row.get("value")}
            for row in rows
            if isinstance(row, dict)
            and isinstance(row.get("label"), str)
            and isinstance(row.get("value"), (int, float))
            and math.isfinite(row["value"])
        ] if isinstance(rows, list) else []

    try:
        quarterly = finnhub_client.financials_reported(symbol=symbol, freq="quarterly")
        quarterly_reports = quarterly.get("data", []) if isinstance(quarterly, dict) else []
        balance_sheet_reports = [
            item for item in quarterly_reports
            if isinstance(item, dict)
            and isinstance(item.get("report"), dict)
            and item["report"].get("bs")
        ]
        if balance_sheet_reports:
            latest = max(balance_sheet_reports, key=lambda item: str(item.get("endDate") or ""))
            result["statements"]["latestBalanceSheet"] = {
                "asOf": latest.get("endDate"),
                "rows": statement_rows(latest["report"], "bs"),
            }
    except Exception as error:
        logger.info("Finnhub balance sheet unavailable for %s: %s", symbol, error)

    try:
        annual = finnhub_client.financials_reported(symbol=symbol, freq="annual")
        annual_reports = annual.get("data", []) if isinstance(annual, dict) else []
        complete_reports = [
            item for item in annual_reports
            if isinstance(item, dict)
            and isinstance(item.get("report"), dict)
            and all(item["report"].get(key) for key in ("bs", "ic", "cf"))
        ]
        if complete_reports:
            latest = max(complete_reports, key=lambda item: str(item.get("endDate") or ""))
            result["statements"]["latestAnnual"] = {
                "asOf": latest.get("endDate"),
                "balanceSheet": statement_rows(latest["report"], "bs"),
                "incomeStatement": statement_rows(latest["report"], "ic"),
                "cashFlow": statement_rows(latest["report"], "cf"),
            }
            result["statements"]["annualHistory"] = [
                {
                    "asOf": item.get("endDate"),
                    "balanceSheet": statement_rows(item["report"], "bs"),
                    "incomeStatement": statement_rows(item["report"], "ic"),
                }
                for item in sorted(complete_reports, key=lambda report: str(report.get("endDate") or ""))
                if item.get("endDate")
            ]
    except Exception as error:
        logger.info("Finnhub annual statements unavailable for %s: %s", symbol, error)

    return result


def search_stocks(query: str) -> Dict[str, Any]:
    """
    Search for stocks by symbol or company name using Finnhub
    
    Args:
        query: Search query (symbol or company name)
    
    Returns:
        dict: Search results
    """
    cache_key = f"stock_search:{query.upper()}"
    
    # Check Redis cache first
    if REDIS_AVAILABLE and redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info(f"✅ Cache HIT for search: {query}")
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache read error: {str(e)}")
    
    # Try Finnhub symbol lookup
    if FINNHUB_AVAILABLE and finnhub_client:
        try:
            logger.info(f"📡 Searching Finnhub for {query}...")
            
            # Get symbol lookup
            results = finnhub_client.symbol_lookup(query)
            
            if results and 'result' in results and results['result']:
                search_results = []
                for item in results['result'][:5]:  # Limit to 5 results
                    search_results.append({
                        "symbol": item.get('symbol'),
                        "name": item.get('description'),
                        "type": item.get('type'),
                        "currency": item.get('currency')
                    })
                
                # Cache results
                if REDIS_AVAILABLE and redis_client:
                    try:
                        redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(search_results))
                        logger.info(f"💾 Cached search results for {query}")
                    except Exception as e:
                        logger.warning(f"Cache write error: {str(e)}")
                
                return search_results
            else:
                logger.warning(f"No results from Finnhub for {query}")
                return []
                
        except Exception as e:
            logger.error(f"Error searching Finnhub: {str(e)}")
            return []
    
    return []

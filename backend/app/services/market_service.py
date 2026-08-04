"""
File Purpose: Market data service using Finnhub API with fallback to mock data
Last Updated: 29 July 2026
Dependencies: finnhub, requests, redis
Related Files: app/api/routes/market.py, app/config.py
"""

import finnhub
import logging
import json
import redis
from typing import Optional, Dict, List, Any
from datetime import datetime
from app.config import settings

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
            "lastUpdated": datetime.now().isoformat(),
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
            
            if quote and 'c' in quote:  # 'c' is the current price
                result = {
                    "symbol": symbol,
                    "currentPrice": quote.get('c'),
                    "open": quote.get('o'),
                    "high": quote.get('h'),
                    "low": quote.get('l'),
                    "volume": quote.get('v'),
                    "previousClose": quote.get('pc'),
                    "marketCap": "N/A",
                    "pe": None,
                    "eps": None,
                    "lastUpdated": datetime.now().isoformat(),
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
                raise Exception("No quote data returned")
                
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


def get_stock_history(symbol: str, days: int = 30) -> Dict[str, Any]:
    """
    Get historical stock data from Finnhub
    
    Args:
        symbol: Stock symbol
        days: Number of days of history (not supported by Finnhub free tier)
    
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
                return {
                    "symbol": symbol,
                    "days": days,
                    "data": json.loads(cached_data),
                    "cached": True
                }
        except Exception as e:
            logger.warning(f"Cache read error: {str(e)}")
    
    # Finnhub free tier doesn't include historical data
    # Use mock historical data for now
    logger.info(f"📡 Finnhub free tier - using mock historical data for {symbol}")
    
    historical_data = []
    from datetime import timedelta
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
        "cached": False
    }
    
    # Cache the historical data
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.setex(cache_key, CACHE_TIMEOUT, json.dumps(historical_data))
            logger.info(f"💾 Cached historical data for {symbol}")
        except Exception as e:
            logger.warning(f"Cache write error: {str(e)}")
    
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

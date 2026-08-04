"""
File Purpose: Market data API routes for fetching stock prices and historical data
Last Updated: 29 July 2026
Dependencies: fastapi, finnhub, redis, market_service
Related Files: app/services/market_service.py
"""

from fastapi import APIRouter, Query
from typing import List, Optional
import logging
from app.services.market_service import (
    get_stock_price,
    get_stock_history,
    search_stocks
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/price")
async def get_market_price(symbol: str = Query(..., description="Stock symbol e.g., AAPL")):
    """
    Get current market price and basic info for a stock using Finnhub API
    
    Args:
        symbol: Stock symbol (e.g., AAPL)
    
    Returns:
        dict: Price data including current price, open, high, low, volume
    """
    try:
        result = get_stock_price(symbol.upper())
        return result
    except Exception as e:
        logger.error(f"Error in price endpoint for {symbol}: {str(e)}")
        return {"error": str(e), "symbol": symbol}


@router.get("/history")
async def get_market_history(
    symbol: str = Query(..., description="Stock symbol"),
    days: int = Query(30, ge=1, le=365, description="Number of days of history")
):
    """
    Get historical price data for a stock
    
    Args:
        symbol: Stock symbol (e.g., AAPL)
        days: Number of days of history (1-365)
    
    Returns:
        dict: List of historical data points with OHLCV
    """
    try:
        result = get_stock_history(symbol.upper(), days)
        return result
    except Exception as e:
        logger.error(f"Error in history endpoint for {symbol}: {str(e)}")
        return {"error": str(e), "symbol": symbol}


@router.get("/search")
async def search_stock(
    query: str = Query(..., min_length=1, description="Search query")
):
    """
    Search for stocks by symbol or company name using Finnhub
    
    Args:
        query: Search term (symbol or company name)
    
    Returns:
        list: List of matching symbols and companies
    """
    try:
        results = search_stocks(query.upper())
        return results
    except Exception as e:
        logger.error(f"Error in search endpoint for {query}: {str(e)}")
        return {"error": str(e), "query": query}

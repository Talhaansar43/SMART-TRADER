"""
File Purpose: Trading API routes for placing and managing orders
Last Updated: 28 July 2026
Dependencies: fastapi, pydantic, sqlalchemy
Related Files: app/models/trade.py, app/services/trading_service.py
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.paper_trading_bot import paper_trading_bot
from typing import List
from enum import Enum
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class OrderType(str, Enum):
    """Order types"""
    BUY = "BUY"
    SELL = "SELL"

class OrderMode(str, Enum):
    """Order modes"""
    MARKET = "MARKET"
    LIMIT = "LIMIT"

class PlaceOrderRequest(BaseModel):
    """Request model for placing an order"""
    symbol: str = Field(..., description="Stock symbol")
    type: OrderType = Field(..., description="Buy or Sell")
    quantity: float = Field(..., gt=0, description="Number of shares")
    orderType: OrderMode = Field(..., description="Market or Limit order")
    price: float = Field(None, description="Limit price (required for limit orders)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "AAPL",
                "type": "BUY",
                "quantity": 10,
                "orderType": "MARKET"
            }
        }

class OrderResponse(BaseModel):
    """Response model for order"""
    id: str
    symbol: str
    type: str
    quantity: float
    price: float
    orderType: str
    status: str
    createdAt: str

class PaperBotStartRequest(BaseModel):
    initialCash: Decimal = Field(Decimal("1000"), gt=0, le=100000000)
    maxPositions: int = Field(5, ge=1, le=50)
    intervalSeconds: int = Field(10, ge=10, le=3600)
    includeStocks: bool = True
    includeCrypto: bool = True


@router.get("/bot/status")
async def get_paper_bot_status():
    """Return the current account, positions, saved trade history and activity log."""
    return paper_trading_bot.status()


@router.get("/bot/trades")
async def get_paper_bot_trades(limit: int = Query(500, ge=1, le=5000), run_id: int | None = Query(None, alias="runId")):
    """Saved paper trades across all runs, newest first, with the reason for each one."""
    return paper_trading_bot.list_trades(limit, run_id)


@router.post("/bot/start")
async def start_paper_bot(request: PaperBotStartRequest):
    """Start a new paper run; this endpoint never submits broker orders."""
    try:
        paper_trading_bot.start(
            starting_cash=request.initialCash,
            max_positions=request.maxPositions,
            interval_seconds=request.intervalSeconds,
            include_stocks=request.includeStocks,
            include_crypto=request.includeCrypto,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return paper_trading_bot.status()


@router.post("/bot/stop")
async def stop_paper_bot():
    """Stop future paper evaluations without liquidating the simulated position."""
    paper_trading_bot.stop()
    return paper_trading_bot.status()

# Mock trade history
mock_trades = [
    {
        "id": "1",
        "portfolioId": "1",
        "symbol": "AAPL",
        "type": "BUY",
        "quantity": 50,
        "price": 180.00,
        "totalAmount": 9000.00,
        "status": "EXECUTED",
        "executedAt": "2024-01-14T09:30:00",
        "createdAt": "2024-01-14T09:25:00"
    },
    {
        "id": "2",
        "portfolioId": "1",
        "symbol": "GOOGL",
        "type": "BUY",
        "quantity": 30,
        "price": 140.00,
        "totalAmount": 4200.00,
        "status": "EXECUTED",
        "executedAt": "2024-01-13T10:15:00",
        "createdAt": "2024-01-13T10:10:00"
    }
]

@router.post("/place-order", response_model=OrderResponse)
async def place_order(
    order_data: PlaceOrderRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Place a new trade order
    
    Args:
        order_data: Order details
        db: Database session
    
    Returns:
        OrderResponse: Created order details
    """
    try:
        # Validate limit orders have a price
        if order_data.orderType == OrderMode.LIMIT and not order_data.price:
            raise HTTPException(status_code=400, detail="Price required for limit orders")
        
        # In production, create trade in database
        new_order = {
            "id": "new_order_id",
            "symbol": order_data.symbol,
            "type": order_data.type,
            "quantity": order_data.quantity,
            "price": order_data.price or 0,
            "orderType": order_data.orderType,
            "status": "PENDING",
            "createdAt": "2024-01-15T10:30:00"
        }
        
        logger.info(f"Order placed: {order_data.symbol} {order_data.type} {order_data.quantity}")
        return new_order
    except Exception as e:
        logger.error(f"Error placing order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_trade_history(db: Session = Depends(get_db)):
    """
    Get trade history for the portfolio
    
    Returns:
        dict: List of trades
    """
    try:
        # In production, fetch from database
        return mock_trades
    except Exception as e:
        logger.error(f"Error fetching trade history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance")
async def get_trade_performance(db: Session = Depends(get_db)):
    """
    Get trading performance metrics
    
    Returns:
        dict: Performance statistics
    """
    try:
        return {
            "totalTrades": len(mock_trades),
            "winningTrades": 1,
            "loosingTrades": 0,
            "winRate": 100.0,
            "avgWin": 775.00,
            "avgLoss": 0,
            "profitFactor": float('inf'),
            "totalProfit": 775.00
        }
    except Exception as e:
        logger.error(f"Error fetching trade performance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cancel/{order_id}")
async def cancel_order(order_id: str, db: Session = Depends(get_db)):
    """
    Cancel a pending order
    
    Args:
        order_id: Order ID to cancel
        db: Database session
    
    Returns:
        dict: Cancellation result
    """
    try:
        logger.info(f"Cancelling order: {order_id}")
        return {"message": f"Order {order_id} cancelled successfully"}
    except Exception as e:
        logger.error(f"Error cancelling order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

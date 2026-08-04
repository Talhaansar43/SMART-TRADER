"""
File Purpose: Portfolio API routes for retrieving portfolio data and metrics
Last Updated: 28 July 2026
Dependencies: fastapi, sqlalchemy
Related Files: app/models/portfolio.py, app/services/portfolio_service.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Mock data for demonstration
mock_portfolio = {
    "id": "1",
    "userId": "1",
    "totalValue": 50000.00,
    "availableCash": 15000.00,
    "investedCapital": 35000.00,
    "seedCapital": 50000.00,
    "dailyPnL": 1200.00,
    "weeklyPnL": 3500.00,
    "totalPnL": 5000.00,
    "pnlPercentage": 10.0,
    "lastUpdated": "2024-01-15T10:30:00"
}

mock_holdings = [
    {
        "id": "1",
        "portfolioId": "1",
        "symbol": "AAPL",
        "quantity": 50,
        "averagePrice": 180.00,
        "currentPrice": 195.50,
        "totalCost": 9000.00,
        "currentValue": 9775.00,
        "pnL": 775.00,
        "pnlPercentage": 8.6,
        "lastUpdated": "2024-01-15T10:30:00"
    },
    {
        "id": "2",
        "portfolioId": "1",
        "symbol": "GOOGL",
        "quantity": 30,
        "averagePrice": 140.00,
        "currentPrice": 152.75,
        "totalCost": 4200.00,
        "currentValue": 4582.50,
        "pnL": 382.50,
        "pnlPercentage": 9.1,
        "lastUpdated": "2024-01-15T10:30:00"
    }
]

@router.get("/summary")
async def get_portfolio_summary(db: Session = Depends(get_db)):
    """
    Get portfolio summary including total value and P&L metrics
    
    Returns:
        dict: Portfolio summary data
    """
    try:
        # In production, fetch from database
        return mock_portfolio
    except Exception as e:
        logger.error(f"Error fetching portfolio summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/holdings")
async def get_holdings(db: Session = Depends(get_db)):
    """
    Get all current holdings for the portfolio
    
    Returns:
        dict: List of holdings with valuations
    """
    try:
        # In production, fetch from database
        return mock_holdings
    except Exception as e:
        logger.error(f"Error fetching holdings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/capital")
async def get_capital_status(db: Session = Depends(get_db)):
    """
    Get seed capital and allocation status
    
    Returns:
        dict: Capital tracking data
    """
    try:
        return {
            "seedCapital": mock_portfolio["seedCapital"],
            "investedCapital": mock_portfolio["investedCapital"],
            "availableCash": mock_portfolio["availableCash"],
            "investedPercentage": (mock_portfolio["investedCapital"] / mock_portfolio["seedCapital"]) * 100,
            "availablePercentage": (mock_portfolio["availableCash"] / mock_portfolio["seedCapital"]) * 100
        }
    except Exception as e:
        logger.error(f"Error fetching capital status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance")
async def get_performance_metrics(db: Session = Depends(get_db)):
    """
    Get detailed performance metrics
    
    Returns:
        dict: Performance data including daily, weekly, and total P&L
    """
    try:
        return {
            "dailyPnL": mock_portfolio["dailyPnL"],
            "weeklyPnL": mock_portfolio["weeklyPnL"],
            "totalPnL": mock_portfolio["totalPnL"],
            "pnlPercentage": mock_portfolio["pnlPercentage"],
            "sharpeRatio": 1.25,  # Mock value
            "maxDrawdown": -5.2,  # Mock value
            "winRate": 65.5  # Mock value
        }
    except Exception as e:
        logger.error(f"Error fetching performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

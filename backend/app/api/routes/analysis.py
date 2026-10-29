"""
File Purpose: Analysis API routes for AI-powered suggestions and rebalancing
Last Updated: 28 July 2026
Dependencies: fastapi, openai, langchain
Related Files: app/services/analysis_service.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.market_service import get_stock_fundamentals, get_stock_history, get_stock_price
from app.services.strategy_service import analyze_stock_history, evaluate_sma_crossover
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/signals/evaluate")
async def evaluate_signal(
    symbol: str = Query(..., min_length=1, max_length=12)
):
    """Evaluate and log a read-only SMA baseline for a single symbol."""
    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol or any(
        not (character.isalnum() or character in ".-")
        for character in normalized_symbol
    ):
        raise HTTPException(status_code=422, detail="Invalid stock symbol")

    history = get_stock_history(normalized_symbol, days=365)
    return evaluate_sma_crossover(normalized_symbol, history)


@router.get("/stocks/analyze")
async def analyze_stock(
    symbol: str = Query(..., min_length=1, max_length=12)
):
    """Return verified technical analysis and optional live company data."""
    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol or any(
        not (character.isalnum() or character in ".-")
        for character in normalized_symbol
    ):
        raise HTTPException(status_code=422, detail="Invalid stock symbol")

    history = get_stock_history(normalized_symbol, days=400)
    quote = get_stock_price(normalized_symbol)
    fundamentals = get_stock_fundamentals(normalized_symbol)
    return analyze_stock_history(normalized_symbol, history, quote, fundamentals)

# Mock data
mock_suggestions = [
    {
        "id": "1",
        "portfolioId": "1",
        "type": "BUY",
        "symbol": "MSFT",
        "reason": "Strong quarterly earnings and upward momentum",
        "targetPrice": 380.00,
        "riskLevel": "MEDIUM",
        "potentialReturn": 12.5,
        "confidence": 0.85,
        "createdAt": "2024-01-15T10:30:00"
    },
    {
        "id": "2",
        "portfolioId": "1",
        "type": "REBALANCE",
        "symbol": "AAPL",
        "reason": "Position size exceeds 25% threshold",
        "riskLevel": "LOW",
        "potentialReturn": 8.0,
        "confidence": 0.92,
        "createdAt": "2024-01-15T10:30:00"
    }
]

mock_rebalance = {
    "portfolioId": "1",
    "recommendation": "Reduce AAPL exposure and increase cash position",
    "targetAllocation": {
        "AAPL": 20,
        "GOOGL": 20,
        "MSFT": 20,
        "Cash": 40
    },
    "currentAllocation": {
        "AAPL": 35,
        "GOOGL": 25,
        "MSFT": 15,
        "Cash": 25
    },
    "expectedReturn": 11.5,
    "risk": 8.2,
    "sharpeRatio": 1.40
}

@router.get("/suggestions")
async def get_analysis_suggestions(db: Session = Depends(get_db)):
    """
    Get AI-powered trading suggestions based on portfolio analysis
    
    Returns:
        dict: List of trading suggestions with confidence scores
    """
    try:
        # In production, call OpenAI API via LangChain
        return mock_suggestions
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rebalance")
async def get_rebalance_analysis(db: Session = Depends(get_db)):
    """
    Get portfolio rebalancing recommendations
    
    Returns:
        dict: Rebalancing analysis with target allocations
    """
    try:
        # In production, perform optimization calculations
        return mock_rebalance
    except Exception as e:
        logger.error(f"Error getting rebalance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/weekly-plan")
async def generate_weekly_plan(db: Session = Depends(get_db)):
    """
    Generate weekly trading plan using AI analysis
    
    Returns:
        dict: Weekly plan with actionable recommendations
    """
    try:
        plan = {
            "week": "2024-W03",
            "objectives": [
                "Increase MSFT position by 15%",
                "Take profits on GOOGL (+10% gain)",
                "Build cash reserves to 40%"
            ],
            "riskAssessment": "MEDIUM",
            "expectedReturn": 11.5,
            "keyTriggers": [
                "MSFT Q4 earnings on Jan 30",
                "Fed decision on Jan 31",
                "Tech sector rotation signals"
            ]
        }
        return plan
    except Exception as e:
        logger.error(f"Error generating weekly plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/risk-assessment")
async def get_risk_assessment(db: Session = Depends(get_db)):
    """
    Get detailed risk assessment of current portfolio
    
    Returns:
        dict: Risk metrics and analysis
    """
    try:
        risk_data = {
            "overallRiskScore": 6.5,  # Out of 10
            "volatility": 18.2,  # Annualized %
            "betaToMarket": 1.1,
            "sharpeRatio": 1.25,
            "maxDrawdown": -12.5,  # %
            "valueAtRisk": -2500,  # 95% confidence
            "recommendedAction": "HOLD",
            "diversificationScore": 0.78,  # 0-1 scale
            "sectorConcentration": {
                "Technology": 65,
                "Healthcare": 20,
                "Cash": 15
            }
        }
        return risk_data
    except Exception as e:
        logger.error(f"Error getting risk assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

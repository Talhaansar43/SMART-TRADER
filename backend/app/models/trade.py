"""
File Purpose: SQLAlchemy Trade model
Last Updated: 28 July 2026
Dependencies: sqlalchemy
Related Files: app/models/portfolio.py, app/api/routes/trades.py
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from datetime import datetime
from enum import Enum as PyEnum
from app.database import Base

class TradeType(str, PyEnum):
    """Enumeration for trade types"""
    BUY = "BUY"
    SELL = "SELL"

class TradeStatus(str, PyEnum):
    """Enumeration for trade statuses"""
    PENDING = "PENDING"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class Trade(Base):
    """Trade model for recording all transactions"""
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)  # Stock symbol
    
    # Trade details
    type = Column(Enum(TradeType), nullable=False)  # BUY or SELL
    quantity = Column(Float, nullable=False)  # Number of shares
    price = Column(Float, nullable=False)  # Price per share at execution
    total_amount = Column(Float, nullable=False)  # quantity * price
    
    # Status and execution
    status = Column(Enum(TradeStatus), default=TradeStatus.PENDING, nullable=False)
    executed_at = Column(DateTime)  # Actual execution time
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Trade(id={self.id}, symbol={self.symbol}, type={self.type}, status={self.status})>"

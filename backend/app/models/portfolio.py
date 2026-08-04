"""
File Purpose: SQLAlchemy Portfolio model
Last Updated: 28 July 2026
Dependencies: sqlalchemy
Related Files: app/models/user.py, app/models/holding.py
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Portfolio(Base):
    """Portfolio model for tracking user's investment portfolio"""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Capital tracking
    seed_capital = Column(Float, nullable=False)  # Initial investment
    available_cash = Column(Float, nullable=False)  # Liquid cash
    invested_capital = Column(Float, default=0)  # Amount invested in stocks
    
    # Performance metrics
    total_value = Column(Float, default=0)  # Total portfolio value
    daily_pnl = Column(Float, default=0)  # Daily profit/loss
    weekly_pnl = Column(Float, default=0)  # Weekly profit/loss
    total_pnl = Column(Float, default=0)  # Total profit/loss
    pnl_percentage = Column(Float, default=0)  # P&L as percentage
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Portfolio(id={self.id}, user_id={self.user_id}, total_value={self.total_value})>"

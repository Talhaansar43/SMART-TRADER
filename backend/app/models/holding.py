"""
File Purpose: SQLAlchemy Holding model
Last Updated: 28 July 2026
Dependencies: sqlalchemy
Related Files: app/models/portfolio.py, app/models/trade.py
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Holding(Base):
    """Holding model for tracking current stock positions"""
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)  # Stock symbol (e.g., AAPL)
    
    # Position details
    quantity = Column(Float, nullable=False)  # Number of shares
    average_price = Column(Float, nullable=False)  # Average cost basis
    current_price = Column(Float, nullable=False)  # Latest market price
    
    # Valuation
    total_cost = Column(Float, nullable=False)  # Total amount invested
    current_value = Column(Float, nullable=False)  # Current market value
    pnl = Column(Float, default=0)  # Profit/Loss amount
    pnl_percentage = Column(Float, default=0)  # Profit/Loss percentage
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Holding(id={self.id}, portfolio_id={self.portfolio_id}, symbol={self.symbol})>"

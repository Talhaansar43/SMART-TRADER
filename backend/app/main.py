"""
File Purpose: FastAPI application configuration and initialization
Last Updated: 28 July 2026
Dependencies: fastapi, sqlalchemy, python-dotenv
Related Files: app/api/routes/*.py, app/models/*.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routes
from app.api.routes import market, portfolio, trades, analysis

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Smart Trader API starting up...")
    yield
    # Shutdown
    logger.info("Smart Trader API shutting down...")

# Create FastAPI instance
app = FastAPI(
    title="Smart Trader API",
    description="Daily trading application API for portfolio management and trading operations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*"]  # Update in production
)

# Include routers
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(trades.router, prefix="/api/trades", tags=["Trading"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """API health check endpoint"""
    return {"status": "ok", "message": "Smart Trader API is running"}

@app.get("/", tags=["Root"])
async def root():
    """API root endpoint with documentation link"""
    return {
        "message": "Smart Trader API",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

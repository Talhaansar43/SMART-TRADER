#!/bin/bash

# Smart Trader - Backend Startup Script
# This script starts the FastAPI development server

set -e

echo "🚀 Starting Smart Trader Backend..."
echo ""

BACKEND_DIR="$(dirname "$0")/backend"
cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3.11 -m venv venv
    echo "📥 Installing dependencies..."
    ./venv/bin/pip install -r requirements.txt
fi

echo "✨ Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Export Finnhub API key
export FINNHUB_API_KEY="d2rfajhr01qv11lec7u0d2rfajhr01qv11lec7ug"

./venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

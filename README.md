# Smart Trader - Daily Trading Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-blue.svg)]()

A full-stack daily trading application that helps individual investors manage portfolios, execute trades, and optimize profits with AI-powered insights.

## 🎯 Features

### ✅ Dashboard Overview
- Real-time portfolio metrics (total value, P&L, cash reserves)
- Daily/Weekly/Monthly P&L tracking
- Holdings distribution visualization
- Performance indicators (Sharpe ratio, max drawdown)

### 💼 Portfolio Management
- Current holdings with real-time valuations
- Complete trade history with filters
- Capital allocation tracking
- Position-level P&L analysis

### 🏪 Trading Execution
- Market orders (execute at current price)
- Limit orders (execute at specified price)
- Active order tracking
- Order cancellation

### 🤖 AI-Powered Analysis
- Trading suggestions based on historical performance
- Portfolio rebalancing recommendations
- Weekly trading plans with actionable insights
- Risk assessment and metrics

### 📈 Market Data
- **Real-time stock prices (Finnhub API)** ✅
- Historical price data (mock data for demo)
- Company information and key metrics
- Multi-symbol search
- Redis caching (5-minute TTL)
- Automatic fallback to mock data

## 🏗️ Technology Stack

### Frontend
```
Framework:       Next.js 14 (App Router)
Styling:         Tailwind CSS
UI Components:   Shadcn/UI
Charts:          Recharts
Tables:          TanStack Table v8
Forms:           React Hook Form + Zod
State Mgmt:      React Query + Zustand
HTTP:            Axios
TypeScript:      5.3.3
```

### Backend
```
Framework:       FastAPI
Language:        Python 3.11+
Database:        PostgreSQL 14+
ORM:             SQLAlchemy 2.0
Market Data:     Finnhub API (Real-time) ✅
AI/LLM:          OpenAI + LangChain
Cache/Queue:     Redis + Celery
```

## 📁 Project Structure

```
smart-trader/
├── frontend/                  # Next.js 14 React Application
│   ├── app/                   # App Router pages
│   │   ├── (dashboard)/       # Dashboard overview
│   │   ├── (portfolio)/       # Portfolio management
│   │   └── (trades)/          # Trade execution
│   ├── components/            # Reusable React components
│   ├── lib/                   # Hooks, API client, utilities
│   ├── types/                 # TypeScript interfaces
│   └── package.json
│
├── backend/                   # FastAPI Python Application
│   ├── app/
│   │   ├── api/routes/        # API endpoints
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── services/          # Business logic (future)
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py          # Settings
│   │   └── database.py        # Database setup
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment template
│
└── docs/                      # Documentation
    ├── context_project.md     # Project documentation
    ├── ARCHITECTURE.md        # System architecture
    └── DATABASE_SCHEMA.md     # Database schema
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **Python** 3.11+ ([Download](https://python.org))
- **PostgreSQL** 14+ ([Download](https://postgresql.org))
- **Redis** ([Download](https://redis.io))

### Frontend Setup (5 minutes)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev

# Open browser
# http://localhost:3000
```

### Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# or
python -m venv venv && venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Update .env with your PostgreSQL credentials
nano .env

# Initialize database
python -c "from app.database import init_db; init_db()"

# Start API server
python main.py

# Open browser for API docs
# http://localhost:8000/docs
```

### Database Setup (PostgreSQL)

```bash
# Create database
sudo -u postgres createdb smart_trader

# Create user
sudo -u postgres psql -c "CREATE USER smarttrader WITH PASSWORD 'smarttrader123';"

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smart_trader TO smarttrader;"
```

## 📚 Documentation

### Core Documents
- **[Project Context](./docs/context_project.md)** - Complete project overview and feature documentation
- **[Architecture Diagram](./docs/ARCHITECTURE.md)** - System design and data flow diagrams
- **[Database Schema](./docs/DATABASE_SCHEMA.md)** - Complete database structure

### Implementation Guides
- **[Finnhub Integration](./FINNHUB_INTEGRATION.md)** - Real-time market data setup ⭐ **START HERE**
- **[System Complete](./SYSTEM_COMPLETE.md)** - Full system overview and status
- **[Caching Implementation](./CACHING_IMPLEMENTATION.md)** - Redis caching with mock data fallback
- **[Rate Limit Solutions](./RATE_LIMIT_SOLUTIONS.md)** - Solutions for handling API rate limits
- **[Data Sources](./DATA_SOURCES.md)** - Live vs mock data documentation
- **[Application Status](./APPLICATION_STATUS.md)** - Current system status and features
- **[Quickstart Guide](./QUICKSTART.md)** - Getting started instructions

### API Documentation
When backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔗 API Endpoints

### Market Data
```
GET  /api/market/price?symbol=AAPL
GET  /api/market/history?symbol=AAPL&days=30
GET  /api/market/search?query=apple
```

### Portfolio
```
GET  /api/portfolio/summary
GET  /api/portfolio/holdings
GET  /api/portfolio/capital
GET  /api/portfolio/performance
```

### Trading
```
POST /api/trades/place-order
GET  /api/trades/history
GET  /api/trades/performance
DELETE /api/trades/cancel/{order_id}
```

### Analysis
```
GET  /api/analysis/suggestions
GET  /api/analysis/rebalance
POST /api/analysis/weekly-plan
GET  /api/analysis/risk-assessment
```

## 🎯 Roadmap

### Phase 1: MVP (Current)
- ✅ Dashboard UI
- ✅ Portfolio tracking
- ✅ Trade execution
- ✅ Market data integration
- ✅ AI suggestions
- ⏳ API integration complete

### Phase 2: Enhancement
- [ ] User authentication (JWT)
- [ ] Real broker integration (Alpaca, Robinhood)
- [ ] Email/SMS notifications
- [ ] Advanced charting (candlesticks, indicators)
- [ ] Backtesting engine

### Phase 3: Scale
- [ ] Mobile app (React Native)
- [ ] WebSocket real-time updates
- [ ] Advanced ML predictions
- [ ] Social features
- [ ] Multi-currency support

## 🐛 Troubleshooting

### Frontend Issues

**Port 3000 already in use**
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend Issues

**PostgreSQL connection error**
- Check DATABASE_URL in .env
- Verify PostgreSQL is running: `sudo service postgresql status`
- Verify database exists: `psql -l`

**Port 8000 already in use**
```bash
# Kill process on port 8000
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

## 📖 File Documentation Standard

Every file includes:
```python
"""
File Purpose: [What the file does]
Last Updated: [Date]
Dependencies: [External libraries]
Related Files: [Other relevant files]
"""
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

**Last Updated**: 28 July 2026  
**Maintained by**: Smart Trader Development Team
# 📈 Paper Trading Pro - AI-Powered Paper Trading Platform

A full-stack simulated stock trading platform built with React, FastAPI, real-time WebSockets, and AI-driven stock predictions (LSTM).

## 🚀 Features

- **Real-Time Market Data**: Live prices for Indian (NSE) and US (NASDAQ/NYSE) stocks via WebSockets.
- **Virtual Paper Trading**: Complete simulated trading environment with ₹1,00,000 starting cash.
- **AI Predictions**: Integrated TensorFlow LSTM engine to predict stock trends and provide confidence intervals.
- **Portfolio Tracking**: Real-time holding values, P&L calculations, and asset allocation pie charts.
- **Admin Panel**: Manage users, monitor platform transactions, and adjust simulation rules (fees, slippage).
- **Beautiful UI**: Modern, glass-morphism dark mode UI utilizing TailwindCSS and Recharts.

---

## 🛠 Tech Stack

- **Frontend**: React.js (Vite), TailwindCSS, Recharts, Lucide Icons
- **Backend**: Python, FastAPI, SQLAlchemy (Async), WebSocket (Native)
- **Database**: SQLite (Async) for development (easily mapped to PostgreSQL)
- **AI/ML**: TensorFlow, Keras, scikit-learn, yfinance
- **Authentication**: JWT Bearer Tokens with bcrypt hashing

---

## 🏗 Getting Started

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows

# Install dependencies
pip install -r requirements.txt

# Run the backend server (This will automatically create the DB and default admin)
uvicorn main:app --reload
```
*Note: The backend runs on `http://localhost:8000`*

**Default Admin**:
- Email: `admin@papertradingpro.com`
- Password: `admin123`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
*Note: The frontend runs on `http://localhost:5173` and proxies `/api` and `/ws` to the backend.*

### 3. AI Model Training (Optional)

You can train specific LSTM models for stocks you are interested in. If a model is not found, the system uses technical indicators as a fallback.

```bash
cd backend
python -m ai_service.training.train_model --symbol AAPL --epochs 50
python -m ai_service.training.train_model --symbol RELIANCE.NS --epochs 50
```

---

## 📁 System Architecture

```
stock-trading/
├── backend/                  # FastAPI Application
│   ├── ai_service/           # Prediction engine & training pipelines
│   ├── app/
│   │   ├── api/routes/       # REST and WebSocket endpoints
│   │   ├── core/             # config, db, security
│   │   ├── models/           # SQLAlchemy DB schema
│   │   ├── schemas/          # Pydantic validation
│   │   └── services/         # Trading engine, Stock fetcher
│   └── main.py               # Entry point
│
└── frontend/                 # React UI
    ├── src/
    │   ├── api.js            # Axios client
    │   ├── components/       # Layout, Sidebar, Header
    │   ├── context/          # JWT Context
    │   ├── hooks/            # useWebSocket
    │   └── pages/            # Dashboard, Portfolio, Admin, etc.
    └── tailwind.config.js    # Custom dark mode UI theme
```

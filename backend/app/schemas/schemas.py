"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    balance: float
    role: str
    is_blocked: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Stock Schemas ─────────────────────────────────────────────
class StockQuote(BaseModel):
    symbol: str
    name: str = ""
    market: str = ""
    price: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0
    volume: float = 0
    day_high: float = 0.0
    day_low: float = 0.0
    open_price: float = 0.0
    prev_close: float = 0.0
    market_cap: float = 0.0
    sector: str = ""
    last_updated: Optional[datetime] = None


class StockHistory(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


# ── Trading Schemas ───────────────────────────────────────────
class TradeRequest(BaseModel):
    symbol: str
    quantity: int = Field(..., gt=0)
    type: str = Field(..., pattern="^(BUY|SELL)$")


class TradeResponse(BaseModel):
    message: str
    transaction_id: int
    symbol: str
    type: str
    quantity: int
    price: float
    total_amount: float
    fee: float
    new_balance: float


# ── Portfolio Schemas ─────────────────────────────────────────
class HoldingResponse(BaseModel):
    symbol: str
    quantity: int
    avg_price: float
    current_price: float = 0.0
    pnl: float = 0.0
    pnl_percent: float = 0.0
    total_value: float = 0.0


class PortfolioSummary(BaseModel):
    available_balance: float
    invested_amount: float
    current_value: float
    total_pnl: float
    total_pnl_percent: float
    holdings: List[HoldingResponse]


# ── Transaction Schemas ───────────────────────────────────────
class TransactionResponse(BaseModel):
    id: int
    symbol: str
    type: str
    quantity: int
    price: float
    total_amount: float
    fee: float
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Watchlist Schemas ─────────────────────────────────────────
class WatchlistAdd(BaseModel):
    symbol: str


class WatchlistItem(BaseModel):
    symbol: str
    price: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0


# ── AI Prediction Schemas ────────────────────────────────────
class PredictionResponse(BaseModel):
    symbol: str
    prediction: str  # "UP" or "DOWN"
    confidence: float
    predicted_price: float
    current_price: float
    indicators: dict = {}


# ── Admin Schemas ─────────────────────────────────────────────
class AdminDashboard(BaseModel):
    total_users: int
    active_users: int
    total_trades: int
    total_volume: float
    most_traded: List[dict]
    trading_enabled: bool


class AdminUserUpdate(BaseModel):
    is_blocked: Optional[bool] = None
    balance: Optional[float] = None
    role: Optional[str] = None


class AdminSettings(BaseModel):
    transaction_fee_percent: Optional[float] = None
    slippage_percent: Optional[float] = None
    trading_enabled: Optional[bool] = None

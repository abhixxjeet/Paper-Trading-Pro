"""Stock-related database models."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class StockCache(Base):
    """Cached stock price data."""
    __tablename__ = "stock_cache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(200), default="")
    market = Column(String(20), default="")  # NSE, NYSE, NASDAQ
    price = Column(Float, default=0.0)
    change = Column(Float, default=0.0)
    change_percent = Column(Float, default=0.0)
    volume = Column(Float, default=0)
    day_high = Column(Float, default=0.0)
    day_low = Column(Float, default=0.0)
    open_price = Column(Float, default=0.0)
    prev_close = Column(Float, default=0.0)
    market_cap = Column(Float, default=0.0)
    sector = Column(String(100), default="")
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Portfolio(Base):
    """User stock holdings."""
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    quantity = Column(Integer, default=0)
    avg_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="portfolio")


class Transaction(Base):
    """Trade transaction records."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    type = Column(String(10), nullable=False)  # BUY or SELL
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    fee = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")


class Watchlist(Base):
    """User watchlist for tracking stocks."""
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="watchlist")

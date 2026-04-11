"""Core configuration module."""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./stock_trading.db")

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Stock API
    YAHOO_FINANCE_ENABLED: bool = os.getenv("YAHOO_FINANCE_ENABLED", "true").lower() == "true"
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")

    # App defaults
    DEFAULT_BALANCE: float = float(os.getenv("DEFAULT_BALANCE", "100000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Trading rules
    TRANSACTION_FEE_PERCENT: float = float(os.getenv("TRANSACTION_FEE_PERCENT", "0.1"))
    SLIPPAGE_PERCENT: float = float(os.getenv("SLIPPAGE_PERCENT", "0.05"))
    TRADING_ENABLED: bool = os.getenv("TRADING_ENABLED", "true").lower() == "true"


settings = Settings()

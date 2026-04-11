"""Stock data service - fetches real-time and historical data from Yahoo Finance."""
import yfinance as yf
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

# ── In-memory cache (Redis replacement for dev) ──────────────
_stock_cache: Dict[str, dict] = {}
_cache_expiry: Dict[str, datetime] = {}
CACHE_TTL_SECONDS = 30  # Cache for 30 seconds

# ── Stock Lists ──────────────────────────────────────────────
INDIAN_STOCKS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS",
    "LT.NS", "HCLTECH.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "SUNPHARMA.NS", "TITAN.NS", "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS",
    "NESTLEIND.NS", "TATAMOTORS.NS", "TATASTEEL.NS", "POWERGRID.NS", "NTPC.NS",
    "ADANIENT.NS", "ADANIPORTS.NS", "TECHM.NS", "JSWSTEEL.NS", "ONGC.NS",
]

US_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "BRK-B", "UNH", "JNJ",
    "V", "JPM", "PG", "MA", "HD",
    "DIS", "NFLX", "PYPL", "ADBE", "CRM",
    "INTC", "AMD", "QCOM", "CSCO", "PEP",
    "KO", "NKE", "MCD", "WMT", "COST",
]

# Market metadata
MARKET_INFO = {
    ".NS": {"market": "NSE", "currency": "INR", "country": "India"},
    ".BO": {"market": "BSE", "currency": "INR", "country": "India"},
    "DEFAULT": {"market": "NASDAQ/NYSE", "currency": "USD", "country": "US"},
}


def _get_market_info(symbol: str) -> dict:
    """Determine market info from symbol suffix."""
    for suffix, info in MARKET_INFO.items():
        if suffix != "DEFAULT" and symbol.endswith(suffix):
            return info
    return MARKET_INFO["DEFAULT"]


def _clean_symbol_for_display(symbol: str) -> str:
    """Remove exchange suffix for display."""
    for suffix in [".NS", ".BO"]:
        if symbol.endswith(suffix):
            return symbol.replace(suffix, "")
    return symbol


async def fetch_stock_quote(symbol: str) -> Optional[dict]:
    """Fetch real-time quote for a single stock."""
    # Check cache first
    if symbol in _stock_cache and symbol in _cache_expiry:
        if datetime.now(timezone.utc) < _cache_expiry[symbol]:
            return _stock_cache[symbol]

    try:
        # Run blocking yfinance call in thread pool
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, yf.Ticker, symbol)
        info = await loop.run_in_executor(None, lambda: ticker.fast_info)

        market_info = _get_market_info(symbol)

        # Build normalized quote
        try:
            last_price = float(info.last_price) if hasattr(info, 'last_price') else 0.0
        except Exception:
            last_price = 0.0

        try:
            prev_close = float(info.previous_close) if hasattr(info, 'previous_close') else last_price
        except Exception:
            prev_close = last_price

        change = last_price - prev_close
        change_pct = (change / prev_close * 100) if prev_close > 0 else 0.0

        try:
            market_cap = float(info.market_cap) if hasattr(info, 'market_cap') else 0.0
        except Exception:
            market_cap = 0.0

        # Get full info for name and sector (cached by yfinance)
        try:
            full_info = await loop.run_in_executor(None, lambda: ticker.info)
            name = full_info.get("shortName", _clean_symbol_for_display(symbol))
            sector = full_info.get("sector", "")
            day_high = full_info.get("dayHigh", 0.0) or 0.0
            day_low = full_info.get("dayLow", 0.0) or 0.0
            open_price = full_info.get("open", 0.0) or 0.0
            volume = full_info.get("volume", 0) or 0
        except Exception:
            name = _clean_symbol_for_display(symbol)
            sector = ""
            day_high = 0.0
            day_low = 0.0
            open_price = 0.0
            volume = 0

        quote = {
            "symbol": symbol,
            "name": name,
            "market": market_info["market"],
            "price": round(last_price, 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
            "volume": volume,
            "day_high": round(day_high, 2),
            "day_low": round(day_low, 2),
            "open_price": round(open_price, 2),
            "prev_close": round(prev_close, 2),
            "market_cap": market_cap,
            "sector": sector,
            "currency": market_info["currency"],
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

        # Update cache
        _stock_cache[symbol] = quote
        _cache_expiry[symbol] = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SECONDS)

        return quote

    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        # Return cached data if available
        if symbol in _stock_cache:
            return _stock_cache[symbol]
        return None


async def fetch_multiple_quotes(symbols: List[str]) -> List[dict]:
    """Fetch quotes for multiple stocks concurrently."""
    tasks = [fetch_stock_quote(s) for s in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    quotes = []
    for r in results:
        if isinstance(r, dict):
            quotes.append(r)
    return quotes


async def fetch_stock_history(symbol: str, period: str = "1mo") -> List[dict]:
    """Fetch historical OHLCV data for a stock.

    Args:
        symbol: Stock ticker symbol
        period: Time period - 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y
    """
    try:
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, yf.Ticker, symbol)

        # Map period to interval
        interval_map = {
            "1d": "5m",
            "5d": "15m",
            "1mo": "1d",
            "3mo": "1d",
            "6mo": "1d",
            "1y": "1wk",
            "5y": "1mo",
        }
        interval = interval_map.get(period, "1d")

        df = await loop.run_in_executor(
            None,
            lambda: ticker.history(period=period, interval=interval)
        )

        if df.empty:
            return []

        history = []
        for idx, row in df.iterrows():
            history.append({
                "date": idx.strftime("%Y-%m-%d %H:%M") if interval in ["5m", "15m"] else idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return history

    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        return []


async def search_stocks(query: str) -> List[dict]:
    """Search for stocks by name or symbol."""
    query = query.upper()
    results = []

    all_stocks = INDIAN_STOCKS + US_STOCKS
    for symbol in all_stocks:
        display = _clean_symbol_for_display(symbol)
        if query in display.upper() or query in symbol.upper():
            market_info = _get_market_info(symbol)
            results.append({
                "symbol": symbol,
                "display_symbol": display,
                "market": market_info["market"],
                "currency": market_info["currency"],
            })

    return results[:20]


async def get_live_price(symbol: str) -> float:
    """Get just the current price for a stock (used by trading engine)."""
    quote = await fetch_stock_quote(symbol)
    if quote and quote["price"] > 0:
        return quote["price"]

    # Fallback: try direct fetch
    try:
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, yf.Ticker, symbol)
        info = await loop.run_in_executor(None, lambda: ticker.fast_info)
        return float(info.last_price)
    except Exception:
        return 0.0

"""Stock data API routes."""
from fastapi import APIRouter, Query
from typing import Optional
from app.services.stock_service import (
    fetch_stock_quote,
    fetch_multiple_quotes,
    fetch_stock_history,
    search_stocks,
    INDIAN_STOCKS,
    US_STOCKS,
)

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """Get real-time quote for a stock."""
    quote = await fetch_stock_quote(symbol)
    if not quote:
        return {"error": f"Could not fetch data for {symbol}"}
    return quote


@router.get("/quotes/indian")
async def get_indian_quotes(limit: int = Query(default=15, le=30)):
    """Get quotes for top Indian stocks (NSE)."""
    symbols = INDIAN_STOCKS[:limit]
    return await fetch_multiple_quotes(symbols)


@router.get("/quotes/us")
async def get_us_quotes(limit: int = Query(default=15, le=30)):
    """Get quotes for top US stocks."""
    symbols = US_STOCKS[:limit]
    return await fetch_multiple_quotes(symbols)


@router.get("/quotes/all")
async def get_all_quotes(
    market: Optional[str] = Query(default=None, description="Filter: india, us, or all"),
    limit: int = Query(default=20, le=60),
):
    """Get quotes for all tracked stocks, optionally filtered by market."""
    if market == "india":
        symbols = INDIAN_STOCKS[:limit]
    elif market == "us":
        symbols = US_STOCKS[:limit]
    else:
        combined = (INDIAN_STOCKS + US_STOCKS)[:limit]
        symbols = combined
    return await fetch_multiple_quotes(symbols)


@router.get("/history/{symbol}")
async def get_history(
    symbol: str,
    period: str = Query(default="1mo", description="1d, 5d, 1mo, 3mo, 6mo, 1y, 5y"),
):
    """Get historical OHLCV data for a stock."""
    history = await fetch_stock_history(symbol, period)
    return {"symbol": symbol, "period": period, "data": history}


@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    """Search for stocks by symbol or name."""
    results = await search_stocks(q)
    return results

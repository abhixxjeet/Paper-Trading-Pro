"""Trading API routes - buy/sell operations and portfolio management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.stock import Portfolio, Transaction, Watchlist
from app.services.trading_service import execute_trade, get_portfolio_summary, get_leaderboard, TradingError
from app.services.stock_service import get_live_price
from app.schemas.schemas import TradeRequest

router = APIRouter(prefix="/api/trading", tags=["Trading"])


@router.post("/trade")
async def place_trade(
    trade: TradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute a buy or sell trade."""
    try:
        result = await execute_trade(
            db=db,
            user=current_user,
            symbol=trade.symbol,
            quantity=trade.quantity,
            trade_type=trade.type,
        )
        return result
    except TradingError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/portfolio")
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's portfolio summary with P&L."""
    return await get_portfolio_summary(db, current_user)


@router.get("/transactions")
async def get_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
):
    """Get user's transaction history."""
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.timestamp))
        .limit(limit)
    )
    transactions = result.scalars().all()
    return [
        {
            "id": t.id,
            "symbol": t.symbol,
            "type": t.type,
            "quantity": t.quantity,
            "price": t.price,
            "total_amount": t.total_amount,
            "fee": t.fee,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        }
        for t in transactions
    ]


@router.get("/watchlist")
async def get_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's watchlist with live prices."""
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == current_user.id)
    )
    items = result.scalars().all()

    watchlist = []
    for item in items:
        price = await get_live_price(item.symbol)
        watchlist.append({
            "symbol": item.symbol,
            "price": round(price, 2),
            "added_at": item.added_at.isoformat() if item.added_at else None,
        })
    return watchlist


@router.post("/watchlist/{symbol}")
async def add_to_watchlist(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a stock to watchlist."""
    # Check if already in watchlist
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.symbol == symbol,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Stock already in watchlist")

    item = Watchlist(user_id=current_user.id, symbol=symbol)
    db.add(item)
    await db.commit()
    return {"message": f"{symbol} added to watchlist"}


@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a stock from watchlist."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.symbol == symbol,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Stock not in watchlist")

    await db.delete(item)
    await db.commit()
    return {"message": f"{symbol} removed from watchlist"}


@router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    """Get top traders leaderboard."""
    return await get_leaderboard(db)

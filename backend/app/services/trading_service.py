"""Trading engine - handles buy/sell operations with validation."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.user import User
from app.models.stock import Portfolio, Transaction
from app.services.stock_service import get_live_price
from app.core.config import settings
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


class TradingError(Exception):
    """Custom exception for trading errors."""
    pass


async def execute_trade(
    db: AsyncSession,
    user: User,
    symbol: str,
    quantity: int,
    trade_type: str,  # BUY or SELL
) -> dict:
    """Execute a simulated stock trade.

    Args:
        db: Database session
        user: Current user
        symbol: Stock ticker
        quantity: Number of shares
        trade_type: BUY or SELL

    Returns:
        Trade result dictionary

    Raises:
        TradingError: If trade cannot be executed
    """
    if not settings.TRADING_ENABLED:
        raise TradingError("Trading is currently disabled for maintenance")

    # Get live price
    price = await get_live_price(symbol)
    if price <= 0:
        raise TradingError(f"Could not fetch price for {symbol}. Please try again.")

    # Apply slippage simulation
    slippage = price * (settings.SLIPPAGE_PERCENT / 100)
    if trade_type == "BUY":
        execution_price = round(price + slippage, 2)
    else:
        execution_price = round(price - slippage, 2)

    # Calculate total and fees
    total_amount = round(execution_price * quantity, 2)
    fee = round(total_amount * (settings.TRANSACTION_FEE_PERCENT / 100), 2)

    if trade_type == "BUY":
        return await _execute_buy(db, user, symbol, quantity, execution_price, total_amount, fee)
    else:
        return await _execute_sell(db, user, symbol, quantity, execution_price, total_amount, fee)


async def _execute_buy(
    db: AsyncSession,
    user: User,
    symbol: str,
    quantity: int,
    price: float,
    total_amount: float,
    fee: float,
) -> dict:
    """Execute a buy order."""
    total_cost = total_amount + fee

    # Check sufficient balance
    if user.balance < total_cost:
        raise TradingError(
            f"Insufficient balance. Need ₹{total_cost:.2f} but have ₹{user.balance:.2f}"
        )

    # Deduct balance
    user.balance = round(user.balance - total_cost, 2)

    # Update or create portfolio entry
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.user_id == user.id,
            Portfolio.symbol == symbol,
        )
    )
    holding = result.scalar_one_or_none()

    if holding:
        # Update average price and quantity
        total_invested = (holding.avg_price * holding.quantity) + total_amount
        holding.quantity += quantity
        holding.avg_price = round(total_invested / holding.quantity, 2)
    else:
        # Create new holding
        holding = Portfolio(
            user_id=user.id,
            symbol=symbol,
            quantity=quantity,
            avg_price=price,
        )
        db.add(holding)

    # Record transaction
    transaction = Transaction(
        user_id=user.id,
        symbol=symbol,
        type="BUY",
        quantity=quantity,
        price=price,
        total_amount=total_amount,
        fee=fee,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    return {
        "message": f"Successfully bought {quantity} shares of {symbol}",
        "transaction_id": transaction.id,
        "symbol": symbol,
        "type": "BUY",
        "quantity": quantity,
        "price": price,
        "total_amount": total_amount,
        "fee": fee,
        "new_balance": user.balance,
    }


async def _execute_sell(
    db: AsyncSession,
    user: User,
    symbol: str,
    quantity: int,
    price: float,
    total_amount: float,
    fee: float,
) -> dict:
    """Execute a sell order."""
    # Check if user owns the stock
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.user_id == user.id,
            Portfolio.symbol == symbol,
        )
    )
    holding = result.scalar_one_or_none()

    if not holding or holding.quantity < quantity:
        owned = holding.quantity if holding else 0
        raise TradingError(
            f"Cannot sell {quantity} shares of {symbol}. You own {owned} shares."
        )

    # Credit balance (minus fees)
    net_amount = total_amount - fee
    user.balance = round(user.balance + net_amount, 2)

    # Update portfolio
    holding.quantity -= quantity
    if holding.quantity == 0:
        await db.delete(holding)

    # Record transaction
    transaction = Transaction(
        user_id=user.id,
        symbol=symbol,
        type="SELL",
        quantity=quantity,
        price=price,
        total_amount=total_amount,
        fee=fee,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    return {
        "message": f"Successfully sold {quantity} shares of {symbol}",
        "transaction_id": transaction.id,
        "symbol": symbol,
        "type": "SELL",
        "quantity": quantity,
        "price": price,
        "total_amount": total_amount,
        "fee": fee,
        "new_balance": user.balance,
    }


async def get_portfolio_summary(db: AsyncSession, user: User) -> dict:
    """Get complete portfolio summary with P&L calculations."""
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id, Portfolio.quantity > 0)
    )
    holdings = result.scalars().all()

    portfolio_holdings = []
    total_invested = 0.0
    total_current_value = 0.0

    for h in holdings:
        current_price = await get_live_price(h.symbol)
        invested = h.avg_price * h.quantity
        current_value = current_price * h.quantity
        pnl = current_value - invested
        pnl_percent = (pnl / invested * 100) if invested > 0 else 0.0

        total_invested += invested
        total_current_value += current_value

        portfolio_holdings.append({
            "symbol": h.symbol,
            "quantity": h.quantity,
            "avg_price": round(h.avg_price, 2),
            "current_price": round(current_price, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
            "total_value": round(current_value, 2),
        })

    total_pnl = total_current_value - total_invested
    total_pnl_percent = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0

    return {
        "available_balance": round(user.balance, 2),
        "invested_amount": round(total_invested, 2),
        "current_value": round(total_current_value, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_percent": round(total_pnl_percent, 2),
        "holdings": portfolio_holdings,
    }


async def get_leaderboard(db: AsyncSession, limit: int = 10) -> list:
    """Get top traders by portfolio value."""
    result = await db.execute(
        select(User).where(User.role == "user", User.is_blocked == False).limit(50)
    )
    users = result.scalars().all()

    leaderboard = []
    for u in users:
        # Get portfolio value
        port_result = await db.execute(
            select(Portfolio).where(Portfolio.user_id == u.id, Portfolio.quantity > 0)
        )
        holdings = port_result.scalars().all()

        total_value = u.balance
        for h in holdings:
            price = await get_live_price(h.symbol)
            total_value += price * h.quantity

        # Count trades
        trade_count = await db.execute(
            select(func.count(Transaction.id)).where(Transaction.user_id == u.id)
        )
        trades = trade_count.scalar() or 0

        pnl = total_value - 100000  # Default starting balance

        leaderboard.append({
            "name": u.name,
            "total_value": round(total_value, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round((pnl / 100000) * 100, 2),
            "trades": trades,
        })

    leaderboard.sort(key=lambda x: x["total_value"], reverse=True)
    return leaderboard[:limit]

"""Admin panel API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.core.security import get_current_admin
from app.core.config import settings
from app.models.user import User
from app.models.stock import Transaction, Portfolio
from app.schemas.schemas import AdminUserUpdate, AdminSettings
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get admin dashboard metrics."""
    # Total users
    total_users = await db.execute(select(func.count(User.id)).where(User.role == "user"))
    total = total_users.scalar() or 0

    # Active users (traded in last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_result = await db.execute(
        select(func.count(func.distinct(Transaction.user_id)))
        .where(Transaction.timestamp >= week_ago)
    )
    active = active_result.scalar() or 0

    # Total trades
    trades_result = await db.execute(select(func.count(Transaction.id)))
    total_trades = trades_result.scalar() or 0

    # Total volume
    volume_result = await db.execute(select(func.sum(Transaction.total_amount)))
    total_volume = volume_result.scalar() or 0

    # Most traded stocks
    most_traded_result = await db.execute(
        select(
            Transaction.symbol,
            func.count(Transaction.id).label("trade_count"),
            func.sum(Transaction.total_amount).label("total_volume"),
        )
        .group_by(Transaction.symbol)
        .order_by(desc("trade_count"))
        .limit(10)
    )
    most_traded = [
        {"symbol": row[0], "trades": row[1], "volume": round(float(row[2] or 0), 2)}
        for row in most_traded_result
    ]

    return {
        "total_users": total,
        "active_users": active,
        "total_trades": total_trades,
        "total_volume": round(float(total_volume), 2),
        "most_traded": most_traded,
        "trading_enabled": settings.TRADING_ENABLED,
        "transaction_fee": settings.TRANSACTION_FEE_PERCENT,
        "slippage": settings.SLIPPAGE_PERCENT,
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
    limit: int = 50,
    offset: int = 0,
):
    """List all users with their stats."""
    result = await db.execute(
        select(User)
        .where(User.role == "user")
        .order_by(desc(User.created_at))
        .limit(limit)
        .offset(offset)
    )
    users = result.scalars().all()

    user_list = []
    for u in users:
        # Get trade count
        trade_count = await db.execute(
            select(func.count(Transaction.id)).where(Transaction.user_id == u.id)
        )
        trades = trade_count.scalar() or 0

        user_list.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "balance": round(u.balance, 2),
            "is_blocked": u.is_blocked,
            "trades": trades,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return user_list


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    update: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update user settings (block/unblock, reset balance, change role)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if update.is_blocked is not None:
        user.is_blocked = update.is_blocked
    if update.balance is not None:
        user.balance = update.balance
    if update.role is not None:
        user.role = update.role

    await db.commit()
    return {"message": f"User {user_id} updated successfully"}


@router.post("/users/{user_id}/reset-balance")
async def reset_balance(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Reset a user's demo balance to default."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.balance = settings.DEFAULT_BALANCE
    await db.commit()
    return {"message": f"Balance reset to ₹{settings.DEFAULT_BALANCE}"}


@router.get("/transactions")
async def all_transactions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
    limit: int = 100,
):
    """View all transactions across the platform."""
    result = await db.execute(
        select(Transaction)
        .order_by(desc(Transaction.timestamp))
        .limit(limit)
    )
    transactions = result.scalars().all()
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
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


@router.post("/settings")
async def update_settings(
    update: AdminSettings,
    admin: User = Depends(get_current_admin),
):
    """Update trading simulation settings."""
    if update.transaction_fee_percent is not None:
        settings.TRANSACTION_FEE_PERCENT = update.transaction_fee_percent
    if update.slippage_percent is not None:
        settings.SLIPPAGE_PERCENT = update.slippage_percent
    if update.trading_enabled is not None:
        settings.TRADING_ENABLED = update.trading_enabled

    return {
        "message": "Settings updated",
        "transaction_fee_percent": settings.TRANSACTION_FEE_PERCENT,
        "slippage_percent": settings.SLIPPAGE_PERCENT,
        "trading_enabled": settings.TRADING_ENABLED,
    }

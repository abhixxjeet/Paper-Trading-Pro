"""Main FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.api.routes import auth, stocks, trading, predictions, admin, websocket

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("🚀 Starting Stock Trading Platform...")

    # Initialize database
    await init_db()
    logger.info("✅ Database initialized")

    # Create default admin user
    await _create_default_admin()

    yield

    logger.info("👋 Shutting down...")


async def _create_default_admin():
    """Create default admin account if it doesn't exist."""
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.user import User

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == "admin@papertradingpro.com"))
        if not result.scalar_one_or_none():
            admin = User(
                name="Admin",
                email="admin@papertradingpro.com",
                password=get_password_hash("admin123"),
                balance=1000000,
                role="admin",
            )
            db.add(admin)
            await db.commit()
            logger.info("✅ Default admin created (admin@papertradingpro.com / admin123)")


# Create FastAPI app
app = FastAPI(
    title="Paper Trading Pro - AI Stock Trading Simulator",
    description="AI-powered paper trading platform with real-time market data",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(trading.router)
app.include_router(predictions.router)
app.include_router(admin.router)
app.include_router(websocket.router)


@app.get("/")
async def root():
    """API health check."""
    return {
        "name": "Paper Trading Pro API",
        "version": "1.0.0",
        "status": "running",
        "trading_enabled": settings.TRADING_ENABLED,
    }


@app.get("/api/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "trading_enabled": settings.TRADING_ENABLED,
    }

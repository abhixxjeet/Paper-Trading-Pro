"""AI Prediction API routes."""
from fastapi import APIRouter, Query
from app.services.ai_service import predict_stock, get_top_predictions
from app.services.stock_service import INDIAN_STOCKS, US_STOCKS

router = APIRouter(prefix="/api/ai", tags=["AI Predictions"])


@router.get("/predict/{symbol}")
async def predict(symbol: str):
    """Get AI prediction for a single stock."""
    result = await predict_stock(symbol)
    if not result:
        return {"error": f"Could not generate prediction for {symbol}"}
    return result


@router.get("/recommendations")
async def recommendations(
    market: str = Query(default="all", description="india, us, or all"),
    limit: int = Query(default=10, le=20),
):
    """Get top AI stock recommendations sorted by confidence."""
    if market == "india":
        symbols = INDIAN_STOCKS[:15]
    elif market == "us":
        symbols = US_STOCKS[:15]
    else:
        symbols = (INDIAN_STOCKS[:8] + US_STOCKS[:8])

    predictions = await get_top_predictions(symbols, limit)
    return predictions

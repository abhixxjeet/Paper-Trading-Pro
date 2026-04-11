"""AI Prediction Service using LSTM neural network for stock price prediction."""
import numpy as np
import os
import logging
from typing import Optional, Dict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── In-memory prediction cache ───────────────────────────────
_prediction_cache: Dict[str, dict] = {}
_model_cache: Dict[str, object] = {}

# Model directory
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ai_service", "models")


def compute_rsi(prices: np.ndarray, period: int = 14) -> np.ndarray:
    """Compute Relative Strength Index."""
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)

    avg_gain = np.zeros_like(prices)
    avg_loss = np.zeros_like(prices)

    if len(gains) >= period:
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])

        for i in range(period + 1, len(prices)):
            avg_gain[i] = (avg_gain[i - 1] * (period - 1) + gains[i - 1]) / period
            avg_loss[i] = (avg_loss[i - 1] * (period - 1) + losses[i - 1]) / period

    rs = np.where(avg_loss > 0, avg_gain / avg_loss, 100)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_macd(prices: np.ndarray) -> tuple:
    """Compute MACD indicator."""
    def ema(data, span):
        alpha = 2 / (span + 1)
        result = np.zeros_like(data)
        result[0] = data[0]
        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i - 1]
        return result

    ema12 = ema(prices, 12)
    ema26 = ema(prices, 26)
    macd_line = ema12 - ema26
    signal_line = ema(macd_line, 9)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_moving_averages(prices: np.ndarray) -> dict:
    """Compute various moving averages."""
    ma = {}
    for period in [5, 10, 20, 50]:
        if len(prices) >= period:
            ma[f"ma_{period}"] = round(float(np.mean(prices[-period:])), 2)
        else:
            ma[f"ma_{period}"] = round(float(np.mean(prices)), 2)
    return ma


async def predict_stock(symbol: str) -> Optional[dict]:
    """Generate AI prediction for a stock.

    Uses a combination of technical indicators and pattern analysis.
    If a trained LSTM model exists, uses it; otherwise falls back to
    technical analysis-based prediction.
    """
    import yfinance as yf
    import asyncio

    try:
        # Fetch historical data
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, yf.Ticker, symbol)
        df = await loop.run_in_executor(
            None,
            lambda: ticker.history(period="6mo", interval="1d")
        )

        if df.empty or len(df) < 30:
            return None

        prices = df["Close"].values.astype(float)
        volumes = df["Volume"].values.astype(float)
        current_price = float(prices[-1])

        # Compute technical indicators
        rsi = compute_rsi(prices)
        current_rsi = float(rsi[-1])

        macd_line, signal_line, histogram = compute_macd(prices)
        current_macd = float(macd_line[-1])
        current_signal = float(signal_line[-1])
        current_histogram = float(histogram[-1])

        ma = compute_moving_averages(prices)

        # ── Prediction Logic ──────────────────────────────────
        # Try to use trained model first
        prediction_result = await _try_model_prediction(symbol, prices, volumes)

        if prediction_result is None:
            # Fallback: Technical analysis based prediction
            prediction_result = _technical_prediction(
                prices, current_rsi, current_macd, current_signal, current_histogram, ma
            )

        predicted_price = prediction_result["predicted_price"]
        confidence = prediction_result["confidence"]
        trend = prediction_result["trend"]

        result = {
            "symbol": symbol,
            "prediction": trend,
            "confidence": round(confidence, 2),
            "predicted_price": round(predicted_price, 2),
            "current_price": round(current_price, 2),
            "indicators": {
                "rsi": round(current_rsi, 2),
                "macd": round(current_macd, 4),
                "macd_signal": round(current_signal, 4),
                "macd_histogram": round(current_histogram, 4),
                **ma,
                "volume_avg_10d": round(float(np.mean(volumes[-10:])), 0),
                "volume_current": round(float(volumes[-1]), 0),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        _prediction_cache[symbol] = result
        return result

    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {e}")
        if symbol in _prediction_cache:
            return _prediction_cache[symbol]
        return None


async def _try_model_prediction(symbol: str, prices: np.ndarray, volumes: np.ndarray) -> Optional[dict]:
    """Try to use a trained LSTM model for prediction."""
    try:
        import tensorflow as tf

        model_path = os.path.join(MODEL_DIR, f"{symbol.replace('.', '_')}_model.h5")
        if not os.path.exists(model_path):
            model_path = os.path.join(MODEL_DIR, "general_model.h5")

        if not os.path.exists(model_path):
            return None

        # Load model (with caching)
        if model_path not in _model_cache:
            _model_cache[model_path] = tf.keras.models.load_model(model_path)

        model = _model_cache[model_path]

        # Prepare input data (last 60 days)
        from sklearn.preprocessing import MinMaxScaler

        scaler = MinMaxScaler()
        sequence_length = 60

        if len(prices) < sequence_length:
            return None

        scaled_prices = scaler.fit_transform(prices.reshape(-1, 1))
        input_seq = scaled_prices[-sequence_length:].reshape(1, sequence_length, 1)

        # Predict
        prediction = model.predict(input_seq, verbose=0)
        predicted_scaled = float(prediction[0][0])
        predicted_price = float(scaler.inverse_transform([[predicted_scaled]])[0][0])

        current_price = float(prices[-1])
        trend = "UP" if predicted_price > current_price else "DOWN"
        change_pct = abs((predicted_price - current_price) / current_price)
        confidence = min(0.95, 0.5 + change_pct * 10)

        return {
            "predicted_price": predicted_price,
            "confidence": confidence,
            "trend": trend,
        }

    except ImportError:
        logger.warning("TensorFlow not available, using technical analysis fallback")
        return None
    except Exception as e:
        logger.warning(f"Model prediction failed: {e}")
        return None


def _technical_prediction(
    prices: np.ndarray,
    rsi: float,
    macd: float,
    signal: float,
    histogram: float,
    ma: dict,
) -> dict:
    """Fallback prediction using technical analysis."""
    current_price = float(prices[-1])
    signals = []

    # RSI signal
    if rsi < 30:
        signals.append(("UP", 0.7))  # Oversold → likely to go up
    elif rsi > 70:
        signals.append(("DOWN", 0.7))  # Overbought → likely to go down
    elif rsi < 45:
        signals.append(("UP", 0.55))
    elif rsi > 55:
        signals.append(("DOWN", 0.55))
    else:
        signals.append(("UP", 0.5))

    # MACD signal
    if macd > signal and histogram > 0:
        signals.append(("UP", 0.65))
    elif macd < signal and histogram < 0:
        signals.append(("DOWN", 0.65))
    else:
        signals.append(("UP", 0.5))

    # Moving average signal
    ma_20 = ma.get("ma_20", current_price)
    ma_50 = ma.get("ma_50", current_price)
    if current_price > ma_20 > ma_50:
        signals.append(("UP", 0.6))
    elif current_price < ma_20 < ma_50:
        signals.append(("DOWN", 0.6))
    else:
        signals.append(("UP", 0.5))

    # Price momentum (last 5 days)
    if len(prices) >= 5:
        momentum = (prices[-1] - prices[-5]) / prices[-5]
        if momentum > 0.02:
            signals.append(("UP", 0.6))
        elif momentum < -0.02:
            signals.append(("DOWN", 0.6))
        else:
            signals.append(("UP", 0.5))

    # Aggregate signals
    up_score = sum(conf for trend, conf in signals if trend == "UP")
    down_score = sum(conf for trend, conf in signals if trend == "DOWN")
    total = up_score + down_score

    if up_score >= down_score:
        trend = "UP"
        confidence = up_score / total if total > 0 else 0.5
        price_change = current_price * confidence * 0.03  # Max 3% predicted change
        predicted_price = current_price + price_change
    else:
        trend = "DOWN"
        confidence = down_score / total if total > 0 else 0.5
        price_change = current_price * confidence * 0.03
        predicted_price = current_price - price_change

    return {
        "predicted_price": predicted_price,
        "confidence": confidence,
        "trend": trend,
    }


async def get_top_predictions(symbols: list, limit: int = 10) -> list:
    """Get AI predictions for multiple stocks, sorted by confidence."""
    import asyncio

    tasks = [predict_stock(s) for s in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    predictions = []
    for r in results:
        if isinstance(r, dict) and r is not None:
            predictions.append(r)

    # Sort by confidence
    predictions.sort(key=lambda x: x["confidence"], reverse=True)
    return predictions[:limit]

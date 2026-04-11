"""LSTM Model Training Pipeline for Stock Price Prediction.

Usage:
    python -m ai_service.training.train_model --symbol AAPL --epochs 50
    python -m ai_service.training.train_model --symbol RELIANCE.NS --epochs 100
"""
import numpy as np
import pandas as pd
import yfinance as yf
import os
import sys
import argparse
import json
from datetime import datetime
from sklearn.preprocessing import MinMaxScaler

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")


def fetch_training_data(symbol: str, period: str = "5y") -> pd.DataFrame:
    """Fetch historical data for training."""
    print(f"📊 Fetching {period} of data for {symbol}...")
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval="1d")

    if df.empty:
        raise ValueError(f"No data found for {symbol}")

    print(f"  ✅ Got {len(df)} data points ({df.index[0].date()} to {df.index[-1].date()})")
    return df


def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add technical indicators as features."""
    # Moving averages
    df["MA_5"] = df["Close"].rolling(window=5).mean()
    df["MA_10"] = df["Close"].rolling(window=10).mean()
    df["MA_20"] = df["Close"].rolling(window=20).mean()
    df["MA_50"] = df["Close"].rolling(window=50).mean()

    # RSI
    delta = df["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df["RSI"] = 100 - (100 / (1 + rs))

    # MACD
    exp12 = df["Close"].ewm(span=12, adjust=False).mean()
    exp26 = df["Close"].ewm(span=26, adjust=False).mean()
    df["MACD"] = exp12 - exp26
    df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()

    # Bollinger Bands
    df["BB_Mid"] = df["Close"].rolling(window=20).mean()
    bb_std = df["Close"].rolling(window=20).std()
    df["BB_Upper"] = df["BB_Mid"] + (bb_std * 2)
    df["BB_Lower"] = df["BB_Mid"] - (bb_std * 2)

    # Volume MA
    df["Volume_MA"] = df["Volume"].rolling(window=10).mean()

    # Price Rate of Change
    df["ROC"] = df["Close"].pct_change(periods=10) * 100

    # Drop NaN rows
    df = df.dropna()
    return df


def prepare_sequences(data: np.ndarray, sequence_length: int = 60):
    """Create sequences for LSTM training.

    Args:
        data: Scaled feature array
        sequence_length: Number of time steps in each sequence

    Returns:
        X: Input sequences, Y: Target values
    """
    X, Y = [], []
    for i in range(sequence_length, len(data)):
        X.append(data[i - sequence_length:i])
        Y.append(data[i, 0])  # Predict the close price (first column)

    return np.array(X), np.array(Y)


def build_lstm_model(input_shape: tuple):
    """Build LSTM model architecture."""
    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
        from tensorflow.keras.optimizers import Adam

        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            BatchNormalization(),

            LSTM(64, return_sequences=True),
            Dropout(0.2),
            BatchNormalization(),

            LSTM(32, return_sequences=False),
            Dropout(0.2),

            Dense(16, activation="relu"),
            Dense(1)
        ])

        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss="mse",
            metrics=["mae"],
        )

        return model

    except ImportError:
        print("❌ TensorFlow is required for model training.")
        print("  Install with: pip install tensorflow")
        sys.exit(1)


def train(symbol: str, epochs: int = 50, sequence_length: int = 60):
    """Full training pipeline for a stock symbol."""
    import tensorflow as tf

    print(f"\n{'='*60}")
    print(f"  🧠 LSTM Training Pipeline - {symbol}")
    print(f"{'='*60}\n")

    # 1. Fetch data
    df = fetch_training_data(symbol)

    # 2. Add technical indicators
    print("📈 Computing technical indicators...")
    df = add_technical_indicators(df)

    # 3. Select features
    features = ["Close", "Open", "High", "Low", "Volume",
                 "MA_5", "MA_10", "MA_20", "RSI", "MACD"]
    data = df[features].values

    print(f"  Features: {features}")
    print(f"  Data shape: {data.shape}")

    # 4. Scale data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data)

    # 5. Create sequences
    X, Y = prepare_sequences(scaled_data, sequence_length)
    print(f"\n📦 Sequence shape: X={X.shape}, Y={Y.shape}")

    # 6. Train/test split (80/20)
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    Y_train, Y_test = Y[:split], Y[split:]
    print(f"  Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    # 7. Build model
    print("\n🏗️  Building LSTM model...")
    model = build_lstm_model((X_train.shape[1], X_train.shape[2]))
    model.summary()

    # 8. Train
    print(f"\n🚀 Training for {epochs} epochs...")
    history = model.fit(
        X_train, Y_train,
        validation_data=(X_test, Y_test),
        epochs=epochs,
        batch_size=32,
        verbose=1,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=10, restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=5
            ),
        ],
    )

    # 9. Evaluate
    loss, mae = model.evaluate(X_test, Y_test, verbose=0)
    print(f"\n📊 Evaluation:")
    print(f"  Loss (MSE): {loss:.6f}")
    print(f"  MAE: {mae:.6f}")

    # 10. Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    safe_symbol = symbol.replace(".", "_")
    model_path = os.path.join(MODEL_DIR, f"{safe_symbol}_model.h5")
    model.save(model_path)
    print(f"\n💾 Model saved: {model_path}")

    # Save scaler params and metadata
    metadata = {
        "symbol": symbol,
        "features": features,
        "sequence_length": sequence_length,
        "epochs_trained": len(history.history["loss"]),
        "final_loss": float(loss),
        "final_mae": float(mae),
        "data_points": len(df),
        "trained_at": datetime.now().isoformat(),
        "scaler_min": scaler.data_min_.tolist(),
        "scaler_max": scaler.data_max_.tolist(),
    }

    meta_path = os.path.join(MODEL_DIR, f"{safe_symbol}_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"  Metadata saved: {meta_path}")
    print(f"\n{'='*60}")
    print(f"  ✅ Training complete for {symbol}!")
    print(f"{'='*60}\n")

    return model, history


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LSTM model for stock prediction")
    parser.add_argument("--symbol", type=str, default="AAPL", help="Stock ticker symbol")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--sequence-length", type=int, default=60, help="Sequence length for LSTM")

    args = parser.parse_args()
    train(args.symbol, args.epochs, args.sequence_length)

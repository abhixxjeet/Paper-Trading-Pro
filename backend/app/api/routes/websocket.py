"""WebSocket handler for real-time stock price updates."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, List
import asyncio
import json
import logging
from app.services.stock_service import fetch_stock_quote, INDIAN_STOCKS, US_STOCKS

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Connection Manager ────────────────────────────────────────
class ConnectionManager:
    """Manages WebSocket connections and broadcasts price updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        # Remove from all subscriptions
        for symbol in list(self.subscriptions.keys()):
            self.subscriptions[symbol].discard(websocket)

    async def subscribe(self, websocket: WebSocket, symbols: List[str]):
        """Subscribe a client to specific stock symbols."""
        for symbol in symbols:
            if symbol not in self.subscriptions:
                self.subscriptions[symbol] = set()
            self.subscriptions[symbol].add(websocket)

    async def unsubscribe(self, websocket: WebSocket, symbols: List[str]):
        """Unsubscribe a client from stock symbols."""
        for symbol in symbols:
            if symbol in self.subscriptions:
                self.subscriptions[symbol].discard(websocket)

    async def broadcast(self, data: dict):
        """Send data to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_subscribers(self, symbol: str, data: dict):
        """Send data only to clients subscribed to a symbol."""
        if symbol not in self.subscriptions:
            return
        disconnected = []
        for connection in self.subscriptions[symbol]:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time price updates.

    Clients can send messages to subscribe/unsubscribe:
    - {"action": "subscribe", "symbols": ["AAPL", "RELIANCE.NS"]}
    - {"action": "unsubscribe", "symbols": ["AAPL"]}
    """
    await manager.connect(websocket)

    # Default: subscribe to a few popular stocks
    default_symbols = INDIAN_STOCKS[:5] + US_STOCKS[:5]
    await manager.subscribe(websocket, default_symbols)

    try:
        # Start background price update task
        update_task = asyncio.create_task(_send_price_updates(websocket, default_symbols))

        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                action = message.get("action", "")

                if action == "subscribe":
                    symbols = message.get("symbols", [])
                    await manager.subscribe(websocket, symbols)
                    default_symbols.extend(symbols)

                elif action == "unsubscribe":
                    symbols = message.get("symbols", [])
                    await manager.unsubscribe(websocket, symbols)
                    for s in symbols:
                        if s in default_symbols:
                            default_symbols.remove(s)

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        update_task.cancel()
    except Exception:
        manager.disconnect(websocket)


async def _send_price_updates(websocket: WebSocket, symbols: List[str]):
    """Background task to send periodic price updates."""
    while True:
        try:
            for symbol in symbols[:10]:  # Limit to avoid rate limiting
                quote = await fetch_stock_quote(symbol)
                if quote:
                    try:
                        await websocket.send_json({
                            "type": "price_update",
                            "data": quote,
                        })
                    except Exception:
                        return

            await asyncio.sleep(5)  # Update every 5 seconds

        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.error(f"Price update error: {e}")
            await asyncio.sleep(10)

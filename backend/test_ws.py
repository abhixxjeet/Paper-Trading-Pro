import asyncio
import websockets
import json

async def test():
    try:
        async with websockets.connect('ws://127.0.0.1:8000/ws/prices') as ws:
            print('Connected!')
            await ws.send(json.dumps({"action": "subscribe", "symbols": ["AAPL"]}))
            res = await ws.recv()
            print('Received:', res[:100])
    except Exception as e:
        print('Error:', e)

asyncio.run(test())

// Vercel Serverless Function: Fetch stock quote from Yahoo Finance
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: `No data found for ${symbol}` });
    }

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const lastIdx = timestamps.length - 1;

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Determine market
    const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO');
    const market = isIndian ? 'NSE' : 'NASDAQ/NYSE';
    const currency = isIndian ? 'INR' : 'USD';

    const quote = {
      symbol: symbol,
      name: meta.shortName || meta.longName || symbol.replace('.NS', '').replace('.BO', ''),
      market,
      price: round(price),
      change: round(change),
      change_percent: round(changePct),
      volume: meta.regularMarketVolume || (quotes?.volume?.[lastIdx] || 0),
      day_high: round(meta.regularMarketDayHigh || (quotes?.high?.[lastIdx] || 0)),
      day_low: round(meta.regularMarketDayLow || (quotes?.low?.[lastIdx] || 0)),
      open_price: round(meta.regularMarketOpen || (quotes?.open?.[lastIdx] || 0)),
      prev_close: round(prevClose),
      market_cap: meta.marketCap || 0,
      sector: '',
      currency,
      last_updated: new Date().toISOString(),
    };

    // Cache for 15 seconds
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(quote);
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return res.status(500).json({ error: `Failed to fetch data for ${symbol}` });
  }
}

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

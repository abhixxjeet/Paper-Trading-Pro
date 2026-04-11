// Vercel Serverless Function: Fetch multiple stock quotes
const INDIAN_STOCKS = [
  "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
  "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS",
  "LT.NS", "HCLTECH.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS",
  "SUNPHARMA.NS", "TITAN.NS", "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS",
];

const US_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "META", "TSLA", "BRK-B", "UNH", "JNJ",
  "V", "JPM", "PG", "MA", "HD",
  "DIS", "NFLX", "PYPL", "ADBE", "CRM",
];

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

async function fetchBatchQuotes(symbols) {
  const symbolsStr = symbols.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsStr)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      // Fallback: fetch via chart API individually
      return await fetchIndividualQuotes(symbols);
    }

    const data = await response.json();
    const results = data?.quoteResponse?.result || [];

    return results.map(q => {
      const isIndian = q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO');
      return {
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        market: isIndian ? 'NSE' : 'NASDAQ/NYSE',
        price: round(q.regularMarketPrice),
        change: round(q.regularMarketChange),
        change_percent: round(q.regularMarketChangePercent),
        volume: q.regularMarketVolume || 0,
        day_high: round(q.regularMarketDayHigh),
        day_low: round(q.regularMarketDayLow),
        open_price: round(q.regularMarketOpen),
        prev_close: round(q.regularMarketPreviousClose),
        market_cap: q.marketCap || 0,
        sector: q.sector || '',
        currency: isIndian ? 'INR' : 'USD',
        last_updated: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Batch quote fetch failed, trying individual:', error.message);
    return await fetchIndividualQuotes(symbols);
  }
}

async function fetchIndividualQuotes(symbols) {
  const results = [];
  // Fetch in parallel with concurrency limit
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 5) {
    chunks.push(symbols.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!resp.ok) return null;

        const data = await resp.json();
        const result = data?.chart?.result?.[0];
        if (!result) return null;

        const meta = result.meta;
        const price = meta.regularMarketPrice || 0;
        const prevClose = meta.chartPreviousClose || meta.previousClose || price;
        const change = price - prevClose;
        const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
        const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO');

        return {
          symbol,
          name: meta.shortName || meta.longName || symbol.replace('.NS', ''),
          market: isIndian ? 'NSE' : 'NASDAQ/NYSE',
          price: round(price),
          change: round(change),
          change_percent: round(changePct),
          volume: meta.regularMarketVolume || 0,
          day_high: round(meta.regularMarketDayHigh || 0),
          day_low: round(meta.regularMarketDayLow || 0),
          open_price: round(meta.regularMarketOpen || 0),
          prev_close: round(prevClose),
          market_cap: meta.marketCap || 0,
          sector: '',
          currency: isIndian ? 'INR' : 'USD',
          last_updated: new Date().toISOString(),
        };
      } catch {
        return null;
      }
    });
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(Boolean));
  }
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { market = 'all', limit = '15' } = req.query;
  const lim = Math.min(parseInt(limit) || 15, 30);

  let symbols;
  if (market === 'india') {
    symbols = INDIAN_STOCKS.slice(0, lim);
  } else if (market === 'us') {
    symbols = US_STOCKS.slice(0, lim);
  } else {
    symbols = [...INDIAN_STOCKS.slice(0, Math.ceil(lim / 2)), ...US_STOCKS.slice(0, Math.floor(lim / 2))];
  }

  try {
    const quotes = await fetchBatchQuotes(symbols);
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(quotes);
  } catch (error) {
    console.error('Failed to fetch quotes:', error);
    return res.status(500).json({ error: 'Failed to fetch stock quotes' });
  }
}

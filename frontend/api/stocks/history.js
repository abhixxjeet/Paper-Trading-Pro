// Vercel Serverless Function: Fetch stock price history from Yahoo Finance
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol, period = '1mo' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  // Map period to Yahoo Finance params
  const periodMap = {
    '1d': { range: '1d', interval: '5m' },
    '5d': { range: '5d', interval: '15m' },
    '1mo': { range: '1mo', interval: '1d' },
    '3mo': { range: '3mo', interval: '1d' },
    '6mo': { range: '6mo', interval: '1d' },
    '1y': { range: '1y', interval: '1wk' },
    '5y': { range: '5y', interval: '1mo' },
  };

  const params = periodMap[period] || periodMap['1mo'];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${params.interval}&range=${params.range}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: `No history data for ${symbol}` });
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const useIntraday = ['5m', '15m'].includes(params.interval);

    const history = timestamps.map((ts, i) => {
      const date = new Date(ts * 1000);
      return {
        date: useIntraday
          ? date.toISOString().slice(0, 16).replace('T', ' ')
          : date.toISOString().slice(0, 10),
        open: round(quotes.open?.[i]),
        high: round(quotes.high?.[i]),
        low: round(quotes.low?.[i]),
        close: round(quotes.close?.[i]),
        volume: quotes.volume?.[i] || 0,
      };
    }).filter(h => h.close > 0); // Filter out null/zero entries

    // Cache historical data longer
    const cacheTime = period === '1d' ? 60 : 300;
    res.setHeader('Cache-Control', `s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`);
    return res.status(200).json({ symbol, period, data: history });
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error.message);
    return res.status(500).json({ error: `Failed to fetch history for ${symbol}` });
  }
}

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

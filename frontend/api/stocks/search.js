// Vercel Serverless Function: Search stocks
const INDIAN_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever" },
  { symbol: "SBIN.NS", name: "State Bank of India" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
  { symbol: "ITC.NS", name: "ITC Ltd" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  { symbol: "LT.NS", name: "Larsen & Toubro" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies" },
  { symbol: "AXISBANK.NS", name: "Axis Bank" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical" },
  { symbol: "TITAN.NS", name: "Titan Company" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance" },
  { symbol: "WIPRO.NS", name: "Wipro" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel" },
  { symbol: "NTPC.NS", name: "NTPC Limited" },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises" },
  { symbol: "TECHM.NS", name: "Tech Mahindra" },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel" },
  { symbol: "ONGC.NS", name: "ONGC" },
];

const US_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK-B", name: "Berkshire Hathaway" },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "HD", name: "Home Depot" },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "PYPL", name: "PayPal Holdings" },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "AMD", name: "AMD Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "QCOM", name: "Qualcomm Inc." },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "KO", name: "Coca-Cola Co." },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 1) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const query = q.toUpperCase();
  const allStocks = [...INDIAN_STOCKS, ...US_STOCKS];

  const results = allStocks
    .filter(s =>
      s.symbol.toUpperCase().includes(query) ||
      s.name.toUpperCase().includes(query)
    )
    .slice(0, 20)
    .map(s => {
      const isIndian = s.symbol.endsWith('.NS') || s.symbol.endsWith('.BO');
      return {
        symbol: s.symbol,
        display_symbol: s.symbol.replace('.NS', '').replace('.BO', ''),
        name: s.name,
        market: isIndian ? 'NSE' : 'NASDAQ/NYSE',
        currency: isIndian ? 'INR' : 'USD',
      };
    });

  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json(results);
}

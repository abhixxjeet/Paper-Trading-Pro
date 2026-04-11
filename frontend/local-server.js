import express from 'express';
import cors from 'cors';
import quoteHandler from './api/stocks/quote.js';
import quotesHandler from './api/stocks/quotes.js';
import historyHandler from './api/stocks/history.js';
import searchHandler from './api/stocks/search.js';

const app = express();
app.use(cors());

// Simple helper to mock Vercel's req/res extensions
const runVercelFunc = (handler) => async (req, res) => {
  // Vercel populates req.query by default, express does too.
  
  // Vercel extensions
  const originalStatus = res.status.bind(res);
  const vRes = res;
  
  // Actually Express already has res.status and res.json, so it's fully compatible!
  
  try {
    await handler(req, vRes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

app.get('/api/stocks/quote', runVercelFunc(quoteHandler));
app.get('/api/stocks/quotes', runVercelFunc(quotesHandler));
app.get('/api/stocks/history', runVercelFunc(historyHandler));
app.get('/api/stocks/search', runVercelFunc(searchHandler));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});

/**
 * API layer — works both locally (via Vite proxy) and on Vercel (via serverless functions).
 * Auth, trading, and portfolio are fully client-side using localStorage.
 */
import axios from 'axios';

// ── Detect environment ─────────────────────────────────────────
const isDev = import.meta.env.DEV;
// In development, Vite proxies /api/* to the local backend (if running).
// In production (Vercel), /api/* routes to serverless functions.
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Stocks API (uses serverless functions) ─────────────────────
export const stocksAPI = {
  getQuote: (symbol) => api.get(`/stocks/quote?symbol=${encodeURIComponent(symbol)}`),
  getIndianStocks: (limit = 15) => api.get(`/stocks/quotes?market=india&limit=${limit}`),
  getUSStocks: (limit = 15) => api.get(`/stocks/quotes?market=us&limit=${limit}`),
  getAllStocks: (market = 'all', limit = 20) => api.get(`/stocks/quotes?market=${market}&limit=${limit}`),
  getHistory: (symbol, period = '1mo') => api.get(`/stocks/history?symbol=${encodeURIComponent(symbol)}&period=${period}`),
  search: (query) => api.get(`/stocks/search?q=${encodeURIComponent(query)}`),
};

// ── Local Storage Keys ─────────────────────────────────────────
const STORAGE_KEYS = {
  USER: 'papertradingpro_user',
  TOKEN: 'papertradingpro_token',
  USERS: 'papertradingpro_users',
  PORTFOLIO: 'papertradingpro_portfolio',
  TRANSACTIONS: 'papertradingpro_transactions',
  WATCHLIST: 'papertradingpro_watchlist',
};

// ── Helper: generate ID ────────────────────────────────────────
function nextId(key) {
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

// ── Initialize default data ────────────────────────────────────
function ensureInitialized() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers = [
      {
        id: 1,
        name: 'Admin',
        email: 'admin@papertradingpro.com',
        password: 'admin123',
        balance: 1000000,
        role: 'admin',
        is_blocked: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Demo Trader',
        email: 'demo@papertradingpro.com',
        password: 'demo123',
        balance: 100000,
        role: 'user',
        is_blocked: false,
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PORTFOLIO)) {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, '{}'); // userId -> [{symbol, quantity, avg_price}]
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, '{}'); // userId -> [transactions]
  }
  if (!localStorage.getItem(STORAGE_KEYS.WATCHLIST)) {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, '{}'); // userId -> [symbols]
  }
}
ensureInitialized();

// ── Auth API (localStorage) ───────────────────────────────────
export const authAPI = {
  register: async ({ name, email, password }) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    if (users.find(u => u.email === email)) {
      throw { response: { status: 400, data: { detail: 'Email already registered' } } };
    }
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name,
      email,
      password,
      balance: 100000,
      role: 'user',
      is_blocked: false,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return { data: { ...newUser, password: undefined } };
  },

  login: async (email, password) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw { response: { status: 401, data: { detail: 'Invalid email or password' } } };
    }
    if (user.is_blocked) {
      throw { response: { status: 403, data: { detail: 'Account has been blocked' } } };
    }
    const token = btoa(JSON.stringify({ sub: user.id, exp: Date.now() + 86400000 }));
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return { data: { access_token: token, token_type: 'bearer' } };
  },

  getMe: async () => {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
    if (!user) throw { response: { status: 401 } };
    // Refresh from users list to get updated balance
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const freshUser = users.find(u => u.id === user.id);
    if (freshUser) {
      const safeUser = { ...freshUser, password: undefined };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(safeUser));
      return { data: safeUser };
    }
    return { data: user };
  },
};

// ── Get current user helper ────────────────────────────────────
function getCurrentUser() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
  if (!user) throw { response: { status: 401, data: { detail: 'Not authenticated' } } };
  return user;
}

function updateUserBalance(userId, newBalance) {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].balance = Math.round(newBalance * 100) / 100;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    // Also update stored current user
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
    if (currentUser && currentUser.id === userId) {
      currentUser.balance = users[idx].balance;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    }
  }
}

// ── Trading API (localStorage) ────────────────────────────────
export const tradingAPI = {
  placeTrade: async (symbol, quantity, type) => {
    const user = getCurrentUser();
    // Fetch live price
    const quoteRes = await stocksAPI.getQuote(symbol);
    const price = quoteRes.data.price;
    if (!price || price <= 0) {
      throw { response: { status: 400, data: { detail: `Could not fetch price for ${symbol}` } } };
    }

    const totalAmount = Math.round(price * quantity * 100) / 100;
    const fee = Math.round(totalAmount * 0.001 * 100) / 100; // 0.1% fee

    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const userIdx = users.findIndex(u => u.id === user.id);
    if (userIdx === -1) throw { response: { status: 401 } };

    const allPortfolios = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTFOLIO) || '{}');
    const portfolio = allPortfolios[user.id] || [];

    const allTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '{}');
    const txns = allTxns[user.id] || [];

    if (type === 'BUY') {
      const totalCost = totalAmount + fee;
      if (users[userIdx].balance < totalCost) {
        throw { response: { status: 400, data: { detail: `Insufficient balance. Need ₹${totalCost.toFixed(2)} but have ₹${users[userIdx].balance.toFixed(2)}` } } };
      }

      users[userIdx].balance = Math.round((users[userIdx].balance - totalCost) * 100) / 100;

      const existingIdx = portfolio.findIndex(h => h.symbol === symbol);
      if (existingIdx >= 0) {
        const h = portfolio[existingIdx];
        const totalInvested = h.avg_price * h.quantity + totalAmount;
        h.quantity += quantity;
        h.avg_price = Math.round((totalInvested / h.quantity) * 100) / 100;
      } else {
        portfolio.push({ symbol, quantity, avg_price: price });
      }
    } else {
      // SELL
      const existingIdx = portfolio.findIndex(h => h.symbol === symbol);
      if (existingIdx < 0 || portfolio[existingIdx].quantity < quantity) {
        const owned = existingIdx >= 0 ? portfolio[existingIdx].quantity : 0;
        throw { response: { status: 400, data: { detail: `Cannot sell ${quantity} shares of ${symbol}. You own ${owned} shares.` } } };
      }

      const netAmount = totalAmount - fee;
      users[userIdx].balance = Math.round((users[userIdx].balance + netAmount) * 100) / 100;

      portfolio[existingIdx].quantity -= quantity;
      if (portfolio[existingIdx].quantity === 0) {
        portfolio.splice(existingIdx, 1);
      }
    }

    // Record transaction
    const txn = {
      id: txns.length + 1,
      symbol,
      type,
      quantity,
      price,
      total_amount: totalAmount,
      fee,
      timestamp: new Date().toISOString(),
    };
    txns.unshift(txn);

    // Save everything
    allPortfolios[user.id] = portfolio;
    allTxns[user.id] = txns;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(allPortfolios));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTxns));

    // Update current user in storage
    const updatedUser = { ...users[userIdx], password: undefined };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

    return {
      data: {
        message: `Successfully ${type === 'BUY' ? 'bought' : 'sold'} ${quantity} shares of ${symbol}`,
        transaction_id: txn.id,
        symbol,
        type,
        quantity,
        price,
        total_amount: totalAmount,
        fee,
        new_balance: users[userIdx].balance,
      }
    };
  },

  getPortfolio: async () => {
    const user = getCurrentUser();
    const allPortfolios = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTFOLIO) || '{}');
    const portfolio = allPortfolios[user.id] || [];

    // Fetch current prices for all holdings
    const holdings = [];
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const h of portfolio) {
      let currentPrice = h.avg_price;
      try {
        const quoteRes = await stocksAPI.getQuote(h.symbol);
        currentPrice = quoteRes.data.price || h.avg_price;
      } catch (e) { /* use avg_price as fallback */ }

      const invested = h.avg_price * h.quantity;
      const currentValue = currentPrice * h.quantity;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      totalInvested += invested;
      totalCurrentValue += currentValue;

      holdings.push({
        symbol: h.symbol,
        quantity: h.quantity,
        avg_price: Math.round(h.avg_price * 100) / 100,
        current_price: Math.round(currentPrice * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnl_percent: Math.round(pnlPercent * 100) / 100,
        total_value: Math.round(currentValue * 100) / 100,
      });
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const freshUser = users.find(u => u.id === user.id);
    const balance = freshUser?.balance || user.balance || 100000;

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return {
      data: {
        available_balance: Math.round(balance * 100) / 100,
        invested_amount: Math.round(totalInvested * 100) / 100,
        current_value: Math.round(totalCurrentValue * 100) / 100,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_pnl_percent: Math.round(totalPnlPercent * 100) / 100,
        holdings,
      }
    };
  },

  getTransactions: async (limit = 50) => {
    const user = getCurrentUser();
    const allTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '{}');
    const txns = (allTxns[user.id] || []).slice(0, limit);
    return { data: txns };
  },

  getWatchlist: async () => {
    const user = getCurrentUser();
    const allWatchlists = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '{}');
    const watchlist = allWatchlists[user.id] || [];
    return { data: watchlist };
  },

  addToWatchlist: async (symbol) => {
    const user = getCurrentUser();
    const allWatchlists = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '{}');
    const watchlist = allWatchlists[user.id] || [];

    if (watchlist.find(w => w.symbol === symbol)) {
      throw { response: { status: 400, data: { detail: 'Stock already in watchlist' } } };
    }

    watchlist.push({ symbol, price: 0, added_at: new Date().toISOString() });
    allWatchlists[user.id] = watchlist;
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(allWatchlists));
    return { data: { message: `${symbol} added to watchlist` } };
  },

  removeFromWatchlist: async (symbol) => {
    const user = getCurrentUser();
    const allWatchlists = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '{}');
    let watchlist = allWatchlists[user.id] || [];
    allWatchlists[user.id] = watchlist.filter(w => w.symbol !== symbol);
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(allWatchlists));
    return { data: { message: `${symbol} removed from watchlist` } };
  },

  getLeaderboard: async () => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const allPortfolios = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTFOLIO) || '{}');
    const allTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '{}');

    const leaderboard = users
      .filter(u => u.role === 'user' && !u.is_blocked)
      .map(u => {
        const portfolio = allPortfolios[u.id] || [];
        // Approximate portfolio value using avg_price (to avoid API calls)
        const portfolioValue = portfolio.reduce((sum, h) => sum + h.avg_price * h.quantity, 0);
        const totalValue = u.balance + portfolioValue;
        const pnl = totalValue - 100000;
        const trades = (allTxns[u.id] || []).length;

        return {
          name: u.name,
          total_value: Math.round(totalValue * 100) / 100,
          pnl: Math.round(pnl * 100) / 100,
          pnl_percent: Math.round((pnl / 100000) * 10000) / 100,
          trades,
        };
      })
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10);

    return { data: leaderboard };
  },
};

// ── AI Predictions (client-side technical analysis) ───────────
export const aiAPI = {
  predict: async (symbol) => {
    try {
      const histRes = await stocksAPI.getHistory(symbol, '6mo');
      const history = histRes.data.data;

      if (!history || history.length < 30) {
        return { data: { error: `Not enough data for ${symbol}` } };
      }

      const prices = history.map(h => h.close);
      const volumes = history.map(h => h.volume);
      const currentPrice = prices[prices.length - 1];

      // Compute RSI
      const rsi = computeRSI(prices);
      const currentRsi = rsi[rsi.length - 1];

      // Compute MACD
      const { macdLine, signalLine, histogram } = computeMACD(prices);
      const currentMacd = macdLine[macdLine.length - 1];
      const currentSignal = signalLine[signalLine.length - 1];
      const currentHistogram = histogram[histogram.length - 1];

      // Moving averages
      const ma = computeMovingAverages(prices);

      // Prediction
      const prediction = technicalPrediction(prices, currentRsi, currentMacd, currentSignal, currentHistogram, ma);

      return {
        data: {
          symbol,
          prediction: prediction.trend,
          confidence: Math.round(prediction.confidence * 100) / 100,
          predicted_price: Math.round(prediction.predictedPrice * 100) / 100,
          current_price: Math.round(currentPrice * 100) / 100,
          indicators: {
            rsi: Math.round(currentRsi * 100) / 100,
            macd: Math.round(currentMacd * 10000) / 10000,
            macd_signal: Math.round(currentSignal * 10000) / 10000,
            macd_histogram: Math.round(currentHistogram * 10000) / 10000,
            ...ma,
            volume_avg_10d: Math.round(volumes.slice(-10).reduce((s, v) => s + v, 0) / 10),
            volume_current: volumes[volumes.length - 1],
          },
          timestamp: new Date().toISOString(),
        }
      };
    } catch (err) {
      console.error('Prediction error:', err);
      return { data: { error: `Could not generate prediction for ${symbol}` } };
    }
  },

  getRecommendations: async (market = 'all', limit = 10) => {
    const INDIAN = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS"];
    const US = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "NFLX"];

    let symbols;
    if (market === 'india') symbols = INDIAN;
    else if (market === 'us') symbols = US;
    else symbols = [...INDIAN.slice(0, 4), ...US.slice(0, 4)];

    const predictions = [];
    // Fetch predictions concurrently
    const results = await Promise.allSettled(symbols.map(s => aiAPI.predict(s)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.data && !r.value.data.error) {
        predictions.push(r.value.data);
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);
    return { data: predictions.slice(0, limit) };
  },
};

// ── Admin API (localStorage) ──────────────────────────────────
export const adminAPI = {
  getDashboard: async () => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const allTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '{}');

    let totalTrades = 0;
    let totalVolume = 0;
    const tradeCounts = {};

    for (const userId of Object.keys(allTxns)) {
      for (const txn of allTxns[userId]) {
        totalTrades++;
        totalVolume += txn.total_amount;
        tradeCounts[txn.symbol] = (tradeCounts[txn.symbol] || 0) + 1;
      }
    }

    const mostTraded = Object.entries(tradeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symbol, count]) => ({ symbol, count }));

    return {
      data: {
        total_users: users.filter(u => u.role === 'user').length,
        active_users: users.filter(u => !u.is_blocked && u.role === 'user').length,
        total_trades: totalTrades,
        total_volume: Math.round(totalVolume * 100) / 100,
        most_traded: mostTraded,
        trading_enabled: true,
      }
    };
  },

  getUsers: async (limit = 50) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    return { data: users.filter(u => u.role === 'user').slice(0, limit).map(u => ({ ...u, password: undefined })) };
  },

  updateUser: async (userId, data) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw { response: { status: 404 } };
    if (data.is_blocked !== undefined) users[idx].is_blocked = data.is_blocked;
    if (data.balance !== undefined) users[idx].balance = data.balance;
    if (data.role !== undefined) users[idx].role = data.role;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return { data: { ...users[idx], password: undefined } };
  },

  resetBalance: async (userId) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw { response: { status: 404 } };
    users[idx].balance = 100000;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return { data: { message: 'Balance reset to ₹100,000' } };
  },

  getTransactions: async (limit = 100) => {
    const allTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '{}');
    const all = [];
    for (const txs of Object.values(allTxns)) {
      all.push(...txs);
    }
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { data: all.slice(0, limit) };
  },

  updateSettings: async (data) => {
    return { data: { message: 'Settings updated' } };
  },
};

// ── Technical Analysis Helpers ────────────────────────────────
function computeRSI(prices, period = 14) {
  const rsi = new Array(prices.length).fill(50);
  if (prices.length < period + 1) return rsi;

  const deltas = [];
  for (let i = 1; i < prices.length; i++) {
    deltas.push(prices[i] - prices[i - 1]);
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (deltas[i] > 0) avgGain += deltas[i];
    else avgLoss += Math.abs(deltas[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period; i < deltas.length; i++) {
    const gain = deltas[i] > 0 ? deltas[i] : 0;
    const loss = deltas[i] < 0 ? Math.abs(deltas[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i + 1] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

function computeMACD(prices) {
  const ema = (data, span) => {
    const alpha = 2 / (span + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  };

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);

  return { macdLine, signalLine, histogram };
}

function computeMovingAverages(prices) {
  const ma = {};
  for (const p of [5, 10, 20, 50]) {
    if (prices.length >= p) {
      ma[`ma_${p}`] = Math.round(prices.slice(-p).reduce((s, v) => s + v, 0) / p * 100) / 100;
    } else {
      ma[`ma_${p}`] = Math.round(prices.reduce((s, v) => s + v, 0) / prices.length * 100) / 100;
    }
  }
  return ma;
}

function technicalPrediction(prices, rsi, macd, signal, histogram, ma) {
  const currentPrice = prices[prices.length - 1];
  const signals = [];

  // RSI signal
  if (rsi < 30) signals.push({ trend: 'UP', conf: 0.7 });
  else if (rsi > 70) signals.push({ trend: 'DOWN', conf: 0.7 });
  else if (rsi < 45) signals.push({ trend: 'UP', conf: 0.55 });
  else if (rsi > 55) signals.push({ trend: 'DOWN', conf: 0.55 });
  else signals.push({ trend: 'UP', conf: 0.5 });

  // MACD signal
  if (macd > signal && histogram > 0) signals.push({ trend: 'UP', conf: 0.65 });
  else if (macd < signal && histogram < 0) signals.push({ trend: 'DOWN', conf: 0.65 });
  else signals.push({ trend: 'UP', conf: 0.5 });

  // MA signal
  const ma20 = ma.ma_20 || currentPrice;
  const ma50 = ma.ma_50 || currentPrice;
  if (currentPrice > ma20 && ma20 > ma50) signals.push({ trend: 'UP', conf: 0.6 });
  else if (currentPrice < ma20 && ma20 < ma50) signals.push({ trend: 'DOWN', conf: 0.6 });
  else signals.push({ trend: 'UP', conf: 0.5 });

  // Momentum
  if (prices.length >= 5) {
    const mom = (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5];
    if (mom > 0.02) signals.push({ trend: 'UP', conf: 0.6 });
    else if (mom < -0.02) signals.push({ trend: 'DOWN', conf: 0.6 });
    else signals.push({ trend: 'UP', conf: 0.5 });
  }

  const upScore = signals.filter(s => s.trend === 'UP').reduce((sum, s) => sum + s.conf, 0);
  const downScore = signals.filter(s => s.trend === 'DOWN').reduce((sum, s) => sum + s.conf, 0);
  const total = upScore + downScore;

  let trend, confidence, predictedPrice;
  if (upScore >= downScore) {
    trend = 'UP';
    confidence = total > 0 ? upScore / total : 0.5;
    predictedPrice = currentPrice + currentPrice * confidence * 0.03;
  } else {
    trend = 'DOWN';
    confidence = total > 0 ? downScore / total : 0.5;
    predictedPrice = currentPrice - currentPrice * confidence * 0.03;
  }

  return { trend, confidence, predictedPrice };
}

export default api;

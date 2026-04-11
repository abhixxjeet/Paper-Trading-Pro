import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { stocksAPI, tradingAPI, aiAPI } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, TrendingDown, Clock, BarChart2, Star,
  BrainCircuit, Activity, Zap, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';

export default function StockDetail() {
  const { symbol } = useParams();
  const { user, refreshUser } = useAuth();
  
  const [stk, setStk] = useState(null);
  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1mo');
  const [inWatchlist, setInWatchlist] = useState(false);
  
  // Trade state
  const [quantity, setQuantity] = useState(1);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMessage, setTradeMessage] = useState(null);

  const { data: wsData } = useWebSocket([symbol]);
  const liveQuote = wsData[symbol] || stk;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [quoteRes, histRes, wlRes, predRes] = await Promise.all([
          stocksAPI.getQuote(symbol),
          stocksAPI.getHistory(symbol, period),
          tradingAPI.getWatchlist(),
          aiAPI.predict(symbol).catch(() => ({ data: null }))
        ]);
        
        setStk(quoteRes.data);
        setHistory(histRes.data.data);
        const isWl = wlRes.data.some(w => w.symbol === symbol);
        setInWatchlist(isWl);
        if (predRes && predRes.data && !predRes.data.error) setPrediction(predRes.data);
        else setPrediction(null);
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol, period]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) await tradingAPI.removeFromWatchlist(symbol);
      else await tradingAPI.addToWatchlist(symbol);
      setInWatchlist(!inWatchlist);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrade = async (type) => {
    try {
      setTradeLoading(true);
      setTradeMessage(null);
      const res = await tradingAPI.placeTrade(symbol, quantity, type);
      setTradeMessage({ type: 'success', text: res.data.message });
      await refreshUser();
    } catch (err) {
      setTradeMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Trade failed' 
      });
    } finally {
      setTradeLoading(false);
      setTimeout(() => setTradeMessage(null), 5000);
    }
  };

  if (loading && !stk) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stk || stk.error) {
    return <div className="text-center text-red-400 mt-20">Stock data not found.</div>;
  }

  const isUp = liveQuote?.change >= 0;
  const currency = liveQuote?.currency === 'INR' ? '₹' : '$';

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6 pb-12">
      
      {/* Header Panel */}
      <div className="glass-card p-6 border-l-4" style={{borderLeftColor: isUp ? '#10b981' : '#ef4444'}}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">{liveQuote.symbol}</h1>
              <button 
                onClick={toggleWatchlist} 
                className={`p-2 rounded-lg border transition-all ${inWatchlist ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-dark-800 border-dark-700 text-dark-400 hover:text-white hover:bg-dark-700'}`}
                title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                <Star className={`w-5 h-5 ${inWatchlist ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
            <p className="text-dark-300 font-medium text-lg mt-1">{liveQuote.name}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-dark-400">
               <span className="font-mono bg-dark-800 px-2 py-1 rounded text-dark-200">{liveQuote.market}</span>
               <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Vol: {(liveQuote.volume / 1000000).toFixed(2)}M</span>
            </div>
          </div>
          
          <div className="text-left md:text-right">
            <h2 className="text-4xl font-mono font-bold text-white tracking-tighter">
              {currency}{liveQuote.price?.toFixed(2)}
            </h2>
            <div className={`flex items-center md:justify-end gap-2 mt-2 font-mono text-lg font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
              {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {isUp ? '+' : ''}{liveQuote.change?.toFixed(2)} 
              <span className="opacity-80">({isUp ? '+' : ''}{liveQuote.change_percent?.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Chart & Stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart Card */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary-400" /> Price Action
              </h3>
              <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700">
                {['1d', '5d', '1mo', '6mo', '1y'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${period === p ? 'bg-primary-600 text-white shadow' : 'text-dark-400 hover:text-white hover:bg-dark-700'}`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `${currency}${val.toFixed(0)}`}
                      width={60}
                    />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                       itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                       labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="close" 
                      stroke={isUp ? '#10b981' : '#ef4444'} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorClose)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-dark-500 font-medium">
                  Loading chart data...
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <span className="text-xs font-semibold text-dark-400 uppercase">Open</span>
              <span className="font-mono text-white text-lg">{currency}{liveQuote.open_price?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-semibold text-dark-400 uppercase">Prev Close</span>
              <span className="font-mono text-white text-lg">{currency}{liveQuote.prev_close?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-semibold text-dark-400 uppercase">Day High</span>
              <span className="font-mono text-white text-lg">{currency}{liveQuote.day_high?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-semibold text-dark-400 uppercase">Day Low</span>
              <span className="font-mono text-white text-lg">{currency}{liveQuote.day_low?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>

        </div>

        {/* Right Col: AI & Trade */}
        <div className="space-y-6">
          
          {/* Virtual Trade Box */}
          <div className="glass-card p-6 border-t-2 border-primary-500">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-white flex items-center gap-2">
                 <Zap className="w-5 h-5 text-primary-400" /> Virtual Terminal
               </h3>
               {user && (
                 <span className="text-xs font-mono bg-dark-800 text-emerald-400 px-2 py-1 rounded">
                   Avail: ₹{user.balance?.toFixed(0)}
                 </span>
               )}
             </div>

             {tradeMessage && (
               <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm font-medium animate-slide-up ${tradeMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                 {tradeMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                 {tradeMessage.text}
               </div>
             )}

             <div className="space-y-4">
               <div>
                  <label className="text-xs font-semibold text-dark-400 uppercase mb-1.5 block">Quantity</label>
                  <div className="flex bg-dark-900 rounded-xl border border-dark-600 overflow-hidden">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white font-bold transition-colors">-</button>
                    <input 
                       type="number" 
                       value={quantity} 
                       onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                       min="1"
                       className="w-full bg-transparent text-center font-mono font-bold text-white focus:outline-none" 
                    />
                    <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white font-bold transition-colors">+</button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center py-2 border-b border-dark-800 border-dashed">
                  <span className="text-sm text-dark-300">Est. Total</span>
                  <span className="font-mono text-white font-bold">
                    {currency}{(liveQuote.price * quantity).toFixed(2)}
                  </span>
               </div>

               <div className="grid grid-cols-2 gap-3 pt-2">
                 <button 
                    onClick={() => handleTrade('BUY')}
                    disabled={tradeLoading}
                    className="btn-success w-full relative overflow-hidden group"
                 >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl" />
                    <span className="relative z-10 flex items-center justify-center gap-1">BUY <ChevronRight className="w-4 h-4 opacity-50"/></span>
                 </button>
                 <button 
                    onClick={() => handleTrade('SELL')}
                    disabled={tradeLoading}
                    className="btn-danger w-full relative overflow-hidden group"
                 >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl" />
                    <span className="relative z-10 flex items-center justify-center gap-1">SELL <ChevronRight className="w-4 h-4 opacity-50"/></span>
                 </button>
               </div>
             </div>
          </div>

          {/* AI Prediction Box */}
          <div className="glass-card p-6 border border-dark-600/50 bg-gradient-to-br from-dark-800/80 to-dark-900/80 relative overflow-hidden">
             {/* decorative AI background */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-xl" />
             
             <h3 className="font-bold text-white mb-5 flex items-center gap-2 relative z-10">
               <BrainCircuit className="w-5 h-5 text-primary-400" /> AI Insights
             </h3>

             {prediction ? (
               <div className="relative z-10 space-y-4">
                 <div className="flex justify-between items-end pb-3 border-b border-dark-700/50">
                    <div>
                      <span className="text-xs font-semibold text-dark-400 uppercase block mb-1">Forecast</span>
                      <div className={`text-xl font-bold flex items-center gap-1 ${prediction.prediction === 'UP' ? 'text-profit' : 'text-loss'}`}>
                        {prediction.prediction === 'UP' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        {prediction.prediction}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-dark-400 uppercase block mb-1">Confidence</span>
                      <span className="text-xl font-bold text-white">{(prediction.confidence * 100).toFixed(0)}%</span>
                    </div>
                 </div>
                 
                 <div>
                   <span className="text-xs font-semibold text-dark-400 uppercase block mb-1">Target Price</span>
                   <span className="font-mono text-lg font-bold text-white tracking-tight">{currency}{prediction.predicted_price.toFixed(2)}</span>
                 </div>

                 <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-700/50 mt-2">
                    <span className="text-[10px] font-semibold text-dark-400 uppercase block mb-2">Technical Indicators</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-dark-400">RSI (14)</span>
                        <span className={`font-mono font-medium ${prediction.indicators.rsi > 70 ? 'text-loss' : prediction.indicators.rsi < 30 ? 'text-profit' : 'text-dark-200'}`}>{prediction.indicators.rsi?.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">MACD</span>
                        <span className="font-mono text-dark-200 font-medium">{prediction.indicators.macd?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">MA20</span>
                        <span className="font-mono text-dark-200 font-medium">{prediction.indicators.ma_20?.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">MA50</span>
                        <span className="font-mono text-dark-200 font-medium">{prediction.indicators.ma_50?.toFixed(1)}</span>
                      </div>
                    </div>
                 </div>
               </div>
             ) : (
               <div className="py-6 text-center text-dark-400">
                 <BrainCircuit className="w-8 h-8 mx-auto mb-2 opacity-20" />
                 <p className="text-sm font-medium">AI model analyzing data...</p>
                 <p className="text-xs mt-1">Check back shortly</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stocksAPI } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { TrendingUp, TrendingDown, Clock, Activity, ArrowRight } from 'lucide-react';

// A generic Stock Card component
function StockCard({ stock, liveData }) {
  const data = liveData || stock;
  const isUp = data?.change >= 0;

  return (
    <Link to={`/stock/${data?.symbol}`} className="glass-card-hover p-5 block group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl -translate-y-12 translate-x-12 group-hover:bg-primary-500/10 transition-colors" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary-400 transition-colors">{data?.symbol}</h3>
          <p className="text-xs text-dark-400 font-medium truncate max-w-[120px]">{data?.name}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            {data?.currency === 'INR' ? '₹' : '$'}{data?.price?.toFixed(2)}
          </div>
          <div className={`mt-1 flex justify-end items-center gap-1 ${isUp ? 'text-profit' : 'text-loss'}`}>
             {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
             <span className="font-semibold text-sm font-mono">
               {isUp ? '+' : ''}{data?.change?.toFixed(2)} ({isUp ? '+' : ''}{data?.change_percent?.toFixed(2)}%)
             </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-dark-400 relative z-10 pt-4 border-t border-dark-700/50">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Vol: {(data?.volume / 1000000).toFixed(1)}M
        </span>
        <span className="font-mono text-[10px] uppercase bg-dark-800 px-2 py-0.5 rounded text-dark-300">
          {data?.market}
        </span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [indianStocks, setIndianStocks] = useState([]);
  const [usStocks, setUsStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const symbols = [...indianStocks, ...usStocks].map(s => s.symbol);
  const { data: liveData, connected } = useWebSocket(symbols);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
         const [indRes, usRes] = await Promise.all([
           stocksAPI.getIndianStocks(6),
           stocksAPI.getUSStocks(6)
         ]);
         setIndianStocks(indRes.data);
         setUsStocks(usRes.data);
      } catch (err) {
         console.error("Failed to load dashboard data", err);
      } finally {
         setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-8 pb-10">
      
      {/* Header & Connection status */}
      <div className="flex justify-between items-center bg-dark-900/40 p-5 rounded-2xl border border-dark-700/50 shadow-inner backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Market Overview</h1>
          <p className="text-dark-400 text-sm mt-1">Real-time data feeds enabled</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 border border-dark-700">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs font-semibold text-dark-200">
            {connected ? 'LIVE CONNECTION' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Indian Market Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
               <Activity className="w-4 h-4 text-orange-400" />
             </div>
             <h2 className="text-xl font-bold text-white">Indian Markets (NSE)</h2>
           </div>
           <Link to="/stock/RELIANCE.NS" className="text-sm font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1 group">
             Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {indianStocks.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} liveData={liveData[stock.symbol]} />
          ))}
        </div>
      </section>

      {/* US Market Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
               <Activity className="w-4 h-4 text-blue-400" />
             </div>
             <h2 className="text-xl font-bold text-white">US Markets (NASDAQ/NYSE)</h2>
           </div>
           <Link to="/stock/AAPL" className="text-sm font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1 group">
             Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {usStocks.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} liveData={liveData[stock.symbol]} />
          ))}
        </div>
      </section>

    </div>
  );
}

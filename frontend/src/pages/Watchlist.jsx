import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tradingAPI } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Star, TrendingUp, TrendingDown, ArrowRight, X } from 'lucide-react';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const symbols = watchlist.map(w => w.symbol);
  const { data: liveData } = useWebSocket(symbols);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await tradingAPI.getWatchlist();
      setWatchlist(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeStock = async (symbol, e) => {
    e.preventDefault(); // Prevent triggering link navigation
    try {
      await tradingAPI.removeFromWatchlist(symbol);
      setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
         <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-8 pb-10">
      <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow">
           <Star className="w-5 h-5 text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white tracking-tight">Your Watchlist</h1>
      </div>

      {watchlist.length === 0 ? (
        <div className="glass-card p-16 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-dark-500 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">Watchlist is Empty</h2>
            <p className="text-dark-400 mb-6">Keep track of your favorite stocks by adding them to your watchlist.</p>
            <Link to="/dashboard" className="btn-primary inline-flex">Explore Markets</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {watchlist.map((item) => {
             const data = liveData[item.symbol] || { 
               symbol: item.symbol, 
               price: item.price, 
               change: 0, 
               change_percent: 0 
             };
             const isUp = data?.change >= 0;

             return (
               <Link key={item.symbol} to={`/stock/${item.symbol}`} className="glass-card-hover p-5 block relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl -translate-y-12 translate-x-12 transition-colors" />
                  
                  <button 
                     onClick={(e) => removeStock(item.symbol, e)}
                     className="absolute top-4 right-4 p-1.5 rounded-md text-dark-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all z-20 bg-dark-800"
                     title="Remove"
                  >
                     <X className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between items-start mb-4 relative z-10">
                     <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors tracking-tight">
                        {data.symbol}
                     </h3>
                     <div className="text-right pr-6 group-hover:pr-8 transition-all duration-300">
                        <div className="text-lg font-mono font-bold text-white tracking-tight">
                           ₹{data.price?.toFixed(2)}
                        </div>
                        <div className={`mt-1 flex justify-end items-center gap-1 ${isUp ? 'text-profit' : 'text-loss'}`}>
                           {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                           <span className="font-semibold text-sm font-mono">
                             {isUp ? '+' : ''}{data.change?.toFixed(2)} ({isUp ? '+' : ''}{data.change_percent?.toFixed(2)}%)
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-dark-400 relative z-10 pt-4 border-t border-dark-700/50">
                     <span className="text-primary-400 font-medium group-hover:underline flex items-center gap-1">
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                     </span>
                     <span className="text-dark-500 flex items-center gap-1">
                        Added: {new Date(item.added_at).toLocaleDateString()}
                     </span>
                  </div>
               </Link>
             )
          })}
        </div>
      )}
    </div>
  );
}

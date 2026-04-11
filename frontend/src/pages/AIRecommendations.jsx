import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiAPI } from '../api';
import { BrainCircuit, TrendingUp, TrendingDown, Target, Zap, Activity } from 'lucide-react';

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await aiAPI.getRecommendations('all', 12);
        setRecommendations(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
            <BrainCircuit className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-400 animate-pulse" />
         </div>
         <p className="mt-4 text-dark-400 font-medium animate-pulse">Running neural network models...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-8 pb-10">
      
      {/* Header Panel */}
      <div className="glass-card p-6 md:p-8 bg-gradient-to-r from-dark-900 to-indigo-950/80 border-indigo-500/20 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 mix-blend-screen" />
         
         <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
            <div className="max-w-xl">
               <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow">
                     <BrainCircuit className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white tracking-tight">
                     AI Prediction Engine
                  </h1>
               </div>
               <p className="text-indigo-200/70 leading-relaxed font-light">
                  Our LSTM neural network parses historical performance, volume trends, and technical indicators to forecast next-day price movements with probability confidences.
               </p>
            </div>

            <div className="bg-dark-900/60 backdrop-blur-md p-4 rounded-xl border border-indigo-500/20 text-sm whitespace-nowrap hidden lg:block">
               <div className="flex items-center gap-2 text-indigo-300 font-mono mb-2">
                  <Activity className="w-4 h-4" /> Model Status: <span className="text-emerald-400 uppercase tracking-widest font-bold">Online</span>
               </div>
               <div className="flex items-center gap-2 text-indigo-300 font-mono">
                  <Zap className="w-4 h-4" /> Execution Time: <span className="font-bold text-white">~450ms</span>
               </div>
            </div>
         </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-20 text-dark-400">No predictions available at this time.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => {
             const isUp = rec.prediction === 'UP';
             const confidencePct = Math.round(rec.confidence * 100);
             
             return (
               <Link key={rec.symbol} to={`/stock/${rec.symbol}`} className="glass-card-hover p-6 block group relative overflow-hidden">
                  
                  {/* Decorative glow matching prediction */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 opacity-20 transition-all duration-500 group-hover:opacity-40
                     ${isUp ? 'bg-emerald-500' : 'bg-red-500'}
                  `} />

                  <div className="flex justify-between items-start mb-6 relative z-10">
                     <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-primary-400 transition-colors">
                        {rec.symbol}
                     </h2>
                     <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider mb-1 block">Forecast</span>
                        <div className={`flex items-center gap-1.5 font-bold font-mono tracking-wider px-3 py-1.5 rounded-lg border 
                           ${isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]'}
                        `}>
                           {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                           {rec.prediction}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                     <div>
                        <span className="text-dark-500 text-xs font-semibold uppercase tracking-wider block mb-1">Current LTP</span>
                        <div className="text-white font-mono font-bold text-lg">₹{rec.current_price?.toFixed(2)}</div>
                     </div>
                     <div>
                        <span className="text-dark-500 text-xs font-semibold uppercase tracking-wider block mb-1">Target Price</span>
                        <div className="text-white font-mono font-bold text-lg flex items-center gap-1">
                           <Target className="w-4 h-4 opacity-70" />
                           ₹{rec.predicted_price?.toFixed(2)}
                        </div>
                     </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="relative z-10">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-dark-300">Model Confidence</span>
                        <span className={`text-sm font-bold font-mono ${confidencePct > 70 ? (isUp ? 'text-emerald-400' : 'text-red-400') : 'text-yellow-400'}`}>
                           {confidencePct}%
                        </span>
                     </div>
                     <div className="h-2 w-full bg-dark-800 rounded-full overflow-hidden">
                        <div 
                           className={`h-full rounded-full transition-all duration-1000 ease-out`}
                           style={{ 
                              width: `${confidencePct}%`,
                              background: isUp 
                                 ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)' 
                                 : 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)'
                           }}
                        />
                     </div>
                  </div>

                  {/* Technicals Mini */}
                  {rec.indicators && (
                     <div className="mt-6 pt-4 border-t border-dark-700/50 flex justify-between items-center text-xs relative z-10">
                        <div className="flex flex-col gap-0.5">
                           <span className="text-dark-500">RSI: <span className="text-white font-mono ml-1">{rec.indicators.rsi?.toFixed(0)}</span></span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-dark-500">MACD: <span className="text-white font-mono ml-1">{rec.indicators.macd?.toFixed(1)}</span></span>
                        </div>
                     </div>
                  )}
               </Link>
             )
          })}
        </div>
      )}
    </div>
  );
}

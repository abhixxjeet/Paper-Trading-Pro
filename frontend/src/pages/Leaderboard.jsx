import { useState, useEffect } from 'react';
import { tradingAPI } from '../api';
import { Trophy, Medal, MapPin, Activity } from 'lucide-react';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await tradingAPI.getLeaderboard();
        setLeaders(res.data);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const getMedalColor = (index) => {
    switch (index) {
      case 0: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'; // Gold
      case 1: return 'text-slate-300 bg-slate-300/10 border-slate-300/30'; // Silver
      case 2: return 'text-amber-600 bg-amber-600/10 border-amber-600/30'; // Bronze
      default: return 'text-dark-400 bg-dark-800 border-dark-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8 pb-10">
      
      {/* Header Panel */}
      <div className="glass-card p-6 md:p-8 bg-gradient-to-r from-dark-900 to-amber-950/40 border-amber-500/20 relative overflow-hidden flex flex-col items-center text-center">
         <div className="absolute top-0 right-1/2 w-[300px] h-[300px] bg-amber-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 mix-blend-screen" />
         
         <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] mb-4 relative z-10">
            <Trophy className="w-8 h-8 text-white" />
         </div>
         <h1 className="text-4xl font-black text-transparent bg-clip-text text-gradient-gold tracking-tight relative z-10 mb-3">
            Top Traders
         </h1>
         <p className="text-amber-100/70 max-w-lg mb-2 relative z-10">
            Climb the ranks by maximizing your simulated portfolio's net worth. Compete against others in real-time.
         </p>
      </div>

      {leaders.length === 0 ? (
        <div className="text-center py-20 text-dark-400">No leaderboard data found.</div>
      ) : (
        <div className="glass-card overflow-hidden border border-dark-700/60 shadow-xl">
           <div className="bg-dark-900/60 flex items-center p-4 border-b border-dark-700/60 sticky top-0 z-10 backdrop-blur-md">
              <div className="w-16 text-center text-xs font-semibold text-dark-400 uppercase tracking-wider">Rank</div>
              <div className="flex-1 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Trader Profile</div>
              <div className="w-32 text-right px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider hidden sm:block">Trades</div>
              <div className="w-32 lg:w-48 text-right px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">P&L / Net Worth</div>
           </div>

           <div className="divide-y divide-dark-700/30">
              {leaders.map((leader, index) => {
                 const isPositive = leader.pnl >= 0;

                 return (
                   <div key={index} className="flex items-center p-4 hover:bg-dark-800/50 transition-colors group">
                      
                      {/* Rank Column */}
                      <div className="w-16 flex justify-center">
                         <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold font-mono text-sm shadow-inner transition-transform group-hover:scale-110 ${getMedalColor(index)}`}>
                            {index < 3 ? <Medal className="w-4 h-4" /> : `#${index + 1}`}
                         </div>
                      </div>

                      {/* Name Column */}
                      <div className="flex-1 px-4 flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center hidden sm:flex shrink-0">
                            <span className="font-bold text-white text-lg">{leader.name.charAt(0).toUpperCase()}</span>
                         </div>
                         <div>
                            <h3 className="font-bold text-white text-base md:text-lg tracking-tight group-hover:text-primary-400 transition-colors">{leader.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-dark-400 mt-0.5 sm:hidden">
                               <Activity className="w-3 h-3" /> {leader.trades} trades
                            </div>
                         </div>
                      </div>

                      {/* Trades Column (Desktop) */}
                      <div className="w-32 text-right px-4 hidden sm:block">
                         <span className="font-mono text-dark-200 font-medium">{leader.trades}</span>
                      </div>

                      {/* Financials Column */}
                      <div className="w-32 lg:w-48 text-right px-4 flex flex-col items-end justify-center">
                         <span className="font-mono font-bold text-white tracking-tight">
                            ₹{leader.total_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                         </span>
                         <div className={`flex items-center gap-1 text-sm font-semibold font-mono mt-0.5 ${isPositive ? 'text-profit' : 'text-loss'}`}>
                            {isPositive ? '+' : ''}{leader.pnl_percent.toFixed(2)}%
                         </div>
                      </div>

                   </div>
                 )
              })}
           </div>
        </div>
      )}
    </div>
  );
}

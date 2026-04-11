import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { Users, Activity, Banknote, ShieldAlert, BarChart3, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminAPI.getDashboard();
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to load admin dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6 pb-10">
      
      {/* Header Panel */}
      <div className="glass-card p-6 bg-gradient-to-r from-dark-900 to-red-950/20 border-red-500/20 flex flex-col items-start justify-between sm:flex-row sm:items-center relative overflow-hidden">
         <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 mix-blend-screen" />
         
         <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto mb-4 sm:mb-0">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
               <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
               <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-red-200 tracking-tight">
                  Admin Overview
               </h1>
               <p className="text-red-200/70 text-sm mt-0.5">Manage users, monitor metrics, adjust simulation</p>
            </div>
         </div>

         <div className="bg-dark-900/60 backdrop-blur-md p-3 px-5 rounded-xl border border-red-500/20 text-sm flex items-center gap-3 relative z-10 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-dark-300 font-semibold uppercase tracking-wider text-xs">Trading Engine Status</span>
            {metrics?.trading_enabled ? (
               <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-widest text-xs px-2 py-1 bg-emerald-500/10 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Active
               </span>
            ) : (
               <span className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-widest text-xs px-2 py-1 bg-red-500/10 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> Disabled
               </span>
            )}
         </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card p-6 border-t-2 border-primary-500 hover:border-primary-400 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary-500/10 rounded-xl">
               <Users className="w-6 h-6 text-primary-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dark-400 bg-dark-800 px-2 py-1 rounded">Total</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-mono text-white tracking-tight">{metrics?.total_users?.toLocaleString()}</h3>
            <p className="text-sm text-dark-400 mt-1 font-medium">Registered Users</p>
          </div>
        </div>

        <div className="glass-card p-6 border-t-2 border-emerald-500 hover:border-emerald-400 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
               <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dark-400 bg-dark-800 px-2 py-1 rounded">7 Days</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-mono text-white tracking-tight">{metrics?.active_users?.toLocaleString()}</h3>
            <p className="text-sm text-dark-400 mt-1 font-medium">Active Traders</p>
          </div>
        </div>

        <div className="glass-card p-6 border-t-2 border-indigo-500 hover:border-indigo-400 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
               <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dark-400 bg-dark-800 px-2 py-1 rounded">Total</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold font-mono text-white tracking-tight">{metrics?.total_trades?.toLocaleString()}</h3>
            <p className="text-sm text-dark-400 mt-1 font-medium">Trades Executed</p>
          </div>
        </div>

        <div className="glass-card p-6 border-t-2 border-amber-500 hover:border-amber-400 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
               <Banknote className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dark-400 bg-dark-800 px-2 py-1 rounded">INR/USD</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-mono text-white tracking-tight">₹{(metrics?.total_volume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            <p className="text-sm text-dark-400 mt-1 font-medium">Trading Volume</p>
          </div>
        </div>
      </div>

      {/* Most Traded Section */}
      <div className="glass-card p-6 pb-2">
         <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-dark-700/50 pb-4">
            <TrendingUp className="w-5 h-5 text-primary-400" /> Most Traded Stocks (Platform-wide)
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {metrics?.most_traded?.length > 0 ? (
               metrics.most_traded.map((item, idx) => (
                   <div key={item.symbol} className="bg-dark-900/40 p-4 rounded-xl border border-dark-700 flex justify-between items-center group hover:bg-dark-800/80 transition-colors">
                      <div className="flex items-center gap-3">
                         <span className="text-sm font-black text-dark-500 w-4 group-hover:text-primary-400 transition-colors">{idx + 1}</span>
                         <div>
                            <div className="font-bold text-white text-lg tracking-tight group-hover:text-primary-400 transition-colors">{item.symbol}</div>
                            <div className="text-xs text-dark-400 font-medium">{(item.trades || item.count || 0).toLocaleString()} trades</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider block mb-0.5">Count</span>
                         <div className="font-mono text-white font-bold tracking-tight bg-dark-800 px-2 rounded">
                            {(item.trades || item.count || 0)}
                         </div>
                      </div>
                   </div>
                ))
            ) : (
               <div className="col-span-full py-8 text-center text-dark-400">
                  <BarChart3 className="w-8 h-8 opacity-20 mx-auto mb-2" />
                  No trading data available yet.
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

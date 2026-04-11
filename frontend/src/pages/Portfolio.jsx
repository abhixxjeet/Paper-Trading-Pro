import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tradingAPI } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function Portfolio() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // We extract symbols from holdings to listen to live prices
  const symbols = summary?.holdings.map(h => h.symbol) || [];
  const { data: liveData } = useWebSocket(symbols);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await tradingAPI.getPortfolio();
        setSummary(res.data);
      } catch (err) {
        console.error("Failed to load portfolio", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!summary) return <div className="text-center text-red-400 mt-20">Failed to load portfolio data.</div>;

  // Recalculate values with live data if available
  let liveCurrentValue = 0;
  let liveInvestedAmount = summary.invested_amount;
  
  const liveHoldings = summary.holdings.map(h => {
    const lData = liveData[h.symbol];
    const currentPrice = lData ? lData.price : h.current_price;
    const totalValue = currentPrice * h.quantity;
    const invested = h.avg_price * h.quantity;
    const pnl = totalValue - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
    
    liveCurrentValue += totalValue;

    return {
      ...h,
      current_price: currentPrice,
      total_value: totalValue,
      pnl: pnl,
      pnl_percent: pnlPercent
    };
  });

  const liveTotalPnl = liveCurrentValue - liveInvestedAmount;
  const liveTotalPnlPercent = liveInvestedAmount > 0 ? (liveTotalPnl / liveInvestedAmount) * 100 : 0;
  const totalNetWorth = summary.available_balance + liveCurrentValue;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  const pieData = liveHoldings.map((h, i) => ({
    name: h.symbol,
    value: h.total_value,
    color: COLORS[i % COLORS.length]
  }));
  if(summary.available_balance > 0) {
     pieData.unshift({
        name: 'Cash',
        value: summary.available_balance,
        color: '#334155'
     });
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-8 pb-10">
      
      <div className="flex items-center gap-3 mb-2">
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow">
           <Wallet className="w-5 h-5 text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white tracking-tight">Your Portfolio</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:bg-primary-500/10 transition-colors" />
          <span className="text-sm font-semibold text-dark-400 uppercase tracking-wider block mb-2 relative z-10">Net Worth</span>
          <span className="text-3xl font-bold font-mono text-white relative z-10">₹{totalNetWorth.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:bg-emerald-500/10 transition-colors" />
          <span className="text-sm font-semibold text-dark-400 uppercase tracking-wider block mb-2 relative z-10">Invested Setup</span>
          <span className="text-3xl font-bold font-mono text-white relative z-10">₹{liveInvestedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>

        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:bg-blue-500/10 transition-colors" />
          <span className="text-sm font-semibold text-dark-400 uppercase tracking-wider block mb-2 relative z-10">Cash Balance</span>
          <span className="text-3xl font-bold font-mono text-primary-400 relative z-10">₹{summary.available_balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>

        <div className="glass-card p-6 border-t-2" style={{borderTopColor: liveTotalPnl >= 0 ? '#10b981' : '#ef4444'}}>
          <span className="text-sm font-semibold text-dark-400 uppercase tracking-wider block mb-2">Total P&L</span>
          <div className={`flex items-baseline gap-2 ${liveTotalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
             <span className="text-3xl font-bold font-mono">
                {liveTotalPnl >= 0 ? '+' : ''}₹{liveTotalPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
             </span>
             <span className="text-lg font-semibold font-mono opacity-80">
                ({liveTotalPnl >= 0 ? '+' : ''}{liveTotalPnlPercent.toFixed(2)}%)
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Holdings Table */}
         <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col">
            <div className="p-5 border-b border-dark-700/50 flex items-center justify-between">
               <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-400" /> Current Holdings
               </h3>
               <span className="text-xs font-semibold text-dark-400 bg-dark-800 px-3 py-1 rounded-full border border-dark-700">
                  {liveHoldings.length} Assets
               </span>
            </div>

            {liveHoldings.length === 0 ? (
               <div className="p-10 text-center text-dark-400">
                  <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>You don't have any stocks yet.</p>
                  <Link to="/dashboard" className="text-primary-400 mt-2 block hover:underline">Explore markets</Link>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-dark-900/50 border-b border-dark-700/50">
                           <th className="table-header">Symbol</th>
                           <th className="table-header text-right">Qty</th>
                           <th className="table-header text-right">Avg Price</th>
                           <th className="table-header text-right">LTP</th>
                           <th className="table-header text-right">Total Value</th>
                           <th className="table-header text-right">P&L</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-dark-700/30">
                        {liveHoldings.map((h, i) => (
                           <tr key={h.symbol} className="hover:bg-dark-800/50 transition-colors group">
                              <td className="table-cell font-bold text-white group-hover:text-primary-400 transition-colors">
                                 <Link to={`/stock/${h.symbol}`}>{h.symbol}</Link>
                              </td>
                              <td className="table-cell font-mono text-right text-dark-200">{h.quantity}</td>
                              <td className="table-cell font-mono text-right text-dark-300">₹{h.avg_price.toFixed(2)}</td>
                              <td className="table-cell font-mono text-right text-dark-100">₹{h.current_price.toFixed(2)}</td>
                              <td className="table-cell font-mono text-right font-medium text-white">₹{h.total_value.toFixed(2)}</td>
                              <td className="table-cell text-right font-mono">
                                 <div className={`inline-flex items-center gap-1 ${h.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {h.pnl >= 0 ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                                    {h.pnl >= 0 ? '+' : ''}₹{h.pnl.toFixed(2)} ({h.pnlPercent >= 0 ? '+' : ''}{h.pnl_percent.toFixed(2)}%)
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>

         {/* Allocation Chart */}
         <div className="glass-card p-6 flex flex-col h-[450px]">
            <h3 className="font-bold text-white text-lg mb-6 border-b border-dark-700/50 pb-4">Allocation</h3>
            {pieData.length > 0 ? (
               <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={100}
                           paddingAngle={5}
                           dataKey="value"
                           stroke="none"
                        >
                           {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <RechartsTooltip 
                           formatter={(value) => `₹${Number(value).toFixed(2)}`}
                           contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                           itemStyle={{ fontWeight: 'bold' }}
                        />
                     </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend */}
                  <div className="mt-4 max-h-[120px] overflow-y-auto space-y-2 pr-2">
                     {pieData.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="font-semibold text-dark-300">{entry.name}</span>
                           </div>
                           <span className="font-mono text-dark-200">
                              {((entry.value / totalNetWorth) * 100).toFixed(1)}%
                           </span>
                        </div>
                     ))}
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex items-center justify-center text-dark-500 font-medium">
                  No allocation data
               </div>
            )}
         </div>

      </div>
    </div>
  );
}

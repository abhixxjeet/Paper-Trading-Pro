import { useState, useEffect } from 'react';
import { tradingAPI } from '../api';
import { History, ArrowDownLeft, ArrowUpRight, Calendar, DollarSign } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await tradingAPI.getTransactions();
        setTransactions(res.data);
      } catch (err) {
        console.error("Failed to load transactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
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
      
      <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow">
           <History className="w-5 h-5 text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white tracking-tight">Transaction History</h1>
      </div>

      <div className="glass-card overflow-hidden">
         {transactions.length === 0 ? (
            <div className="p-16 text-center text-dark-400">
               <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
               <p className="text-lg">No trading history found.</p>
               <p className="text-sm mt-2 opacity-70">Execute trades in the virtual terminal to see them here.</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-dark-900/50 border-b border-dark-700/50">
                        <th className="table-header">Date & Time</th>
                        <th className="table-header">Type</th>
                        <th className="table-header">Symbol</th>
                        <th className="table-header text-right">Qty</th>
                        <th className="table-header text-right">Price</th>
                        <th className="table-header text-right">Fees</th>
                        <th className="table-header text-right">Total Flow</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/30">
                     {transactions.map((t) => {
                        const date = new Date(t.timestamp);
                        const isBuy = t.type === 'BUY';
                        
                        return (
                           <tr key={t.id} className="hover:bg-dark-800/50 transition-colors">
                              <td className="table-cell border-l-4 border-l-transparent" style={{borderLeftColor: isBuy ? '#10b981' : '#ef4444'}}>
                                 <div className="flex items-center gap-2 text-dark-300">
                                    <Calendar className="w-4 h-4 opacity-50" />
                                    <span>{date.toLocaleDateString()}</span>
                                    <span className="text-dark-500 text-xs">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 </div>
                              </td>
                              <td className="table-cell">
                                 <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wider
                                    ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                                 `}>
                                    {isBuy ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                    {t.type}
                                 </div>
                              </td>
                              <td className="table-cell font-bold text-white tracking-wide">
                                 {t.symbol}
                              </td>
                              <td className="table-cell text-right font-mono text-dark-200">
                                 {t.quantity}
                              </td>
                              <td className="table-cell text-right font-mono text-dark-300">
                                 ₹{t.price.toFixed(2)}
                              </td>
                              <td className="table-cell text-right font-mono text-dark-400 text-xs">
                                 ₹{t.fee.toFixed(2)}
                              </td>
                              <td className="table-cell text-right font-mono font-bold">
                                 <span className={isBuy ? 'text-loss' : 'text-profit'}>
                                    {isBuy ? '-' : '+'}₹{(t.total_amount).toFixed(2)}
                                 </span>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}
      </div>

    </div>
  );
}

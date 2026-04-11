import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { History, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await adminAPI.getTransactions(150); // Get recent 150 across platform
        setTransactions(res.data);
      } catch (err) {
        console.error("Failed to load global transactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-8 pb-10">
      
      <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-glow">
           <History className="w-5 h-5 text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white tracking-tight">Global Trading Ledger</h1>
      </div>

      <div className="glass-card overflow-hidden">
         {transactions.length === 0 ? (
            <div className="p-16 text-center text-dark-400">
               <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
               <p className="text-lg">No platform transactions found.</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-dark-900/70 border-b border-dark-700/70">
                        <th className="table-header">Date & Time</th>
                        <th className="table-header">User ID</th>
                        <th className="table-header">Type</th>
                        <th className="table-header">Symbol</th>
                        <th className="table-header text-right">Qty</th>
                        <th className="table-header text-right">Price</th>
                        <th className="table-header text-right">Total Amount</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/40">
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
                                <span className="font-mono text-dark-500 text-xs font-bold border border-dark-700 bg-dark-900 px-2 py-1 rounded">#{t.user_id}</span>
                              </td>
                              <td className="table-cell">
                                 <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-widest uppercase
                                    ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                                 `}>
                                    {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                    {t.type}
                                 </div>
                              </td>
                              <td className="table-cell font-bold text-white tracking-wide text-sm">
                                 {t.symbol}
                              </td>
                              <td className="table-cell text-right font-mono text-dark-200">
                                 {t.quantity}
                              </td>
                              <td className="table-cell text-right font-mono text-dark-300">
                                 ₹{t.price.toFixed(2)}
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

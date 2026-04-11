import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { Settings, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    transaction_fee_percent: 0.1,
    slippage_percent: 0.05,
    trading_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // We can fetch current settings from the dashboard endpoint (since it includes them)
    const fetchSettings = async () => {
      try {
        const res = await adminAPI.getDashboard();
        setSettings({
          transaction_fee_percent: res.data.transaction_fee || 0.1,
          slippage_percent: res.data.slippage || 0.05,
          trading_enabled: res.data.trading_enabled ?? true,
        });
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await adminAPI.updateSettings({
        transaction_fee_percent: parseFloat(settings.transaction_fee_percent),
        slippage_percent: parseFloat(settings.slippage_percent),
        trading_enabled: settings.trading_enabled,
      });
      setMessage({ type: 'success', text: 'Simulation rules updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6 pb-10">
      
      <div className="flex items-center gap-3 mb-6">
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-glow">
           <Settings className="w-5 h-5 text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white tracking-tight">Simulation Rules</h1>
      </div>

      {message && (
         <div className={`p-4 rounded-xl flex items-start gap-2 text-sm font-medium animate-slide-up ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {message.text}
         </div>
      )}

      <form onSubmit={handleSave} className="glass-card p-6 md:p-8 border border-dark-700/60 relative overflow-hidden">
         {/* Decorative red gradient */}
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
         
         <div className="space-y-8 relative z-10">
            
            {/* Global Trading Switch */}
            <div className="pb-8 border-b border-dark-700/50">
               <h3 className="text-lg font-bold text-white mb-2">Platform Status</h3>
               <p className="text-sm text-dark-400 leading-relaxed mb-4 max-w-xl">
                  Enable or disable the trading engine. When disabled, users can view their portfolios and access AI predictions, but cannot execute BUY or SELL operations.
               </p>
               
               <label className="flex items-center gap-4 cursor-pointer">
                 <div className="relative">
                   <input
                     type="checkbox"
                     className="sr-only"
                     checked={settings.trading_enabled}
                     onChange={(e) => setSettings({...settings, trading_enabled: e.target.checked})}
                   />
                   <div className={`block w-14 h-8 rounded-full border border-dark-600 transition-colors ${settings.trading_enabled ? 'bg-emerald-500' : 'bg-dark-800'}`}></div>
                   <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.trading_enabled ? 'transform translate-x-6' : ''}`}></div>
                 </div>
                 <div className="flex flex-col">
                    <span className={`font-bold ${settings.trading_enabled ? 'text-emerald-400' : 'text-dark-400'}`}>
                      {settings.trading_enabled ? 'TRADING ACTIVE' : 'TRADING DISABLED (MAINTENANCE MODE)'}
                    </span>
                 </div>
               </label>
            </div>

            {/* Trading Economics */}
            <div>
               <h3 className="text-lg font-bold text-white mb-2">Market Economics Simulator</h3>
               <p className="text-sm text-dark-400 leading-relaxed mb-6 max-w-xl">
                  Adjust simulated transaction fees and market slippage. These values affect trade execution prices and simulated costs.
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-dark-300 block ml-1">Transaction Fee (%)</label>
                    <div className="relative">
                       <input
                         type="number"
                         step="0.01"
                         min="0"
                         max="10"
                         value={settings.transaction_fee_percent}
                         onChange={(e) => setSettings({...settings, transaction_fee_percent: e.target.value})}
                         className="input-field shadow-inner font-mono text-dark-100 pr-10"
                         required
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-dark-500">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-dark-300 block ml-1">Slippage (%)</label>
                    <div className="relative">
                       <input
                         type="number"
                         step="0.01"
                         min="0"
                         max="5"
                         value={settings.slippage_percent}
                         onChange={(e) => setSettings({...settings, slippage_percent: e.target.value})}
                         className="input-field shadow-inner font-mono text-dark-100 pr-10"
                         required
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-dark-500">%</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t border-dark-700/50 flex justify-end">
               <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
               >
                 {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                    <>
                       <Save className="w-4 h-4" /> Save Configuration
                    </>
                 )}
               </button>
            </div>
         </div>
      </form>

    </div>
  );
}

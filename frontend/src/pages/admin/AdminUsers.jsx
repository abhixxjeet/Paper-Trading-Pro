import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { Users, Search, RefreshCw, Ban, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.getUsers(100); // Fetching top 100 for simplicity
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlockToggle = async (userId, isBlocked) => {
    try {
      await adminAPI.updateUser(userId, { is_blocked: !isBlocked });
      setUsers(users.map(u => u.id === userId ? { ...u, is_blocked: !isBlocked } : u));
      setActionMessage({ type: 'success', text: `User ${userId} ${!isBlocked ? 'blocked' : 'unblocked'} successfully.` });
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to update user status.' });
    } setTimeout(() => setActionMessage(null), 3000);
  };

  const handleResetBalance = async (userId) => {
    if (!window.confirm("Are you sure you want to reset this user's balance to default?")) return;
    try {
      await adminAPI.resetBalance(userId);
      fetchUsers(); // Refresh to get updated balance
      setActionMessage({ type: 'success', text: `Balance reset for User ${userId}.` });
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to reset balance.' });
    } setTimeout(() => setActionMessage(null), 3000);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-glow">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
         </div>
         
         <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input 
               type="text" 
               placeholder="Search by name or email..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="input-field py-2 pl-9 rounded-full shadow-inner text-sm"
            />
         </div>
      </div>

      {actionMessage && (
         <div className={`p-4 rounded-xl flex items-start gap-2 text-sm font-medium animate-slide-up ${actionMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {actionMessage.text}
         </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
           <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-dark-900/80 border-b border-dark-700/80">
                       <th className="table-header py-4">ID</th>
                       <th className="table-header py-4">User Details</th>
                       <th className="table-header py-4 text-center">Status</th>
                       <th className="table-header py-4 text-right">Balance</th>
                       <th className="table-header py-4 text-right">Trades</th>
                       <th className="table-header py-4 text-center">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-dark-700/40">
                    {filteredUsers.length === 0 ? (
                       <tr><td colSpan="6" className="text-center py-8 text-dark-400 font-medium">No users found.</td></tr>
                    ) : filteredUsers.map((user) => (
                       <tr key={user.id} className="hover:bg-dark-800/50 transition-colors">
                          <td className="table-cell font-mono text-dark-500 text-xs font-bold w-16">
                             #{user.id}
                          </td>
                          <td className="table-cell">
                             <div className="flex flex-col">
                                <span className="font-bold text-white text-base">{user.name}</span>
                                <span className="text-xs text-dark-400 font-mono mt-0.5">{user.email}</span>
                             </div>
                          </td>
                          <td className="table-cell text-center">
                             {user.is_blocked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                   Blocked
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                   Active
                                </span>
                             )}
                          </td>
                          <td className="table-cell text-right">
                             <span className="font-mono text-white font-bold tracking-tight">₹{user.balance?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                          </td>
                          <td className="table-cell text-right">
                             <span className="font-mono text-dark-200 bg-dark-800 border border-dark-700 px-2 py-0.5 rounded text-sm">{user.trades}</span>
                          </td>
                          <td className="table-cell">
                             <div className="flex items-center justify-center gap-2">
                                <button 
                                   onClick={() => handleResetBalance(user.id)}
                                   className="p-2 rounded bg-dark-800 border border-dark-700 text-primary-400 hover:bg-primary-500/20 hover:border-primary-500/50 hover:text-primary-300 transition-all group"
                                   title="Reset Balance (₹1,00,000)"
                                >
                                   <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                                <button 
                                   onClick={() => handleBlockToggle(user.id, user.is_blocked)}
                                   className={`p-2 rounded border transition-all ${user.is_blocked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-dark-800 border-dark-700 text-red-500 hover:bg-red-500/20 hover:border-red-500/50'}`}
                                   title={user.is_blocked ? "Unblock Account" : "Block Account"}
                                >
                                   {user.is_blocked ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
}

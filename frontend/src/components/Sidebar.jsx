import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  LineChart, 
  Wallet, 
  History, 
  Star, 
  BrainCircuit, 
  Trophy,
  Activity,
  Users,
  Settings,
  ShieldAlert
} from 'lucide-react';

export default function Sidebar({ isAdmin }) {
  const { user } = useAuth();

  const userLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/portfolio', label: 'Portfolio', icon: Wallet },
    { to: '/watchlist', label: 'Watchlist', icon: Star },
    { to: '/transactions', label: 'History', icon: History },
    { to: '/ai-recommendations', label: 'AI Predict', icon: BrainCircuit },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Overview', icon: Activity },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/transactions', label: 'All Trades', icon: History },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <aside className="w-64 flex-shrink-0 glass-card m-4 mr-0 hidden md:flex flex-col border-r-0 rounded-r-none">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow">
          <LineChart className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold font-mono text-gradient tracking-tight">
          StockSim
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-2">
        {isAdmin && (
          <div className="px-3 py-2 mb-2">
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-red-500" />
              Admin Panel
            </span>
          </div>
        )}
        
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/dashboard'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
              ${isActive 
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800 border border-transparent'}
            `}
          >
            <Icon className="w-5 h-5 opacity-80" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Info Snippet */}
      <div className="p-4 m-4 rounded-xl bg-dark-900/50 border border-dark-700/50 flex flex-col gap-1">
        <span className="text-xs text-dark-400 block truncate">Logged in as</span>
        <span className="text-sm font-medium text-dark-200 truncate">{user?.name}</span>
        <span className="text-xs font-mono text-primary-400 mt-1 uppercase tracking-widest">{user?.role}</span>
      </div>
    </aside>
  );
}

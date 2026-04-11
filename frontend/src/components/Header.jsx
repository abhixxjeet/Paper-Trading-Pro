import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, LogOut, Menu, UserCircle, Shield } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // In a real app we'd trigger a global search overlay,
      // here we might just navigate if it matches a symbol
      navigate(`/stock/${searchQuery.toUpperCase()}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-20 flex-shrink-0 glass-card m-4 ml-0 md:ml-4 rounded-l-none md:rounded-l-2xl flex items-center justify-between px-6 z-10 sticky top-0">
      
      {/* Left side mobile menu toggle / Title */}
      <div className="flex items-center gap-4">
        <button className="md:hidden text-dark-300 hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-dark-200 font-medium hidden sm:block capitalize">
          {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
        </span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Search stock (e.g. AAPL, RELIANCE.NS)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900/40 border border-dark-700/50 rounded-full pl-10 pr-4 py-2 text-sm text-dark-200 
                       placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 focus:bg-dark-900/80 
                       transition-all duration-300 shadow-inner"
          />
        </form>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        
        {/* Balance Display */}
        {user?.role === 'user' && (
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-xs text-dark-400 font-medium tracking-wide">AVAILABLE MARGIN</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              ₹{user?.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-dark-700/50 text-dark-300 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-500 rounded-full border border-dark-900"></span>
        </button>

        {/* User Menu / Logout */}
        <div className="flex items-center gap-3 pl-4 border-l border-dark-700/50">
          <div className="w-9 h-9 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 overflow-hidden">
             {user?.role === 'admin' ? <Shield className="w-5 h-5 text-red-400" /> : <UserCircle className="w-6 h-6" />}
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-dark-400 hover:text-red-400 transition-colors hidden sm:block"
          >
            Logout
          </button>
          <button onClick={handleLogout} className="sm:hidden text-dark-400 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  );
}

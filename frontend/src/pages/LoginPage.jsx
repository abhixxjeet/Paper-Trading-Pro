import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LineChart, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-hero-pattern relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3" />

      {/* Hero Section (Left) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10 border-r border-dark-800/50 bg-dark-900/30 backdrop-blur-sm">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow-lg mb-8 outline outline-1 outline-white/10">
            <LineChart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-primary-300 leading-tight">
            Master the Market.<br />Risk-Free Trading.
          </h1>
          <p className="mt-6 text-lg text-dark-300 max-w-lg leading-relaxed font-light">
            Paper Trading Pro combines real-time data from Indian and US markets with advanced AI predictions. Practice your strategies securely with a virtual ₹1,00,000 portfolio.
          </p>
        </div>

        {/* Feature list */}
        <div className="mt-12 space-y-5">
          {[
             "Live NSE, BSE & Global market data", 
             "AI-powered LSTM price predictions",
             "Zero-risk virtual trading environment"
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <span className="text-dark-200 font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Section (Right) */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 relative z-10 bg-dark-950/50">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow">
              <LineChart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold font-mono text-gradient">Paper Trading Pro</span>
          </div>

          <div className="glass-card p-8 sm:p-10 border border-dark-700/60 shadow-2xl relative overflow-hidden group">
            {/* Edge glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary-500/30 transition-all duration-700" />
            
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-dark-400 mb-8 font-medium">Log in to track your portfolio and AI insights.</p>
            
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-1 w-full animate-slide-up">
                <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">Authentication Failed</span>
                </div>
                <div className="text-xs text-red-300 ml-6 break-words">{error}</div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-dark-300 block ml-1" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field shadow-inner font-mono text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="space-y-2 relative">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-semibold text-dark-300" htmlFor="password">Password</label>
                  <a href="#" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field shadow-inner font-mono text-sm pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-primary group relative overflow-hidden mt-2 h-12 flex items-center justify-center"
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                <div className="relative z-10 flex flex-row items-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-dark-400 font-medium">
              New to Paper Trading Pro?{' '}
              <Link to="/register" className="text-primary-400 font-semibold hover:text-primary-300 hover:underline underline-offset-4 transition-all">
                Create an account
              </Link>
            </p>

            {/* Demo credentials */}
            <div className="mt-6 p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
              <p className="text-xs font-semibold text-primary-400 mb-2 uppercase tracking-wider">Demo Credentials</p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => { setEmail('demo@papertradingpro.com'); setPassword('demo123'); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-dark-800/60 hover:bg-dark-700/80 transition-colors text-xs group"
                >
                  <span className="text-dark-300 group-hover:text-white transition-colors">
                    Trader: <span className="font-mono text-dark-200">demo@papertradingpro.com</span> / <span className="font-mono text-dark-200">demo123</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('admin@papertradingpro.com'); setPassword('admin123'); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-dark-800/60 hover:bg-dark-700/80 transition-colors text-xs group"
                >
                  <span className="text-dark-300 group-hover:text-white transition-colors">
                    Admin: <span className="font-mono text-dark-200">admin@papertradingpro.com</span> / <span className="font-mono text-dark-200">admin123</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

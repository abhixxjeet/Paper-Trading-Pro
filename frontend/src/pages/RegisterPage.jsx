import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LineChart, AlertCircle, ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-hero-pattern relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3" />

      {/* Form Section (Left side for variation) */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 relative z-10 bg-dark-950/50 lg:order-1">
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
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary-500/20 rounded-full blur-[50px] -translate-y-1/2 -translate-x-1/2 group-hover:bg-primary-500/30 transition-all duration-700" />
            
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
               Get Started <UserPlus className="w-6 h-6 text-primary-400" />
            </h2>
            <p className="text-dark-400 mb-8 font-medium">Create an account to start paper trading.</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-1 w-full animate-slide-up">
                <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">Registration Error</span>
                </div>
                <div className="text-xs text-red-300 ml-6 break-words">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-dark-300 block ml-1" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field shadow-inner text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-1.5">
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

              <div className="space-y-1.5 position-relative">
                <label className="text-sm font-semibold text-dark-300 block ml-1" htmlFor="password">Password</label>
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
                <div className="text-[11px] text-dark-500 mt-1 ml-1 font-medium">
                  {password.length > 0 && password.length < 6 ? (
                     <span className="text-red-400">Requires at least 6 characters</span>
                  ) : "Minimum 6 characters required"}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-primary group relative overflow-hidden mt-4 h-12 flex items-center justify-center shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40"
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                <div className="relative z-10 flex flex-row items-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-dark-400 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 font-semibold hover:text-primary-300 hover:underline underline-offset-4 transition-all">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section (Right side) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10 border-l border-dark-800/50 bg-dark-900/30 backdrop-blur-sm lg:order-2">
         <div className="mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-glow-lg mb-8 outline outline-1 outline-white/10">
            <LineChart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-primary-300 leading-tight">
            Learn to trade.<br />Without the risk.
          </h1>
          <p className="mt-6 text-lg text-dark-300 max-w-lg leading-relaxed font-light">
            Join thousands of users practicing their trading strategies. Build your ₹1,00,000 demo portfolio and track your skills against the market.
          </p>
        </div>

        {/* Start info */}
        <div className="mt-12">
            <div className="glass-card p-6 border-indigo-500/30 bg-indigo-500/5 flex gap-4 text-left">
              <div className="p-3 bg-indigo-500/20 rounded-xl max-h-12 w-12 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/30">✨</div>
              <div>
                <h4 className="font-semibold text-white">Instant ₹1,00,000 Demo Balance</h4>
                <p className="text-sm text-dark-300 mt-1 leading-relaxed">Your account will be immediately credited with virtual funds upon registration. Start trading real stocks instantly with simulated money.</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

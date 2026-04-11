import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('stocksim_user');
    const token = localStorage.getItem('stocksim_token');
    
    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Refresh user data
        authAPI.getMe()
          .then((res) => {
            setUser(res.data);
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('stocksim_token');
            localStorage.removeItem('stocksim_user');
            setUser(null);
          });
      } catch {
        localStorage.removeItem('stocksim_user');
        localStorage.removeItem('stocksim_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    return meRes.data;
  };

  const register = async (name, email, password) => {
    await authAPI.register({ name, email, password });
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('stocksim_token');
    localStorage.removeItem('stocksim_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch (e) { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

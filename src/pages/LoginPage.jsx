import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Lock, Mail, ArrowRight, RefreshCw, AlertCircle, Shield, User, Users } from 'lucide-react';

export default function LoginPage() {
  const { user, login, isSetup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If system is not yet setup, redirect to first-run setup
  if (!isSetup) {
    return <Navigate to="/setup" replace />;
  }

  // If already logged in, redirect based on role
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else if (loggedUser.role === 'hr') navigate('/hr/dashboard');
      else navigate('/employee/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-500/25">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Quick<span className="text-indigo-600 dark:text-indigo-400">Serve</span> Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Workforce Management by Affanverse
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Logins for Judges */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Demo / Judge Credentials Helper
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuickLogin('admin@company.com', 'AdminPass123!')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-semibold text-[11px]">Admin Demo</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickLogin('hr@company.com', 'HRpass123!')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-[11px]">HR Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage = ({ onSwitchToRegister }) => {
  const { login, authError, setAuthError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setAuthError(null);

    if (!username.trim() || !password) {
      setLocalError('Please enter both your username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-6 relative overflow-hidden font-sans">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 border border-teal-400/30">
            <Activity className="h-7 w-7 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            StatQ <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">2.0</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide uppercase">
            Emergency Department Triage & Care
          </p>
        </div>

        {/* Error Alert */}
        {(localError || authError) && (
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {localError || authError}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter staff username"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secure password"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In to Department
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        {/* Switch to Registration */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 flex flex-col items-center gap-3">
          <p className="text-xs text-slate-400">
            New clinical staff member or administrator?
          </p>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Shield className="h-3.5 w-3.5" />
            Request Staff Account
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0 mt-0.5" />
          <span>
            Protected with Argon2id cryptographic hashing, server-side encrypted sessions, and Role-Based Access Control.
          </span>
        </div>
      </div>
    </div>
  );
};

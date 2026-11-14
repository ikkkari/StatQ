import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Lock, User, Mail, Building2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const RegisterPage = ({ onSwitchToLogin }) => {
  const { register, login, setAuthError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Emergency Department');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setAuthError(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Register new user (will be status: PENDING, role: UNASSIGNED)
      await register({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        department: department.trim() || 'Emergency Department',
      });

      // Automatically log in as the newly registered user so they land on Pending Approval view
      await login(username.trim(), password);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your inputs.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 border border-teal-400/30">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Staff Account Request
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium text-center">
            Register your staff credentials for emergency department triage access
          </p>
        </div>

        {/* Security Policy Alert */}
        <div className="mb-5 p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-blue-200 text-xs flex items-start gap-2.5">
          <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="font-medium leading-relaxed">
            <span className="font-semibold text-blue-300">Approval Policy: </span>
            All new staff accounts start in <span className="font-bold text-amber-300">PENDING</span> status. An administrator must approve your account and assign your clinical role before access to live patient records is granted.
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Jordan Vance, MD or Sarah Jenkins, RN"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jvance"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@hospital.org"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Clinical Department
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Emergency Department"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting Request...
              </span>
            ) : (
              'Submit Registration Request'
            )}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-700/60 flex justify-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

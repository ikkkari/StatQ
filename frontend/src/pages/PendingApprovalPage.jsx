import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldAlert, RefreshCw, LogOut, User, CheckCircle2 } from 'lucide-react';

export const PendingApprovalPage = () => {
  const { user, refreshUser, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/3 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md border border-amber-500/30 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Account Pending Approval
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
            Your registration was received. For clinical safety and patient privacy, an administrator must verify your identity and assign your role before you can access the emergency triage queue.
          </p>
        </div>

        {/* Account Details Box */}
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-4 mb-6 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span>Staff Name:</span>
            <span className="font-semibold text-slate-200">{user?.full_name}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span>Username:</span>
            <span className="font-mono text-slate-200">{user?.username}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span>Department:</span>
            <span className="text-slate-200">{user?.department}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <span>Account Status:</span>
            <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              PENDING
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Role Assigned:</span>
            <span className="italic text-slate-400">Unassigned (Awaiting Admin)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 text-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Check Approval Status
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-xl border border-slate-600/60 flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Bottom explanation */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
          <p className="text-[11px] text-slate-500">
            Need immediate emergency access? Contact the ER charge nurse or system administrator on duty.
          </p>
        </div>
      </div>
    </div>
  );
};

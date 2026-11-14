import React from 'react';
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  DoorOpen,
  Activity,
  BarChart3,
  Settings,
  PlusCircle,
  HeartPulse,
  ShieldCheck,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab, onOpenRegister }) => {
  const { queueData, rooms, simulation, wsConnected } = useApp();
  const { user, logout, hasRole } = useAuth();

  const waitingCount = queueData?.total_waiting || 0;
  const occupiedRooms = rooms?.filter((r) => r.is_occupied).length || 0;
  const totalRooms = rooms?.length || 6;

  const isAdmin = hasRole('ADMIN');
  const isNurse = hasRole('NURSE');
  const isFrontDesk = hasRole('FRONT_DESK');

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      visible: true,
    },
    {
      id: 'queue',
      label: 'Live Triage Queue',
      icon: ListOrdered,
      badge: waitingCount > 0 ? waitingCount : null,
      badgeColor: 'bg-amber-400 text-slate-900',
      visible: true,
    },
    {
      id: 'patients',
      label: 'Patient Records',
      icon: Users,
      badge: null,
      visible: true,
    },
    {
      id: 'rooms',
      label: 'Treatment Rooms',
      icon: DoorOpen,
      badge: `${occupiedRooms}/${totalRooms}`,
      badgeColor: occupiedRooms === totalRooms ? 'bg-red-400 text-slate-900' : 'bg-blue-400 text-slate-900',
      visible: true,
    },
    {
      id: 'simulation',
      label: 'Simulation Center',
      icon: Activity,
      badge: simulation?.is_active ? 'LIVE' : null,
      badgeColor: 'bg-emerald-400 text-slate-900 animate-pulse',
      visible: true,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
      visible: true,
    },
    {
      id: 'admin-users',
      label: 'Staff Approvals',
      icon: ShieldCheck,
      badge: null,
      visible: isAdmin,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
      visible: isAdmin,
    },
  ];

  const getInitials = (name) => {
    if (!name) return 'ED';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950 text-white flex flex-col shrink-0 select-none border-r border-blue-900/40">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <HeartPulse className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white font-sans">StatQ</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-teal-500/30 text-teal-300 rounded border border-teal-400/30 uppercase tracking-widest">
                2.0
              </span>
            </div>
            <p className="text-[11px] text-blue-200/70 font-medium tracking-tight">Triage & Queue System</p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={onOpenRegister}
          className="w-full py-2.5 px-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/30 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300/50">
          Clinical Operations
        </div>

        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/90 text-white font-bold shadow-sm shadow-blue-600/30 translate-x-1'
                    : 'text-blue-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-300/70'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      item.badgeColor || 'bg-white/20 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* DSA Telemetry Status */}
      <div className="p-3.5 m-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-blue-200">DSA Min-Heap</span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {wsConnected ? 'Sync Active' : 'Offline'}
          </span>
        </div>
        <div className="text-[11px] text-blue-200/80 font-mono">
          O(log N) Priority Queue
        </div>
      </div>

      {/* Authenticated Staff Footer Profile */}
      <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-blue-400/40 flex items-center justify-center font-bold text-xs text-blue-200 shrink-0">
            {getInitials(user?.full_name)}
          </div>
          <div className="truncate min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.full_name || 'Staff Member'}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-300/80">
              <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {user?.role || 'STAFF'}
              </span>
              <span className="truncate">{user?.department || 'Emergency'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 text-blue-300/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

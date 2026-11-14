import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Clock,
  Radio,
  UserCheck,
  Bell,
  FastForward,
  Play,
  Pause,
  ArrowRight,
  ShieldAlert,
  Hash,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SeverityBadge } from './SeverityBadge';

export const Header = ({ onSelectPatient }) => {
  const { simulation, wsConnected, callNext, advanceTime, notifications, queueData } = useApp();
  const { hasRole } = useAuth();

  const canCallNext = hasRole(['ADMIN', 'NURSE']);
  const canAdvanceTime = hasRole(['ADMIN', 'NURSE']);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [calling, setCalling] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const searchBoxRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchMeta(null);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.trim();
        // If starts with PT- or matches ID pattern, search by id
        const isId = query.toUpperCase().startsWith('PT-');
        const res = await api.getPatients({
          query,
          search_by: isId ? 'id' : 'name',
        });
        setSearchResults(res.slice(0, 6));
        setSearchMeta({
          algorithm: isId ? 'O(1) Hash Map ID' : 'O(N) Linear Search Name',
          isId,
        });
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to dismiss search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCallNext = async () => {
    setCalling(true);
    await callNext();
    setCalling(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Global Search Bar */}
      <div className="relative flex-1 max-w-md" ref={searchBoxRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
            placeholder="Search patient by ID (O(1) Hash Map) or Name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs border border-transparent focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Instant Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
            {searchMeta && (
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Method: {searchMeta.algorithm}</span>
                <span className="text-blue-600 font-bold">{searchResults.length} match(es)</span>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isSearching ? 'Searching database...' : 'No matching patient records found'}
                </div>
              ) : (
                searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectPatient(p.id);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="p-3 hover:bg-blue-50/60 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{p.full_name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">
                          {p.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{p.chief_complaint}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={p.effective_severity} size="sm" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">{p.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-3.5">
        {/* Simulation Clock Display */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Simulated Clock:</span>
          <span className="font-mono font-bold text-slate-900">
            {simulation?.simulated_time ? simulation.simulated_time.split(' ')[1] : '00:00:00'}
          </span>
          {canAdvanceTime && (
            <button
              onClick={() => advanceTime(5.0)}
              className="ml-1 p-1 hover:bg-slate-200 text-blue-700 rounded transition cursor-pointer"
              title="Advance Simulated Time +5m (triggers priority aging)"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live WebSocket Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            wsConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
          title={wsConnected ? 'Real-time WebSocket Live Sync Active' : 'Disconnected from WebSocket'}
        >
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="hidden sm:inline">{wsConnected ? 'Live Sync' : 'Offline'}</span>
        </div>

        {/* Call Next Patient Quick Action (ADMIN and NURSE only) */}
        {canCallNext && (
          <button
            onClick={handleCallNext}
            disabled={calling || queueData.total_waiting === 0}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            title="Extract highest-priority patient from Python min-heap via heapq.heappop() [O(log N)]"
          >
            <UserCheck className="w-4 h-4" />
            <span>Call Next</span>
          </button>
        )}

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl relative transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs">
              <div className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Recent System Alerts</span>
                <span className="text-[10px] text-slate-400">{notifications.length} new</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-slate-400 text-center py-3">No active notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-lg border text-[11px] ${
                        n.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                          : n.type === 'warning'
                          ? 'bg-amber-50 text-amber-800 border-amber-100'
                          : n.type === 'error'
                          ? 'bg-red-50 text-red-800 border-red-100'
                          : 'bg-blue-50 text-blue-800 border-blue-100'
                      }`}
                    >
                      {n.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Save,
  CheckCircle,
  HelpCircle,
  Layers,
  Cpu,
  Hash,
  Database,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const SettingsPage = () => {
  const { refreshAll, addNotification } = useApp();

  const [agingInterval, setAgingInterval] = useState(5.0);
  const [hospitalName, setHospitalName] = useState('MetroHealth Emergency Center');
  const [autoAdvanceSec, setAutoAdvanceSec] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      setAgingInterval(res.aging_interval_minutes || 5.0);
      setHospitalName(res.hospital_name || 'MetroHealth Emergency Center');
      setAutoAdvanceSec(res.auto_advance_seconds || 5);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({
        aging_interval_minutes: parseFloat(agingInterval),
        hospital_name: hospitalName.trim(),
        auto_advance_seconds: parseInt(autoAdvanceSec, 10),
      });
      addNotification('System configuration successfully updated.', 'success');
      refreshAll();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Algorithm Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tune priority aging intervals, hospital profile, and explore academic DSA implementation notes
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-sm font-bold text-slate-900">Hospital & Simulation Parameters</h2>
          <p className="text-xs text-slate-500">Configures operational defaults and automated timers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Hospital Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Hospital Emergency Department Name</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Priority Aging Interval */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Priority Aging Interval (Minutes)
              </label>
              <span className="text-xs font-mono font-bold text-blue-600">{agingInterval} min</span>
            </div>
            <input
              type="number"
              min="1"
              max="60"
              step="1"
              value={agingInterval}
              onChange={(e) => setAgingInterval(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-400">
              Each patient's acuity level improves by 1 score after waiting this many simulated minutes.
            </p>
          </div>

          {/* Auto Advance Interval */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Auto Simulation Tick Speed (Seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={autoAdvanceSec}
              onChange={(e) => setAutoAdvanceSec(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-400">
              Frequency of automated background time advancement when simulation is running.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Academic DSA Presentation Guide Card */}
      <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <Cpu className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Academic DSA Architectural Defense</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1.5">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Why Binary Min-Heap?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              A naive sorted list requires <strong>O(N)</strong> insertion time to maintain order on each incoming patient. Python’s <code className="text-blue-300">heapq</code> provides logarithmic <strong>O(log N)</strong> insertion and extraction, ensuring scalable throughput for large hospital trauma surges.
            </p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1.5">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <Hash className="w-4 h-4" />
              <span>Why In-Memory Hash Map?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Querying the database on every micro-look up incurs I/O overhead. An in-memory dictionary cache enables true <strong>O(1)</strong> amortized record retrieval by patient ID, while persistent SQLite guarantees durability.
            </p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>FIFO Preservation</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              The heap entry tuple is <code className="text-amber-300">(effective_severity, arrival_order, id)</code>. When two patients share identical priority, Python compares the second element, guaranteeing strict First-In-First-Out processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

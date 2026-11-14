import React, { useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  UserPlus,
  Clock,
  Zap,
  Layers,
  ShieldAlert,
  Sliders,
  CheckCircle,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';

export const SimulationPage = ({ onSelectPatient }) => {
  const { simulation, queueData, refreshAll, addNotification, advanceTime } = useApp();

  const [batchCount, setBatchCount] = useState(5);
  const [advancingMinutes, setAdvancingMinutes] = useState(5.0);
  const [generating, setGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);

  const waitingItems = queueData?.items || [];

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.generatePatients(batchCount);
      addNotification(`Generated ${batchCount} simulated emergency patients into Min-Heap.`, 'success');
      refreshAll();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvance = async (mins) => {
    try {
      setAdvancing(true);
      await advanceTime(mins);
    } finally {
      setAdvancing(false);
    }
  };

  const handleToggle = async () => {
    try {
      setToggling(true);
      const res = await api.toggleSimulation();
      addNotification(res.message, res.is_active ? 'success' : 'info');
      refreshAll();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all simulated patients? Real normal records will be preserved.')) {
      return;
    }
    try {
      setResetting(true);
      const res = await api.resetSimulation(true);
      addNotification(res.message, 'info');
      refreshAll();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Busy Day Simulation Center</h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                simulation?.is_active
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${simulation?.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {simulation?.is_active ? 'Auto Ticker Running' : 'Simulation Paused'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stress-test queue throughput, priority aging, and heap reorganizations under emergency rush conditions
          </p>
        </div>

        {/* Global Reset Button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition flex items-center gap-1.5"
          title="Clear simulated patients and re-heapify the queue"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Resetting...' : 'Reset Simulation'}</span>
        </button>
      </div>

      {/* Control Station Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Batch Patient Generator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Simulate Patient Rush</span>
            </div>
            <p className="text-xs text-slate-500">
              Generates arrivals with realistic symptoms, ages, and weighted severity scores.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Rush Volume:</span>
              <span className="font-mono text-blue-600 font-bold">{batchCount} Patients</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchCount(n)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                    batchCount === n
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{n}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{generating ? 'Injecting into Min-Heap...' : `Generate ${batchCount} Incoming Patients`}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Advance Simulation Clock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <FastForward className="w-4 h-4 text-amber-600" />
              <span>Fast-Forward Simulated Time</span>
            </div>
            <p className="text-xs text-slate-500">
              Advances the clock to age waiting patients and trigger <code className="font-mono">heapq.heapify()</code>.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Current Simulation Clock:</span>
              <span className="font-mono text-slate-900 font-bold">{simulation?.simulated_time || '00:00:00'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[5, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleAdvance(mins)}
                  disabled={advancing}
                  className="py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition"
                >
                  +{mins} min
                </button>
              ))}
            </div>

            <button
              onClick={() => handleAdvance(advancingMinutes)}
              disabled={advancing}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              <span>{advancing ? 'Re-heapifying...' : `Advance Clock (+${advancingMinutes}m)`}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Continuous Ticker Toggle */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Automated Background Loop</span>
            </div>
            <p className="text-xs text-slate-500">
              When active, time advances smoothly every {simulation?.auto_advance_interval_seconds || 5} seconds.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600">Simulated Elapsed:</span>
              <span className="font-mono font-bold text-slate-900">
                {Math.round(simulation?.simulated_minutes_elapsed || 0)} min total
              </span>
            </div>

            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`w-full py-2 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 ${
                simulation?.is_active
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {simulation?.is_active ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Background Loop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Continuous Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Priority Aging Live Visualizer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Priority Aging Escalation Visualizer</h3>
              <p className="text-xs text-slate-500">
                Acuity improves 1 level every {simulation?.aging_interval || 5} simulated minutes until Level 1 (Critical)
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
            Interval: {simulation?.aging_interval || 5} mins
          </span>
        </div>

        {waitingItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            No patients waiting in queue. Click "Generate Patients" above to simulate an emergency influx!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {waitingItems.map((item) => {
              const agingInterval = simulation?.aging_interval || 5.0;
              const waitMins = item.waiting_minutes;
              const progressInInterval = (waitMins % agingInterval) / agingInterval;
              const isAtMaxLevel = item.effective_severity === 1;

              return (
                <div
                  key={item.patient_id}
                  onClick={() => onSelectPatient(item.patient_id)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/60 hover:bg-white transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center">
                        #{item.position}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{item.full_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.patient_id}</span>
                    </div>

                    <SeverityBadge
                      severity={item.effective_severity}
                      hasAged={item.has_aged}
                      originalSeverity={item.original_severity}
                      size="sm"
                    />
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                    "{item.chief_complaint}"
                  </p>

                  {/* Progress towards next level */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Total Wait: {waitMins}m</span>
                      {isAtMaxLevel ? (
                        <span className="text-red-600 font-bold">Max Priority (Level 1)</span>
                      ) : (
                        <span>
                          Next Level Escalation in: <strong>{Math.round((agingInterval - (waitMins % agingInterval)) * 10) / 10}m</strong>
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAtMaxLevel ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: isAtMaxLevel ? '100%' : `${progressInInterval * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Cpu, ChevronDown, ChevronUp, Layers, Hash, GitBranch, ArrowUpRight, Zap, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DsaInfoPanel = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { dsaTelemetry, queueData } = useApp();

  const primary = dsaTelemetry?.primary_structure;
  const secondary = dsaTelemetry?.secondary_structure;
  const aging = dsaTelemetry?.aging_mechanism;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all duration-200">
      {/* Header bar / Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">How Queue Prioritization Works</span>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                Priority Queue | Binary Min-Heap
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Min-Heap ordering (Severity 1..5) &bull; FIFO tie-breaking &bull; Priority Aging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 font-mono">
            <span>Heap Size: <strong className="text-blue-700">{primary?.heap_size ?? queueData.total_waiting}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Pop: <strong className="text-emerald-700">O(log N)</strong></span>
            <span className="text-slate-300">|</span>
            <span>Lookup: <strong className="text-purple-700">O(1)</strong></span>
          </div>
          <button
            type="button"
            className="p-1 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-200/50"
            aria-label="Toggle DSA details"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 bg-white text-slate-700 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Prioritization Rules */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>1. Heap Sorting Criteria</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                <li>
                  <strong className="text-slate-800">Primary Key:</strong> Effective Severity (1=Critical is minimum key, extracted first).
                </li>
                <li>
                  <strong className="text-slate-800">Secondary Key:</strong> Arrival Sequence (FIFO order preserved for identical severities).
                </li>
                <li>
                  <strong className="text-slate-800">Tie Breaker:</strong> Monotonic arrival order guarantees fairness.
                </li>
              </ul>
            </div>

            {/* 2. Priority Aging */}
            <div className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>2. Priority Aging Mechanism</span>
              </div>
              <ul className="space-y-1.5 text-amber-900/90 list-disc list-inside">
                <li>
                  Every <strong className="text-amber-950">{aging?.interval_minutes ?? 5} min</strong> of waiting time, effective severity improves by 1 level.
                </li>
                <li>
                  Prevents starvation of lower-acuity (Level 4/5) patients.
                </li>
                <li>
                  Upon time advance, heap is reorganized via <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono">heapq.heapify()</code> in <strong>O(N)</strong> time.
                </li>
              </ul>
            </div>

            {/* 3. Hash Map Records */}
            <div className="p-3.5 bg-purple-50/50 rounded-lg border border-purple-200/60 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-purple-950">
                <Hash className="w-4 h-4 text-purple-600" />
                <span>3. In-Memory Hash Map</span>
              </div>
              <ul className="space-y-1.5 text-purple-900/90 list-disc list-inside">
                <li>
                  Patient IDs map directly to records via Python <code className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded font-mono">dict</code> with average <strong>O(1)</strong> lookup.
                </li>
                <li>
                  Persisted safely in SQLite database.
                </li>
                <li>
                  Name queries utilize case-insensitive <strong>O(N)</strong> linear scan with comparison counting.
                </li>
              </ul>
            </div>
          </div>

          {/* Real-time Telemetry Metrics */}
          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Heap Operation:</span>
              <span className="text-emerald-300 font-semibold">{primary?.last_operation || 'heapq.heappush()'}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <span>Heap Cost: <strong className="text-blue-400">{primary?.last_complexity || 'O(log N)'}</strong></span>
              <span>Total Heap Ops: <strong className="text-amber-300">{primary?.operation_count ?? 0}</strong></span>
              <span>Hash Map Lookups: <strong className="text-purple-300">{secondary?.lookup_count ?? 0}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

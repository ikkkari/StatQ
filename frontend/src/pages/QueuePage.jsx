import React, { useState } from 'react';
import {
  ListOrdered,
  UserCheck,
  Clock,
  FastForward,
  ShieldAlert,
  DoorOpen,
  ArrowRight,
  Filter,
  CheckCircle,
  Activity,
  Layers,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SeverityBadge } from '../components/SeverityBadge';
import { DsaInfoPanel } from '../components/DsaInfoPanel';

export const QueuePage = ({ onSelectPatient, onOpenRegister, onOpenDischarge }) => {
  const { queueData, rooms, callNext, advanceTime, activityLogs, dsaTelemetry } = useApp();

  const [calling, setCalling] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const items = queueData?.items || [];
  const totalWaiting = queueData?.total_waiting || 0;
  const occupiedRooms = rooms?.filter((r) => r.is_occupied).length || 0;
  const totalRooms = rooms?.length || 6;
  const availableRooms = totalRooms - occupiedRooms;

  const filteredItems = items.filter((item) => {
    if (filterSeverity === 'ALL') return true;
    return item.effective_severity === parseInt(filterSeverity, 10);
  });

  const handleCallNext = async () => {
    setCalling(true);
    await callNext();
    setCalling(false);
  };

  const handleAdvanceTime = async (mins) => {
    setAdvancing(true);
    await advanceTime(mins);
    setAdvancing(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Core Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Triage Queue</h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              Binary Min-Heap
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time patient prioritization based on clinical acuity (1=Critical) and arrival sequence (FIFO)
          </p>
        </div>

        {/* Priority Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Room Availability Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
              availableRooms > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>
              {availableRooms > 0
                ? `${availableRooms} of ${totalRooms} Rooms Ready`
                : 'All Treatment Rooms Full'}
            </span>
          </div>

          {/* Aging Fast Forward Button */}
          <button
            onClick={() => handleAdvanceTime(5.0)}
            disabled={advancing}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition flex items-center gap-1.5"
            title="Advance simulated clock by 5 minutes. Evaluates waiting times and rebuilds heap via heapq.heapify() [O(N)]"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{advancing ? 'Aging...' : '+5m Priority Aging'}</span>
          </button>

          {/* Primary Action: Call Next Patient */}
          <button
            onClick={handleCallNext}
            disabled={calling || totalWaiting === 0 || availableRooms === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition flex items-center gap-2"
            title={
              availableRooms === 0
                ? 'Cannot call patient: All treatment rooms are occupied.'
                : 'Extracts the highest-priority patient from the Python min-heap via heapq.heappop() [O(log N)]'
            }
          >
            <UserCheck className="w-4 h-4 stroke-[2.5]" />
            <span>{calling ? 'Processing...' : 'Call Next Patient'}</span>
          </button>

          {/* Register Patient Button */}
          <button
            onClick={onOpenRegister}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            + Register Patient
          </button>
        </div>
      </div>

      {/* Explanatory Banner: "How Queue Prioritization Works" */}
      <DsaInfoPanel />

      {/* Main Queue & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Queue Table (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Patient Queue Sequence</span>
              <span className="text-xs font-bold text-slate-500 font-mono">({totalWaiting} Waiting)</span>
            </div>

            {/* Severity Filter Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Filter Acuity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Severities (1-5)</option>
                <option value="1">Level 1 - Critical</option>
                <option value="2">Level 2 - High</option>
                <option value="3">Level 3 - Moderate</option>
                <option value="4">Level 4 - Low</option>
                <option value="5">Level 5 - Minor</option>
              </select>
            </div>
          </div>

          {/* Queue Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Patient ID / Name</th>
                  <th className="py-3 px-4">Acuity Level</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4">Chief Complaint</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      {totalWaiting === 0
                        ? 'No patients currently waiting in the triage queue.'
                        : 'No patients matching the selected filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => {
                    const isNextInLine = index === 0;

                    return (
                      <tr
                        key={item.patient_id}
                        className={`transition-colors hover:bg-blue-50/50 ${
                          isNextInLine ? 'bg-amber-50/40 font-medium' : ''
                        }`}
                      >
                        {/* Position Rank */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              isNextInLine
                                ? 'bg-amber-500 text-white shadow-xs animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            #{item.position}
                          </span>
                        </td>

                        {/* Patient ID & Name */}
                        <td className="py-3.5 px-4">
                          <div
                            onClick={() => onSelectPatient(item.patient_id)}
                            className="cursor-pointer group"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                              <span>{item.full_name}</span>
                              {isNextInLine && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                  NEXT
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {item.patient_id} &bull; Order #{item.arrival_order}
                            </div>
                          </div>
                        </td>

                        {/* Acuity / Severity Badge */}
                        <td className="py-3.5 px-4">
                          <SeverityBadge
                            severity={item.effective_severity}
                            hasAged={item.has_aged}
                            originalSeverity={item.original_severity}
                            size="sm"
                          />
                        </td>

                        {/* Wait Duration */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-700 font-mono font-semibold">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{item.waiting_minutes}m</span>
                          </div>
                          <div className="text-[10px] text-slate-400">arr: {item.arrival_time}</div>
                        </td>

                        {/* Complaint */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-600 line-clamp-2 leading-relaxed" title={item.chief_complaint}>
                            {item.chief_complaint}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => onSelectPatient(item.patient_id)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition"
                          >
                            Dossier
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Real-Time Queue Activity Log (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Mini Room Status Widget */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="text-xs font-bold text-slate-900">Treatment Room Capacity</div>
              <span className="text-xs font-mono font-semibold text-blue-600">
                {occupiedRooms} / {totalRooms} Occupied
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    if (room.is_occupied) onOpenDischarge(room);
                  }}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    room.is_occupied
                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-900'
                      : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900'
                  }`}
                  title={room.is_occupied ? `Occupied by ${room.current_patient_name} (Click to discharge)` : 'Available'}
                >
                  <div className="text-[11px] font-bold truncate">{room.id}</div>
                  <div className="text-[9px] font-semibold mt-0.5">
                    {room.is_occupied ? 'Occupied' : 'Ready'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Activity Log */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">Queue Activity Log</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Live Backend Stream</span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No recent queue events.</p>
              ) : (
                activityLogs.map((log) => {
                  const isPop = log.event_type === 'QUEUE_POP';
                  const isPush = log.event_type === 'QUEUE_PUSH';
                  const isAged = log.event_type === 'PRIORITY_AGED';

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-1 hover:bg-slate-100/60 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isPop
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPush
                              ? 'bg-blue-100 text-blue-800'
                              : isAged
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {log.event_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-snug">{log.description}</p>
                      {log.details && (
                        <div className="text-[10px] font-mono text-slate-500 bg-white/70 px-1.5 py-0.5 rounded border border-slate-200/60 truncate">
                          {log.details}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

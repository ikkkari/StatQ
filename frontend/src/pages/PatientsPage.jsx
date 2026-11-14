import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Hash,
  Clock,
  CheckCircle,
  FileText,
  DoorOpen,
  ArrowUpDown,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { useApp } from '../context/AppContext';

export const PatientsPage = ({ onSelectPatient, onOpenRegister }) => {
  const { refreshAll } = useApp();
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('all'); // all, id, name
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [dsaSearchTelemetry, setDsaSearchTelemetry] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, searchBy, filterSeverity, filterStatus]);

  const fetchPatients = async () => {
    setLoading(true);
    const t0 = performance.now();
    try {
      const res = await api.getPatients({
        query: searchQuery.trim(),
        search_by: searchBy,
        severity: filterSeverity !== 'ALL' ? parseInt(filterSeverity, 10) : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      });
      setPatients(res);

      const elapsed = Math.round((performance.now() - t0) * 100) / 100;
      if (searchQuery.trim()) {
        const isId = searchBy === 'id' || (searchBy === 'all' && searchQuery.toUpperCase().startsWith('PT-'));
        setDsaSearchTelemetry({
          algorithm: isId ? 'In-Memory Hash Map Lookup' : 'In-Memory Linear Search',
          complexity: isId ? 'O(1) average' : `O(N) with comparisons over ${res.length} matches`,
          durationMs: elapsed,
          query: searchQuery.trim(),
        });
      } else {
        setDsaSearchTelemetry(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Records Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository of all registered emergency department encounters & treatment dossiers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterSeverity('ALL');
              setFilterStatus('ALL');
              refreshAll();
              fetchPatients();
            }}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-xs transition"
            title="Refresh patient records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenRegister}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* Subtle DSA Notice Card */}
      <div className="p-3.5 bg-gradient-to-r from-purple-50/70 to-blue-50/40 rounded-xl border border-purple-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-900">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">Hash Map Record Architecture</div>
            <p className="text-[11px] text-slate-500">
              Patient IDs provide instantaneous average <strong className="text-purple-700">O(1)</strong> lookup via Python’s hash map dictionary alongside persistent SQLite storage.
            </p>
          </div>
        </div>

        {dsaSearchTelemetry && (
          <div className="font-mono text-[11px] bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-2xs text-purple-950 flex items-center gap-2">
            <span>Query: <strong>"{dsaSearchTelemetry.query}"</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-bold">{dsaSearchTelemetry.complexity}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Query Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient ID (e.g. PT-1001) or Full Name..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Search By Algorithm Mode */}
          <div className="md:col-span-3">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="all">Auto Search (ID or Name)</option>
              <option value="id">By ID (O(1) Hash Map)</option>
              <option value="name">By Name (O(N) Linear Scan)</option>
            </select>
          </div>

          {/* Filter Severity */}
          <div className="md:col-span-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">All Severities</option>
              <option value="1">L1 - Critical</option>
              <option value="2">L2 - High</option>
              <option value="3">L3 - Moderate</option>
              <option value="4">L4 - Low</option>
              <option value="5">L5 - Minor</option>
            </select>
          </div>

          {/* Filter Status */}
          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">Waiting</option>
              <option value="IN_TREATMENT">In Treatment</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Patient ID</th>
                <th className="py-3.5 px-4">Full Name & Demographics</th>
                <th className="py-3.5 px-4">Acuity Severity</th>
                <th className="py-3.5 px-4">Encounter Status</th>
                <th className="py-3.5 px-4">Wait Time</th>
                <th className="py-3.5 px-4">Chief Complaint</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Querying patient records...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No matching patient records found in database.
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const initials = p.full_name
                    ? p.full_name.split(' ').map((n) => n[0]).join('')
                    : 'PT';

                  const isWaiting = p.status === 'WAITING';
                  const isInTreatment = p.status === 'IN_TREATMENT';
                  const isCompleted = p.status === 'COMPLETED';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Patient ID with Hash map tag */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {p.id}
                        </span>
                      </td>

                      {/* Name & Demographics */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => onSelectPatient(p.id)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {p.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.age} yrs &bull; {p.sex}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4">
                        <SeverityBadge
                          severity={p.effective_severity}
                          hasAged={p.effective_severity < p.original_severity}
                          originalSeverity={p.original_severity}
                          size="sm"
                        />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isWaiting
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isInTreatment
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isWaiting ? 'bg-amber-500' : isInTreatment ? 'bg-blue-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{p.status}</span>
                        </span>
                      </td>

                      {/* Wait Time */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                        {Math.round(p.waiting_minutes)}m
                      </td>

                      {/* Complaint */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-1 italic" title={p.chief_complaint}>
                          "{p.chief_complaint}"
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectPatient(p.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded-lg border border-slate-200 transition"
                        >
                          View Dossier
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
    </div>
  );
};

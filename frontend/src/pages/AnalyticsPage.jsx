import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';

export const AnalyticsPage = () => {
  const { analytics } = useApp();

  const totalPatients = analytics?.total_patients ?? 0;
  const waitingPatients = analytics?.waiting_patients ?? 0;
  const inTreatment = analytics?.in_treatment_patients ?? 0;
  const completedPatients = analytics?.completed_patients ?? 0;
  const avgWait = analytics?.average_waiting_time_minutes ?? 0;
  const severityData = analytics?.severity_distribution || [];
  const statusData = analytics?.status_distribution || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical & Algorithmic Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time metrics computed directly from SQLite backend and in-memory heap structures
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Cumulative Census</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalPatients}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total registered records</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Average Wait Time</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{avgWait} mins</div>
          <div className="text-[11px] text-blue-600/80 font-medium mt-0.5">Mean queue duration</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Completed Encounters</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{completedPatients}</div>
          <div className="text-[11px] text-emerald-600/80 font-medium mt-0.5">Discharged patients</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Treatment Room Occupancy</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{analytics?.occupancy_rate ?? 0}%</div>
          <div className="text-[11px] text-amber-600/80 font-medium mt-0.5">{analytics?.occupied_rooms ?? 0} active bays</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Acuity Breakdown (Col 6) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Initial vs Effective Acuity</h3>
              <p className="text-[11px] text-slate-500">Demonstrates priority shift after aging escalation</p>
            </div>
            <span className="text-xs font-mono text-purple-700 font-semibold bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
              Aging Shift
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="level" tickFormatter={(lvl) => `L${lvl}`} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="count" name="Initial Severity" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="effective_count" name="Effective Severity (Aged)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Throughput State (Col 6) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clinical Workflow Throughput</h3>
              <p className="text-[11px] text-slate-500">Distribution of patients across care stages</p>
            </div>
            <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              Census State
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

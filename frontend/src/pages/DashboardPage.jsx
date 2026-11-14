import React from 'react';
import {
  Users,
  Clock,
  DoorOpen,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Activity,
  UserCheck,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
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
} from 'recharts';
import { useApp } from '../context/AppContext';
import { SeverityBadge } from '../components/SeverityBadge';
import { DsaInfoPanel } from '../components/DsaInfoPanel';

export const DashboardPage = ({ onSelectPatient, onOpenDischarge, onOpenRegister, setActiveTab }) => {
  const { analytics, queueData, rooms, callNext, advanceTime } = useApp();

  const totalPatients = analytics?.total_patients ?? 0;
  const waitingPatients = analytics?.waiting_patients ?? 0;
  const inTreatment = analytics?.in_treatment_patients ?? 0;
  const completedPatients = analytics?.completed_patients ?? 0;
  const avgWait = analytics?.average_waiting_time_minutes ?? 0;
  const occupiedRooms = analytics?.occupied_rooms ?? 0;
  const totalRooms = analytics?.total_rooms ?? 6;

  // Chart data
  const severityData = analytics?.severity_distribution || [];
  const statusData = analytics?.status_distribution || [];

  const topQueueItems = queueData?.items?.slice(0, 4) || [];
  const highestPatient = analytics?.highest_priority_patient;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Dashboard Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time emergency department census, priority triage queue, and room utilization
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => advanceTime(5.0)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition flex items-center gap-1.5"
            title="Advance simulated time by 5 minutes to trigger priority aging"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Advance Time (+5m)</span>
          </button>

          <button
            onClick={onOpenRegister}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5"
          >
            <span>+ Triage Intake</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards (Directly inspired by reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Card 1: Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Total Registered</span>
            <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
              {totalPatients}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              <span>Persistent in SQLite</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 2: Waiting in Heap */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Waiting in Queue</span>
            <div className="text-2xl font-extrabold text-amber-600 font-sans tracking-tight">
              {waitingPatients}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Avg Wait: <strong className="text-slate-800">{avgWait}m</strong>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 3: In Treatment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Active Treatment</span>
            <div className="text-2xl font-extrabold text-blue-600 font-sans tracking-tight">
              {occupiedRooms} <span className="text-sm font-normal text-slate-400">/ {totalRooms} Beds</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              {totalRooms - occupiedRooms} Rooms Available
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DoorOpen className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 4: Completed Treatments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Discharged / Completed</span>
            <div className="text-2xl font-extrabold text-emerald-600 font-sans tracking-tight">
              {completedPatients}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600">
              Throughput Complete
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* Highest Priority Patient Alert Banner if critical */}
      {highestPatient && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Highest-Priority Root Element (heap[0])
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white border border-red-300 text-red-800 rounded">
                  {highestPatient.patient_id}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                {highestPatient.full_name} &bull; Acuity Level {highestPatient.effective_severity}
              </h3>
              <p className="text-xs text-slate-600 line-clamp-1 italic mt-0.5">
                "{highestPatient.complaint}" (Waited {highestPatient.waiting_minutes}m)
              </p>
            </div>
          </div>

          <button
            onClick={callNext}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition shrink-0 flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Call Into Room (heappop)</span>
          </button>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Acuity Distribution Donut Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Patient Acuity Distribution</h3>
              <p className="text-[11px] text-slate-500">Triage Severity Levels 1 (Critical) to 5 (Minor)</p>
            </div>
            <span className="text-xs font-bold text-blue-600 font-mono">Total {totalPatients}</span>
          </div>

          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [`${val} patients`, item.payload.label]}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Acuity Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {severityData.map((d) => (
              <div key={d.level} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-700 truncate font-medium text-[11px]">{d.label.split(' - ')[1]}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono ml-2">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ER Flow & Status Bar Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Emergency Room Patient Census</h3>
              <p className="text-[11px] text-slate-500">Active throughput states across triage & treatment</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">Live Backend State</span>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} barSize={42}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px', color: '#FFF', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Waiting: Priority Min-Heap</span>
            <span>In Treatment: Room Allocation</span>
            <span>Completed: SQLite Archive</span>
          </div>
        </div>
      </div>

      {/* Two Split Tables (matching reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Next in Priority Queue */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Next In Priority Queue</h3>
              <p className="text-[11px] text-slate-500">Top prioritized patients waiting in Binary Min-Heap</p>
            </div>
            <button
              onClick={() => setActiveTab('queue')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topQueueItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No patients currently waiting in the triage queue.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topQueueItems.map((item, idx) => (
                <div
                  key={item.patient_id}
                  onClick={() => onSelectPatient(item.patient_id)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-700">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.full_name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{item.patient_id}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{item.chief_complaint}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SeverityBadge
                      severity={item.effective_severity}
                      hasAged={item.has_aged}
                      originalSeverity={item.original_severity}
                      size="sm"
                    />
                    <span className="text-[11px] font-mono text-slate-500">{item.waiting_minutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Treatment Rooms Status */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Treatment Rooms Overview</h3>
              <p className="text-[11px] text-slate-500">Live bed occupancy & physician assignments</p>
            </div>
            <button
              onClick={() => setActiveTab('rooms')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Manage Rooms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`p-3 rounded-xl border transition-all ${
                  room.is_occupied
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-emerald-50/40 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">{room.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      room.is_occupied
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {room.is_occupied ? 'Occupied' : 'Available'}
                  </span>
                </div>

                {room.is_occupied ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span className="truncate">{room.current_patient_name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{room.current_patient_id}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{room.assigned_doctor}</div>
                    <button
                      onClick={() => onOpenDischarge(room)}
                      className="w-full mt-1 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 rounded-md transition"
                    >
                      Conclude & Discharge
                    </button>
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-emerald-700 font-medium">
                    Ready for next patient
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle DSA Info Panel */}
      <DsaInfoPanel />
    </div>
  );
};

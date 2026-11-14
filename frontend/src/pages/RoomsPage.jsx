import React, { useState } from 'react';
import {
  DoorOpen,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  RefreshCw,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SeverityBadge } from '../components/SeverityBadge';
import { api } from '../services/api';

export const RoomsPage = ({ onSelectPatient, onOpenDischarge }) => {
  const { rooms, queueData, refreshAll, addNotification } = useApp();

  const [assigningRoomId, setAssigningRoomId] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.is_occupied).length;
  const availableRooms = totalRooms - occupiedRooms;
  const utilization = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const waitingPatients = queueData?.items || [];

  const handleManualAssign = async (roomId) => {
    if (!selectedPatientId) return;
    try {
      setSubmitting(true);
      await api.assignRoom(roomId, selectedPatientId);
      addNotification(`Patient ${selectedPatientId} assigned to ${roomId}`, 'success');
      setAssigningRoomId(null);
      setSelectedPatientId('');
      refreshAll();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Treatment Room Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor clinical bay occupancy, physician assignments, and patient treatment workflows
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-xs transition self-start sm:self-auto"
          title="Refresh rooms"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Treatment Bays</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalRooms}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Configured clinical capacity</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Currently Occupied</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{occupiedRooms}</div>
          <div className="text-[11px] text-blue-600/80 font-medium mt-0.5">Active medical interventions</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Available / Ready</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{availableRooms}</div>
          <div className="text-[11px] text-emerald-600/80 font-medium mt-0.5">Sanitized & ready for intake</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Bay Utilization</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{utilization}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                utilization >= 100
                  ? 'bg-red-500'
                  : utilization > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${utilization}%` }}
            />
          </div>
        </div>
      </div>

      {/* Full Rooms Warning Banner if 100% capacity */}
      {availableRooms === 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">All Treatment Rooms Occupied (Emergency Surge)</span>
              <p className="text-[11px] text-red-700 mt-0.5">
                Calling next patient is temporarily held until an active room is concluded and discharged.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map((room) => {
          const isOccupied = room.is_occupied;
          const isAssigning = assigningRoomId === room.id;

          return (
            <div
              key={room.id}
              className={`rounded-2xl border transition-all duration-150 p-5 flex flex-col justify-between ${
                isOccupied
                  ? 'bg-white border-blue-200 shadow-xs ring-1 ring-blue-500/10'
                  : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
              }`}
            >
              {/* Room Header */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isOccupied ? 'bg-blue-600 text-white shadow-xs' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">{room.name}</h3>
                      <span className="font-mono text-[10px] text-slate-400 font-semibold">{room.id}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isOccupied
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isOccupied ? 'Occupied' : 'Available'}
                  </span>
                </div>

                {/* Body Content */}
                <div className="py-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Acuity Suite Type:</span>
                    <span className="font-medium text-slate-800">{room.room_type}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Physician on Duty:</span>
                    <span className="font-medium text-slate-800">{room.assigned_doctor || 'Staff Physician'}</span>
                  </div>

                  {isOccupied ? (
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-900 uppercase">Admitted Patient</span>
                        <span className="font-mono text-[10px] font-bold text-blue-700 px-1.5 py-0.2 bg-white rounded border border-blue-200">
                          {room.current_patient_id}
                        </span>
                      </div>

                      <div
                        onClick={() => onSelectPatient(room.current_patient_id)}
                        className="font-bold text-sm text-slate-900 hover:text-blue-600 cursor-pointer transition"
                      >
                        {room.current_patient_name}
                      </div>

                      {room.current_patient_severity && (
                        <SeverityBadge severity={room.current_patient_severity} size="sm" />
                      )}

                      {room.current_patient_complaint && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                          "{room.current_patient_complaint}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      Bay unoccupied and sterilized
                    </div>
                  )}

                  {/* Manual Patient Assignment Form */}
                  {isAssigning && !isOccupied && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                      <label className="text-xs font-semibold text-slate-700">Select Waiting Patient:</label>
                      <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">-- Choose from waiting queue --</option>
                        {waitingPatients.map((p) => (
                          <option key={p.patient_id} value={p.patient_id}>
                            #{p.position} {p.full_name} (L{p.effective_severity} - {p.patient_id})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAssigningRoomId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!selectedPatientId || submitting}
                          onClick={() => handleManualAssign(room.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                        >
                          {submitting ? 'Assigning...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100">
                {isOccupied ? (
                  <button
                    onClick={() => onOpenDischarge(room)}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conclude Treatment & Discharge</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setAssigningRoomId(room.id)}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Seat Waiting Patient</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

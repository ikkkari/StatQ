import React, { useState, useEffect } from 'react';
import { X, User, Clock, ShieldAlert, Activity, Calendar, Hash, CheckCircle, Edit3, Save } from 'lucide-react';
import { api } from '../services/api';
import { SeverityBadge } from './SeverityBadge';
import { useApp } from '../context/AppContext';

export const PatientDetailModal = ({ isOpen, onClose, patientId }) => {
  const { refreshAll, addNotification } = useApp();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    age: '',
    original_severity: 3,
    chief_complaint: '',
    assigned_nurse: '',
  });

  useEffect(() => {
    if (isOpen && patientId) {
      loadPatient();
    } else {
      setData(null);
      setIsEditing(false);
    }
  }, [isOpen, patientId]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const res = await api.getPatientById(patientId);
      setData(res);
      setEditForm({
        full_name: res.patient.full_name,
        age: res.patient.age,
        original_severity: res.patient.original_severity,
        chief_complaint: res.patient.chief_complaint,
        assigned_nurse: res.patient.assigned_nurse || '',
      });

      const hist = await api.getPatientHistory(patientId).catch(() => []);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const patient = data?.patient;
  const dsa = data?.dsa_telemetry;

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updatePatient(patientId, {
        full_name: editForm.full_name,
        age: parseInt(editForm.age, 10),
        original_severity: parseInt(editForm.original_severity, 10),
        chief_complaint: editForm.chief_complaint,
        assigned_nurse: editForm.assigned_nurse,
      });
      addNotification(`Updated records for ${editForm.full_name}`, 'success');
      setIsEditing(false);
      loadPatient();
      refreshAll();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {patient?.full_name ? patient.full_name.split(' ').map((n) => n[0]).join('') : 'PT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{patient?.full_name || 'Patient Dossier'}</h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-blue-300 rounded border border-slate-700">
                  {patient?.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registered Arrival Order: #{patient?.arrival_order} &bull; Status: {patient?.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DSA Telemetry Banner */}
        {dsa && (
          <div className="px-6 py-2.5 bg-purple-50/80 border-b border-purple-200 flex items-center justify-between text-xs text-purple-900">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-600" />
              <span>
                <strong>DSA Lookup:</strong> Python Hash Map (<code className="font-mono text-purple-800">dict[id]</code>)
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="bg-purple-100 px-2 py-0.5 rounded border border-purple-300 text-[11px] font-semibold">
                Cost: {dsa.last_complexity || 'O(1) average'}
              </span>
              <span className="text-[11px] text-purple-700">
                Latency: {dsa.last_lookup_time_ms}ms
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading patient dossier...</div>
          ) : patient ? (
            <>
              {/* Edit Mode Toggle */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Clinical Record Information
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-md hover:bg-blue-50 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Patient Info</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-600">Editing Record...</span>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Age</label>
                      <input
                        type="number"
                        value={editForm.age}
                        onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Severity Score (1-5)</label>
                    <select
                      value={editForm.original_severity}
                      onChange={(e) => setEditForm({ ...editForm, original_severity: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="1">Level 1 - Critical (Immediate)</option>
                      <option value="2">Level 2 - High (Emergent)</option>
                      <option value="3">Level 3 - Moderate (Urgent)</option>
                      <option value="4">Level 4 - Low (Less Urgent)</option>
                      <option value="5">Level 5 - Minor (Non-Urgent)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Chief Complaint</label>
                    <textarea
                      rows={2}
                      value={editForm.chief_complaint}
                      onChange={(e) => setEditForm({ ...editForm, chief_complaint: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500">Effective Priority</div>
                      <div className="mt-1">
                        <SeverityBadge
                          severity={patient.effective_severity}
                          hasAged={patient.effective_severity < patient.original_severity}
                          originalSeverity={patient.original_severity}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500">Demographics</div>
                      <div className="mt-1 font-semibold text-slate-900 text-sm">
                        {patient.age} yrs &bull; {patient.sex}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500">Waiting Duration</div>
                      <div className="mt-1 font-semibold text-slate-900 text-sm flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{Math.round(patient.waiting_minutes)} mins</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500">Triage Nurse</div>
                      <div className="mt-1 font-semibold text-slate-900 text-xs truncate">
                        {patient.assigned_nurse || 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  {/* Complaint */}
                  <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100">
                    <div className="text-xs font-semibold text-blue-900 mb-1">Chief Intake Complaint</div>
                    <p className="text-sm text-slate-800 leading-relaxed font-medium">
                      {patient.chief_complaint}
                    </p>
                  </div>

                  {/* Room / Treatment Status */}
                  {patient.current_room_id && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                      <span className="font-semibold">Currently Under Treatment in Room:</span>
                      <span className="font-bold px-2 py-0.5 bg-emerald-600 text-white rounded">
                        {patient.current_room_id}
                      </span>
                    </div>
                  )}

                  {/* Treatment History Records */}
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold text-slate-700">Treatment & Encounter History</div>
                    {history.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 italic text-center">
                        No previous treatment records found for this encounter.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {history.map((h) => (
                          <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>Room: {h.room_name} ({h.room_id})</span>
                              <span className="text-emerald-700">{h.outcome}</span>
                            </div>
                            <p className="text-slate-600">{h.notes}</p>
                            <div className="text-[11px] text-slate-400">
                              Admitted: {new Date(h.admitted_at).toLocaleTimeString()}
                              {h.discharged_at && ` • Discharged: ${new Date(h.discharged_at).toLocaleTimeString()}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-red-500 text-sm">Failed to load patient records.</div>
          )}
        </div>
      </div>
    </div>
  );
};

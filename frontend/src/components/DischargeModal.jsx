import React, { useState } from 'react';
import { X, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DischargeModal = ({ isOpen, onClose, room }) => {
  const { dischargeRoom } = useApp();
  const [notes, setNotes] = useState('Patient clinical status stabilized. Vital signs within acceptable baseline limits.');
  const [outcome, setOutcome] = useState('Treated & Discharged');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !room) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    await dischargeRoom(room.id, notes, outcome);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Conclude Treatment</h3>
              <p className="text-xs text-emerald-100">
                Discharge patient and release {room.name} ({room.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Occupant</div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-base">{room.current_patient_name || 'Patient'}</div>
              <div className="text-xs font-mono px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold">
                {room.current_patient_id}
              </div>
            </div>
            {room.current_patient_complaint && (
              <p className="text-xs text-slate-600 line-clamp-2 italic">
                "{room.current_patient_complaint}"
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Clinical Outcome *</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            >
              <option value="Treated & Discharged">Treated & Discharged (Home)</option>
              <option value="Admitted to Inpatient Ward">Admitted to Inpatient Ward</option>
              <option value="Admitted to ICU">Admitted to ICU (Intensive Care)</option>
              <option value="Transferred to Specialty Facility">Transferred to Specialty Facility</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Discharge Notes & Summary</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Clinical discharge summary, medications administered, follow-up instructions..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5"
            >
              {loading ? 'Processing...' : 'Discharge & Free Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

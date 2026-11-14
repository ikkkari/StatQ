import React, { useState } from 'react';
import { X, UserPlus, ShieldAlert, AlertCircle, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const PRESET_COMPLAINTS = [
  { label: 'Chest Pain (Severe)', severity: 1, text: 'Crushing retrosternal chest pain radiating to left jaw, diaphoresis' },
  { label: 'Stroke Symptoms', severity: 2, text: 'Acute unilateral arm weakness and severe speech dysarthria' },
  { label: 'Severe Asthma', severity: 2, text: 'Severe acute dyspnea, wheezing, unable to speak full sentences' },
  { label: 'Appendicitis Suspect', severity: 3, text: 'Acute right lower quadrant abdominal pain with rebound tenderness' },
  { label: 'High Fever & Cough', severity: 3, text: 'High fever 103.5°F, productive sputum, tachypnea' },
  { label: 'Deep Laceration', severity: 4, text: 'Forearm glass laceration 5cm, bleeding controlled with direct pressure' },
  { label: 'Ankle Sprain', severity: 4, text: 'Twisted right ankle during sports, moderate localized swelling' },
  { label: 'Prescription Refill', severity: 5, text: 'Routine blood pressure medication refill request, asymptomatic' },
];

export const RegisterPatientModal = ({ isOpen, onClose }) => {
  const { refreshAll, addNotification } = useApp();

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male');
  const [severity, setSeverity] = useState(3);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [assignedNurse, setAssignedNurse] = useState('Nurse Rodriguez, RN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter a valid patient full name (at least 2 letters).');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setError('Please enter a realistic age between 0 and 130.');
      return;
    }
    if (!chiefComplaint.trim() || chiefComplaint.trim().length < 3) {
      setError('Please provide a brief chief complaint describing symptoms.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.registerPatient({
        full_name: fullName.trim(),
        age: parsedAge,
        sex,
        original_severity: parseInt(severity, 10),
        chief_complaint: chiefComplaint.trim(),
        assigned_nurse: assignedNurse,
      });

      addNotification(`Registered ${res.full_name} (${res.id}) with Severity ${res.original_severity}`, 'success');
      refreshAll();
      onClose();
      // Reset form
      setFullName('');
      setAge('');
      setChiefComplaint('');
      setSeverity(3);
    } catch (err) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setChiefComplaint(preset.text);
    setSeverity(preset.severity);
  };

  const severityOptions = [
    { level: 1, label: 'L1 Critical', desc: 'Resuscitation / Immediate life threat', color: 'border-red-500 bg-red-50 text-red-900 ring-red-500' },
    { level: 2, label: 'L2 High', desc: 'Emergent / High potential risk', color: 'border-orange-500 bg-orange-50 text-orange-900 ring-orange-500' },
    { level: 3, label: 'L3 Moderate', desc: 'Urgent / Stable vital signs', color: 'border-amber-500 bg-amber-50 text-amber-900 ring-amber-500' },
    { level: 4, label: 'L4 Low', desc: 'Less urgent / Simple intervention', color: 'border-blue-500 bg-blue-50 text-blue-900 ring-blue-500' },
    { level: 5, label: 'L5 Minor', desc: 'Non-urgent / Routine assessment', color: 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Patient Triage Intake</h3>
              <p className="text-xs text-blue-100">
                Register incoming patient into SQLite & Min-Heap Priority Queue
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name & Age & Sex */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-6 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Patient Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Robert Kowalski"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Age *</label>
              <input
                type="number"
                required
                min="0"
                max="130"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="42"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Severity Score Picker (1-5) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Triage Acuity Score (Min-Heap Primary Key: Lower number = Higher Priority) *
              </label>
              <span className="text-[11px] font-mono text-blue-600 font-semibold">
                Level {severity} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {severityOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.level}
                  onClick={() => setSeverity(opt.level)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    severity === opt.level
                      ? `${opt.color} ring-2 shadow-xs font-bold scale-[1.02]`
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Presets chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">Quick Clinical Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COMPLAINTS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors"
                >
                  {p.label} (L{p.severity})
                </button>
              ))}
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Chief Complaint & Vitals Summary *</label>
            <textarea
              required
              rows={3}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe acute symptoms, onset time, and pertinent clinical vitals..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
            />
          </div>

          {/* Assigned Nurse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Triage Nurse</label>
              <select
                value={assignedNurse}
                onChange={(e) => setAssignedNurse(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
              >
                <option value="Nurse Rodriguez, RN">Nurse Rodriguez, RN</option>
                <option value="Nurse Bradley, BSN">Nurse Bradley, BSN</option>
                <option value="Nurse Kim, RN">Nurse Kim, RN</option>
                <option value="Nurse Tanaka, CEN">Nurse Tanaka, CEN</option>
              </select>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex flex-col justify-center">
              <span className="font-semibold text-slate-800">Backend DSA Action:</span>
              <span className="font-mono text-blue-700 mt-0.5">
                heapq.heappush(heap, (severity={severity}, arrival_order, id))
              </span>
              <span className="text-slate-500 text-[10px]">Time complexity: O(log N)</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition flex items-center gap-2"
            >
              {submitting ? 'Registering...' : 'Complete Triage & Enqueue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

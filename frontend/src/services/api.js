let BASE_HOST = import.meta.env.VITE_API_BASE_URL || '';

// Automatically resolve to the real live Render backend
if (BASE_HOST.includes('statq-backend.onrender.com') || (!BASE_HOST && typeof window !== 'undefined' && window.location.host.includes('netlify.app'))) {
  BASE_HOST = 'https://statq.onrender.com';
}

const API_BASE = `${BASE_HOST}/api`;

export const api = {
  // Patients
  async getPatients(params = {}) {
    const query = new URLSearchParams();
    if (params.query) query.append('query', params.query);
    if (params.search_by) query.append('search_by', params.search_by);
    if (params.severity) query.append('severity', params.severity);
    if (params.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/patients?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch patients');
    return res.json();
  },

  async getPatientById(id) {
    const res = await fetch(`${API_BASE}/patients/${id}`);
    if (!res.ok) throw new Error(`Patient ${id} not found`);
    return res.json();
  },

  async registerPatient(data) {
    const res = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to register patient');
    }
    return res.json();
  },

  async updatePatient(id, data) {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update patient');
    }
    return res.json();
  },

  async getPatientHistory(id) {
    const res = await fetch(`${API_BASE}/patients/${id}/history`);
    if (!res.ok) throw new Error('Failed to fetch patient history');
    return res.json();
  },

  // Queue
  async getQueue() {
    const res = await fetch(`${API_BASE}/queue`);
    if (!res.ok) throw new Error('Failed to fetch triage queue');
    return res.json();
  },

  async callNextPatient() {
    const res = await fetch(`${API_BASE}/queue/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to call next patient');
    }
    return res.json();
  },

  // Rooms
  async getRooms() {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error('Failed to fetch rooms');
    return res.json();
  },

  async dischargeRoom(roomId, data = {}) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: data.notes || 'Routine treatment concluded.',
        outcome: data.outcome || 'Treated & Discharged',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to discharge room');
    }
    return res.json();
  },

  async assignRoom(roomId, patientId) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to assign patient to room');
    }
    return res.json();
  },

  // Simulation
  async getSimulationStatus() {
    const res = await fetch(`${API_BASE}/simulation/status`);
    if (!res.ok) throw new Error('Failed to fetch simulation status');
    return res.json();
  },

  async generatePatients(count = 5) {
    const res = await fetch(`${API_BASE}/simulation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) throw new Error('Failed to generate patients');
    return res.json();
  },

  async advanceTime(minutes = 5.0) {
    const res = await fetch(`${API_BASE}/simulation/advance-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) throw new Error('Failed to advance time');
    return res.json();
  },

  async toggleSimulation() {
    const res = await fetch(`${API_BASE}/simulation/toggle`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle simulation');
    return res.json();
  },

  async resetSimulation(onlySimulated = true) {
    const res = await fetch(`${API_BASE}/simulation/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ only_simulated: onlySimulated }),
    });
    if (!res.ok) throw new Error('Failed to reset simulation');
    return res.json();
  },

  // Analytics & DSA
  async getAnalyticsSummary() {
    const res = await fetch(`${API_BASE}/analytics/summary`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getDsaTelemetry() {
    const res = await fetch(`${API_BASE}/dsa/telemetry`);
    if (!res.ok) throw new Error('Failed to fetch DSA telemetry');
    return res.json();
  },

  async getActivityLogs(limit = 30) {
    const res = await fetch(`${API_BASE}/dsa/activity-logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};

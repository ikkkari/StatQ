import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [queueData, setQueueData] = useState({ items: [], total_waiting: 0, telemetry: {} });
  const [rooms, setRooms] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dsaTelemetry, setDsaTelemetry] = useState(null);
  const [simulation, setSimulation] = useState({
    is_active: false,
    simulated_time: '',
    simulated_minutes_elapsed: 0,
    aging_interval: 5.0,
    patient_count_total: 0,
    patient_count_simulated: 0,
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev.slice(-4), { id, message, type, timestamp: new Date() }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  }, []);

  // Fetch all live clinical data
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [qRes, rRes, aRes, dsaRes, simRes, logsRes] = await Promise.all([
        api.getQueue().catch(() => ({ items: [], total_waiting: 0, telemetry: {} })),
        api.getRooms().catch(() => []),
        api.getAnalyticsSummary().catch(() => null),
        api.getDsaTelemetry().catch(() => null),
        api.getSimulationStatus().catch(() => null),
        api.getActivityLogs(25).catch(() => []),
      ]);

      setQueueData(qRes);
      setRooms(rRes);
      if (aRes) setAnalytics(aRes);
      if (dsaRes) setDsaTelemetry(dsaRes);
      if (simRes) setSimulation(simRes);
      setActivityLogs(logsRes);
    } catch (err) {
      console.error('Error refreshing app data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // WebSocket Connection - only when user is authenticated and approved
  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const connectWebSocket = () => {
      let wsUrl = import.meta.env.VITE_WS_URL;
      if (!wsUrl) {
        let apiUrl = import.meta.env.VITE_API_BASE_URL;
        if (apiUrl && apiUrl.includes('statq-backend.onrender.com')) {
          apiUrl = 'https://statq.onrender.com';
        }

        if (apiUrl) {
          wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws';
        } else if (typeof window !== 'undefined' && window.location.host.includes('netlify.app')) {
          wsUrl = 'wss://statq.onrender.com/ws';
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/ws`;
        }
      }

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          console.log('Connected to StatQ WebSocket');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(event.data);
            const { event: eventType, data } = payload;

            // React dynamically to real-time events
            if (eventType === 'PATIENT_REGISTERED') {
              addNotification(`New Patient Registered: ${data.full_name} (Severity ${data.severity})`, 'info');
            } else if (eventType === 'PATIENT_CALLED') {
              addNotification(`Called to Treatment: ${data.patient.full_name} -> ${data.room.name}`, 'success');
            } else if (eventType === 'ROOM_UPDATED') {
              addNotification(`Room Status Updated: ${data.message}`, 'info');
            } else if (eventType === 'SIMULATION_TIME_ADVANCED') {
              if (data.escalated_count > 0) {
                addNotification(`Priority Aging: ${data.escalated_count} patient(s) escalated to higher priority!`, 'warning');
              }
            }

            // Refresh live views
            refreshAll();
          } catch (e) {
            console.error('Error processing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          // Retry connection in 4 seconds if still authenticated
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted && isAuthenticated) {
              connectWebSocket();
            }
          }, 4000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.warn('Failed to initialize WebSocket:', err);
      }
    };

    connectWebSocket();
    refreshAll();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isAuthenticated, refreshAll, addNotification]);

  // Action helpers
  const callNext = async () => {
    try {
      const res = await api.callNextPatient();
      addNotification(`Called ${res.patient.full_name} into ${res.room.name}`, 'success');
      refreshAll();
      return { success: true, data: res };
    } catch (err) {
      addNotification(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const advanceTime = async (minutes = 5.0) => {
    try {
      const res = await api.advanceTime(minutes);
      addNotification(`Advanced simulated time by +${minutes}m (${res.escalated_count} aged)`, 'info');
      refreshAll();
      return { success: true, data: res };
    } catch (err) {
      addNotification(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const dischargeRoom = async (roomId, notes, outcome) => {
    try {
      const res = await api.dischargeRoom(roomId, { notes, outcome });
      addNotification(`Room ${roomId} released: ${res.message}`, 'success');
      refreshAll();
      return { success: true, data: res };
    } catch (err) {
      addNotification(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  return (
    <AppContext.Provider
      value={{
        queueData,
        rooms,
        analytics,
        dsaTelemetry,
        simulation,
        activityLogs,
        wsConnected,
        loading,
        notifications,
        refreshAll,
        callNext,
        advanceTime,
        dischargeRoom,
        addNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

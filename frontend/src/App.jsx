import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { QueuePage } from './pages/QueuePage';
import { PatientsPage } from './pages/PatientsPage';
import { RoomsPage } from './pages/RoomsPage';
import { SimulationPage } from './pages/SimulationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RegisterPatientModal } from './components/RegisterPatientModal';
import { PatientDetailModal } from './components/PatientDetailModal';
import { DischargeModal } from './components/DischargeModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [dischargeRoom, setDischargeRoom] = useState(null);

  const { notifications } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRegister={() => setIsRegisterOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header onSelectPatient={(id) => setSelectedPatientId(id)} />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onOpenDischarge={(room) => setDischargeRoom(room)}
              onOpenRegister={() => setIsRegisterOpen(true)}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'queue' && (
            <QueuePage
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onOpenRegister={() => setIsRegisterOpen(true)}
              onOpenDischarge={(room) => setDischargeRoom(room)}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsPage
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onOpenRegister={() => setIsRegisterOpen(true)}
            />
          )}

          {activeTab === 'rooms' && (
            <RoomsPage
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onOpenDischarge={(room) => setDischargeRoom(room)}
            />
          )}

          {activeTab === 'simulation' && (
            <SimulationPage onSelectPatient={(id) => setSelectedPatientId(id)} />
          )}

          {activeTab === 'analytics' && <AnalyticsPage />}

          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Modals */}
      <RegisterPatientModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />

      <PatientDetailModal
        isOpen={!!selectedPatientId}
        patientId={selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />

      <DischargeModal
        isOpen={!!dischargeRoom}
        room={dischargeRoom}
        onClose={() => setDischargeRoom(null)}
      />

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3.5 rounded-xl shadow-lg border text-xs font-medium pointer-events-auto transform transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              n.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-700'
                : n.type === 'warning'
                ? 'bg-amber-600 text-white border-amber-500'
                : n.type === 'error'
                ? 'bg-red-700 text-white border-red-600'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

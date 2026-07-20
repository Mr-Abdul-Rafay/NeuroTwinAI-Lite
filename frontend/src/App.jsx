import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AIResultsPage from './pages/AIResultsPage';
import TwinViewerPage from './pages/TwinViewerPage';
import MRIUploadPage from './pages/MRIUploadPage';
import IoTMonitoringPage from './pages/IoTMonitoringPage';
import ReportsPage from './pages/ReportsPage';
import PatientDirectoryPage from './pages/PatientDirectoryPage';
import UploadHistoryPage from './pages/UploadHistoryPage';
import XAIPage from './pages/XAIPage';
import AppShell from './components/AppShell';
import { PatientProvider } from './context/PatientContext';
import { usePatientCleanup } from './hooks/usePatientCleanup';

const apiBase = 'http://127.0.0.1:8000';

// Pages that live inside the AppShell (sidebar + topnav)
const SHELL_PAGES = [
  'dashboard', 'ai-results', 'twin-viewer',
  'mri-upload', 'iot-monitoring', 'reports', 'patients', 'upload-history', 'explain',
];

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const token = localStorage.getItem('neuro_token');
    const savedUser = localStorage.getItem('neuro_user');
    return (token && savedUser) ? 'dashboard' : 'login';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('neuro_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('neuro_token');
      localStorage.removeItem('neuro_user');
      return null;
    }
  });

  usePatientCleanup();

  useEffect(() => {
    console.log('✅ NeuroTwinAI-Lite App mounted!');
    console.log('📍 Current path:', window.location.pathname);

    const handleForceLogout = () => {
      setUser(null);
      setCurrentPage('login');
    };

    window.addEventListener('neuro:logout', handleForceLogout);
    return () => {
      window.removeEventListener('neuro:logout', handleForceLogout);
    };
  }, []);

  const handleLoginSuccess = (token, userProfile) => {
    setUser(userProfile);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('neuro_token');
    localStorage.removeItem('neuro_user');
    setUser(null);
    setCurrentPage('login');
  };

  // Auth pages (no shell)
  if (currentPage === 'login') {
    return (
      <LoginPage
        onNavigate={setCurrentPage}
        onLoginSuccess={handleLoginSuccess}
        apiBase={apiBase}
      />
    );
  }
  if (currentPage === 'register') {
    return (
      <RegisterPage
        onNavigate={setCurrentPage}
        apiBase={apiBase}
      />
    );
  }

  // All dashboard pages wrapped in AppShell
  if (SHELL_PAGES.includes(currentPage)) {
    return (
      <PatientProvider>
        <AppShell
          user={user}
          onLogout={handleLogout}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        >
          {currentPage === 'dashboard' && (
            <DashboardPage
              user={user}
              onLogout={handleLogout}
              apiBase={apiBase}
              onNavigate={setCurrentPage}
            />
          )}
          {currentPage === 'ai-results' && <AIResultsPage onNavigate={setCurrentPage} />}
          {currentPage === 'explain' && <XAIPage onNavigate={setCurrentPage} />}
          {currentPage === 'twin-viewer' && <TwinViewerPage />}
          {currentPage === 'mri-upload' && <MRIUploadPage apiBase={apiBase} onNavigate={setCurrentPage} />}
          {currentPage === 'iot-monitoring' && <IoTMonitoringPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'patients' && (
            <PatientDirectoryPage onNavigate={setCurrentPage} />
          )}
          {currentPage === 'upload-history' && (
            <UploadHistoryPage onNavigate={setCurrentPage} />
          )}
        </AppShell>
      </PatientProvider>
    );
  }

  return null;
}

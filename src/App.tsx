import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Loader2 } from 'lucide-react';
import api from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimeTracker from './pages/TimeTracker';
import Settings from './pages/Settings';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Approvals from './pages/Approvals';
import KanbanPage from './pages/Kanban';
import UsersPage from './pages/Users';
import CostsPage from './pages/Costs';
import Profile from './pages/Profile';
import HeatmapPage from './pages/reports/Heatmap';
import AuditLogPage from './pages/reports/AuditLog';
import PredictiveAlertsPage from './pages/reports/PredictiveAlerts';
import InsightsPage from './pages/reports/Insights';
import SuperDashboard from './pages/SuperDashboard';
import TenantsList from './pages/TenantsList';
import GlobalLogs from './pages/GlobalLogs';

import i18n from './i18n';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; feature?: string }> = ({ children, feature }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const { hasPermission, isReady } = useTheme();
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  let user: any;
  try {
    user = JSON.parse(userStr);
    // Aplicar idioma guardado
    if (user.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
    }
  } catch (e) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
  
  if (!user.id) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user.is_super_admin === true || user.is_super_admin === 1 || user.is_super_admin === "1";
  
  if (feature && !hasPermission(feature) && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  const { user } = useTheme();
  const [isAuthenticating, setIsAuthenticating] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('u') && params.get('p'));
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    const p = params.get('p');

    if (u && p) {
      const performAutoLogin = async () => {
        try {
          const response = await api.post('/auth/login', { email: u, password: p });
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            const userStr = localStorage.getItem('user');
            let tenantIdParam = '';
            if (userStr) {
              const userObj = JSON.parse(userStr);
              if (String(userObj.is_super_admin) === '1' || userObj.is_super_admin === true) {
                tenantIdParam = '?tenant_id=0';
              }
            }
            window.location.href = window.location.origin + window.location.pathname + tenantIdParam + window.location.hash;
          } else {
            setIsAuthenticating(false);
          }
        } catch (error) {
          console.error('Auto-auth failed:', error);
          setIsAuthenticating(false);
        }
      };
      performAutoLogin();
    }
  }, []);

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center gap-4 border border-gray-100">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <div className="text-center">
            <h3 className="font-bold text-gray-900">Autenticando...</h3>
            <p className="text-sm text-gray-500">Iniciando sesión automáticamente</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            {(() => {
              const isSuperAdmin = user?.is_super_admin === true || user?.is_super_admin === 1 || user?.is_super_admin === "1";
              return isSuperAdmin ? <SuperDashboard /> : <Dashboard />;
            })()}
          </ProtectedRoute>
        } />

        {/* Rutas exclusivas Super Admin */}
        <Route path="/super/tenants" element={
          <ProtectedRoute>
            <TenantsList />
          </ProtectedRoute>
        } />
        <Route path="/super/logs" element={
          <ProtectedRoute>
            <GlobalLogs />
          </ProtectedRoute>
        } />

        <Route path="/kanban" element={
          <ProtectedRoute feature="kanban">
            <KanbanPage />
          </ProtectedRoute>
        } />
        
        <Route path="/tracker" element={
          <ProtectedRoute feature="tracker">
            <TimeTracker />
          </ProtectedRoute>
        } />

        <Route path="/approvals" element={
          <ProtectedRoute feature="approvals">
            <Approvals />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute feature="settings">
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/clients" element={
          <ProtectedRoute feature="clients">
            <Clients />
          </ProtectedRoute>
        } />

        <Route path="/projects" element={
          <ProtectedRoute feature="projects">
            <Projects />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute feature="users">
            <UsersPage />
          </ProtectedRoute>
        } />

        <Route path="/costs" element={
          <ProtectedRoute feature="costs">
            <CostsPage />
          </ProtectedRoute>
        } />

        <Route path="/reports/heatmap" element={
          <ProtectedRoute feature="report_heatmaps">
            <HeatmapPage />
          </ProtectedRoute>
        } />

        <Route path="/reports/audit" element={
          <ProtectedRoute feature="report_audit">
            <AuditLogPage />
          </ProtectedRoute>
        } />

        <Route path="/reports/predictive" element={
          <ProtectedRoute feature="report_audit">
            <PredictiveAlertsPage />
          </ProtectedRoute>
        } />

        <Route path="/reports/insights" element={
          <ProtectedRoute feature="report_custom">
            <InsightsPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

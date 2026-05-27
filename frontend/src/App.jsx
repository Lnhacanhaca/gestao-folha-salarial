import React, { useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DocentesPage from './pages/DocentesPage';
import LancarNotasPage from './pages/LancarNotasPage';
import RelatoriosPage from './pages/RelatoriosPage';
import UsuariosPage from './pages/UsuariosPage';
import AuditPage from './pages/AuditPage';
import AdminConfigPage from './pages/AdminConfigPage';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return children;
};

function RoutePersister() {
  const location = useLocation();
  
  useEffect(() => {
    sessionStorage.setItem('lastRoute', location.pathname + location.search);
  }, [location]);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="docentes" element={<DocentesPage />} />
        <Route path="lancar-notas" element={<LancarNotasPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="usuarios" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UsuariosPage />
          </ProtectedRoute>
        } />
        <Route path="auditoria" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AuditPage />
          </ProtectedRoute>
        } />
        <Route path="configuracoes" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminConfigPage />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  const initialRoute = sessionStorage.getItem('lastRoute') || '/';

  useEffect(() => {
    // Apply theme mode (Dark mode)
    const savedMode = localStorage.getItem('themeMode') || 'light';
    if (savedMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply theme color
    const savedColor = localStorage.getItem('themeColor') || 'blue';
    const root = document.documentElement;
    switch (savedColor) {
      case 'green':
        root.style.setProperty('--primary', '142 70% 45%');
        break;
      case 'purple':
        root.style.setProperty('--primary', '271 76% 53%');
        break;
      case 'orange':
        root.style.setProperty('--primary', '24 95% 53%');
        break;
      case 'pink':
        root.style.setProperty('--primary', '326 100% 60%');
        break;
      case 'blue':
      default:
        root.style.setProperty('--primary', '207 90% 54%');
        break;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <RoutePersister />
        <AuthProvider>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                fontWeight: '500',
                borderRadius: '12px',
              },
              success: {
                style: { background: '#10b981' }
              },
              error: {
                style: { background: '#ef4444' }
              }
            }} 
          />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export default App;

import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import { KonoCyclingLoader } from './components/common/KonoCyclingLoader';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabaseClient';

// Lazy-loaded routes for optimal bundle splitting and performance
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AuditorPage = lazy(() => import('./pages/AuditorPage').then(m => ({ default: m.AuditorPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

export const App: React.FC = () => {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    // 1. Initial session check on mount
    checkSession();

    // 2. Listen for OAuth redirects and token updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession]);

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="h-screen w-screen bg-titanium-950 flex items-center justify-center">
            <KonoCyclingLoader message="Cargando módulo de Kono.ai..." size="md" />
          </div>
        }
      >
        <Routes>
          {/* Public Routes (Protected from already logged-in users) */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Application Routes with Liquid Glass Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/audit" element={<AuditorPage />} />
              <Route path="/audit/:documentId" element={<AuditorPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import ProfilePage from '../pages/ProfilePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * Main application routing configuration.
 * Uses ProtectedRoute for authenticated workspaces and PublicRoute for guest onboarding.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Guest-only routes (redirects to /dashboard if already logged in) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected application routes (redirects to /login if unauthenticated) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;

import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import ProfilePage from '../pages/ProfilePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * Main application routing configuration.
 * Maps application paths to placeholder pages wrapped in AppLayout with a 404 fallback.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Default redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Core application routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 404 Fallback for unknown routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;

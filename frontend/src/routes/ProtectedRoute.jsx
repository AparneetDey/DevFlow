import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/common/Loading';

/**
 * Route guard restricting access to authenticated users.
 * Shows loading spinner during initial session check, and redirects unauthenticated
 * visitors to /login preserving the intended destination and session expiration context.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, sessionExpired } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading fullScreen text="Checking session..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          sessionExpired: Boolean(sessionExpired),
        }}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;

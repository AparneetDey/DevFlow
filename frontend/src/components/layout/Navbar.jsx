import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Kanban, LayoutDashboard, User, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LogoutConfirmationModal } from '../auth/LogoutConfirmationModal.jsx';

/**
 * Top navigation bar providing brand routing, primary workspace navigation,
 * user identity presentation, and confirmed logout initiation.
 */
export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
      isActive
        ? 'bg-[var(--color-primary-muted)] text-[var(--color-text)] border-[var(--color-primary)]/40 shadow-2xs'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] border-transparent'
    } focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]`;

  const handleOpenLogout = () => {
    setLogoutError(null);
    setIsLogoutModalOpen(true);
  };

  const handleCloseLogout = () => {
    if (isLoggingOut) return;
    setIsLogoutModalOpen(false);
    setLogoutError(null);
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      setIsLogoutModalOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      setLogoutError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to sign out. Please check your connection and try again.'
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shrink-0 z-40">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 sm:gap-2.5 group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-lg p-1"
            aria-label="DevFlow home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-text)] shadow-xs group-hover:bg-[var(--color-primary-hover)] transition-colors">
              <Kanban className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight">
                DevFlow
              </span>
            </div>
          </Link>

          {/* Navigation & Auth Controls */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  end
                  className={navLinkClass}
                  title="Dashboard"
                  aria-label="Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Dashboard</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={navLinkClass}
                  title="Profile"
                  aria-label="Profile"
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Profile</span>
                </NavLink>

                <div className="h-4 w-px bg-[var(--color-border)] mx-1 hidden sm:block" />

                {/* Logout Action */}
                <button
                  type="button"
                  onClick={handleOpenLogout}
                  aria-label="Log out"
                  title="Log out"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Login</span>
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Register</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={handleCloseLogout}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
        error={logoutError}
      />
    </>
  );
}

export default Navbar;

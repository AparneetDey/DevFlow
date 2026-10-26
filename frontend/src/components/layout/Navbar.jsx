import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Kanban, LayoutDashboard, User, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-500 transition-colors">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">DevFlow</span>
          </div>
        </Link>

        {/* Navigation & Auth Controls */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass} title="Dashboard" aria-label="Dashboard">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
              <NavLink to="/boards/demo-101" className={navLinkClass} title="Board" aria-label="Board">
                <Kanban className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Board</span>
              </NavLink>
              <NavLink to="/profile" className={navLinkClass} title="Profile" aria-label="Profile">
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Profile</span>
              </NavLink>

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

              {/* User Identity Indicator */}
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {user?.username}
              </span>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
                title="Log out"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
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
  );
}

export default Navbar;

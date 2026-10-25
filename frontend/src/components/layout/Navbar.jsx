import { NavLink, Link } from 'react-router-dom';
import { Kanban, LayoutDashboard, User, LogIn, UserPlus } from 'lucide-react';

export function Navbar() {
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-500 transition-colors">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">DevFlow</span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-950 text-indigo-300 rounded border border-indigo-800">
              Foundation
            </span>
          </div>
        </Link>

        {/* Navigation Links for Verification */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/dashboard" className={navLinkClass}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/boards/demo-101" className={navLinkClass}>
            <Kanban className="w-4 h-4" />
            <span className="hidden sm:inline">Board</span>
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </NavLink>
          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
          <NavLink to="/login" className={navLinkClass}>
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Login</span>
          </NavLink>
          <NavLink to="/register" className={navLinkClass}>
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Register</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;

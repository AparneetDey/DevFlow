import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500 break-words">
        DevFlow &bull; Kanban Task Management System &bull; Frontend Foundation (Task 2)
      </footer>
    </div>
  );
}

export default AppLayout;

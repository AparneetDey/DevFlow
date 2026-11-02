import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0 page-scrollbar">
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

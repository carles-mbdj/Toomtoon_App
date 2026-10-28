import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

// Auth is already enforced by <ProtectedRoute> in App.tsx before this
// component ever renders - don't duplicate that guard here.
export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Main content with left margin for fixed sidebar */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden bg-[var(--surface)] border-b border-[var(--border)] p-4 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-[var(--surface-light)] rounded-lg"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-[var(--text)]">ToomToon Admin</h1>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

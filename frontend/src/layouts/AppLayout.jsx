import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const wasOpen = useRef(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Return focus to the menu button after the mobile drawer closes.
  useEffect(() => {
    if (wasOpen.current && !sidebarOpen) menuButtonRef.current?.focus();
    wasOpen.current = sidebarOpen;
  }, [sidebarOpen]);

  // Escape closes the mobile navigation drawer.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeSidebar();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, closeSidebar]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-brand shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} onLogout={handleLogout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} menuButtonRef={menuButtonRef} />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-5 focus:outline-none sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import IconRail from '../components/shell/IconRail.jsx';
import TopBar from '../components/shell/TopBar.jsx';
import MobileTabBar from '../components/shell/MobileTabBar.jsx';
import CommandPalette from '../components/shell/CommandPalette.jsx';

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Cmd+K (Mac) or Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen lg:pl-16">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-raised px-3 py-2 text-sm font-medium text-accent shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <IconRail onLogout={handleLogout} />
      <div className="flex min-w-0 flex-col">
        <TopBar onOpenSearch={() => setPaletteOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pt-5 pb-28 focus:outline-none sm:px-6 lg:px-8 lg:pt-7 lg:pb-10">
          {/* Re-keyed per page so each page eases in when you navigate. */}
          <div key={location.pathname} className="mx-auto max-w-7xl animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileTabBar onLogout={handleLogout} />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}

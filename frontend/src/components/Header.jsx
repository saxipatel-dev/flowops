import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { roleLabels } from '../services/format.js';

export default function Header({ onMenuClick }) {
  const { user, logout, unreadCount, refreshUnreadCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Notifications are refreshed whenever the user moves to another page.
  useEffect(() => {
    refreshUnreadCount();
  }, [location.pathname, refreshUnreadCount]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 5h14v2H3zm0 4h14v2H3zm0 4h14v2H3z" />
        </svg>
      </button>
      <div className="hidden text-sm text-slate-500 lg:block">{user.department?.name || 'FlowOps'}</div>

      <div className="flex items-center gap-4">
        <Link
          to="/notifications"
          className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2a6 6 0 0 0-6 6v3.6l-1.7 2.6A1 1 0 0 0 3.1 16h13.8a1 1 0 0 0 .8-1.8L16 11.6V8a6 6 0 0 0-6-6Zm0 18a3 3 0 0 0 2.8-2H7.2a3 3 0 0 0 2.8 2Z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-800">{user.name}</p>
          <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
        </div>
        <button type="button" onClick={handleLogout} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          Log out
        </button>
      </div>
    </header>
  );
}

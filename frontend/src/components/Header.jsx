import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { roleLabels } from '../services/format.js';
import Avatar from './Avatar.jsx';

const sectionLabels = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  requests: 'Requests',
  approvals: 'Approvals',
  activity: 'Activity',
  notifications: 'Notifications',
  profile: 'Profile',
  users: 'User Management',
};

// Turns "/tasks/12/edit" into [Tasks, Edit] for the breadcrumb.
function getBreadcrumb(pathname) {
  const [section, id, action] = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: sectionLabels[section] || 'Page not found', to: `/${section}` }];
  if (id === 'new') crumbs.push({ label: 'New' });
  else if (action === 'edit') crumbs.push({ label: 'Edit' });
  else if (id) crumbs.push({ label: 'Details' });
  return crumbs;
}

export default function Header({ onMenuClick, menuButtonRef }) {
  const { user, unreadCount, refreshUnreadCount } = useAuth();
  const location = useLocation();
  const crumbs = getBreadcrumb(location.pathname);

  // Notifications are refreshed whenever the user moves to another page.
  useEffect(() => {
    refreshUnreadCount();
  }, [location.pathname, refreshUnreadCount]);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        ref={menuButtonRef}
        type="button"
        className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
                {isLast ? (
                  <span className="truncate font-medium text-navy" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.to} className="truncate text-slate-500 transition-colors hover:text-slate-800">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-1 sm:gap-3">
        <Link
          to="/notifications"
          className="relative rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
          )}
        </Link>
        <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
        <Link
          to="/profile"
          className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-slate-100 sm:pr-2.5"
          aria-label={`Your profile: ${user.name}, ${roleLabels[user.role]}`}
        >
          <Avatar name={user.name} size="sm" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium text-navy">{user.name}</span>
            <span className="block text-xs text-slate-500">{roleLabels[user.role]}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

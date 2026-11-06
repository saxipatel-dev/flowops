import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Bell, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LogoMark from './LogoMark.jsx';
import { findSection } from './navigation.js';

// Turns "/tasks/12/edit" into [Tasks, Edit] for the breadcrumb.
function getBreadcrumb(pathname) {
  const section = findSection(pathname);
  const [, id, action] = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: section?.label || 'Page not found', to: section?.to || pathname }];
  if (id === 'new') crumbs.push({ label: 'New' });
  else if (action === 'edit') crumbs.push({ label: 'Edit' });
  else if (id) crumbs.push({ label: 'Details' });
  return { section, crumbs };
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function TopBar({ onOpenSearch }) {
  const { unreadCount, refreshUnreadCount } = useAuth();
  const location = useLocation();
  const { section, crumbs } = getBreadcrumb(location.pathname);

  // Notifications are refreshed whenever the user moves to another page; they are not live.
  useEffect(() => {
    refreshUnreadCount();
  }, [location.pathname, refreshUnreadCount]);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <Link to="/dashboard" className="rounded-lg lg:hidden" aria-label="FlowOps, go to Mission Control">
        <LogoMark className="h-8 w-8" />
      </Link>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-sm">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.label} className="flex min-w-0 items-center gap-2">
                {index === 0 && <span className={`h-1 w-4 shrink-0 rounded-full ${section?.line || 'bg-faint'}`} aria-hidden="true" />}
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />}
                {isLast ? (
                  <span className="truncate font-medium text-ink" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link to={crumb.to} className="truncate text-muted transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-sunken px-2.5 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted sm:w-72"
        aria-label="Search and jump to"
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:block">Search or jump to…</span>
        <kbd className="hidden rounded border border-line border-b-2 bg-raised px-1.5 font-mono text-[10px] text-muted sm:block">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      <Link
        to="/notifications"
        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-hover hover:text-ink"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas" aria-hidden="true" />
        )}
      </Link>
    </header>
  );
}

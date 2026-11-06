import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { LogOut, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDialog } from '../../hooks/useDialog.js';
import { roleLabels } from '../../services/format.js';
import Avatar from '../Avatar.jsx';
import { profileItem, visibleNavItems } from './navigation.js';

function MoreSheet({ items, onClose, onLogout }) {
  const { user } = useAuth();
  const panelRef = useDialog(true, onClose);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-[fade-up_160ms_ease-out] bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        className="absolute inset-x-0 bottom-0 animate-slide-in-up rounded-t-2xl border-t border-line bg-raised px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-overlay"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <h2 id="more-sheet-title" className="truncate text-sm font-semibold">
              {user.name}
            </h2>
            <p className="truncate text-xs text-muted">
              {roleLabels[user.role]}
              {user.department && ` · ${user.department.name}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-ink" aria-label="Close menu">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="More navigation">
          <ul className="grid gap-1">
            {items.map(({ to, label, icon: Icon, line }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${isActive ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-hover'}`
                  }
                >
                  <span className={`h-4 w-1 rounded-full ${line}`} aria-hidden="true" />
                  <Icon className="h-[18px] w-[18px] text-muted" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-sm text-ink-2 hover:bg-hover"
        >
          <LogOut className="h-[18px] w-[18px] text-muted" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
}

const tabClasses = 'relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium transition-colors';

export default function MobileTabBar({ onLogout }) {
  const { user, unreadCount } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = visibleNavItems(user.role);
  const tabs = items.filter((item) => item.tab);
  const moreItems = [...items.filter((item) => !item.tab), profileItem];
  const moreActive = moreItems.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-canvas/95 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
      >
        {tabs.map(({ to, label, short, icon: Icon, showUnread }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) => `${tabClasses} ${isActive ? 'text-accent' : 'text-faint hover:text-ink'}`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden="true" />
              {showUnread && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-accent-strong px-1 text-center text-[9px] leading-4 font-semibold text-on-accent ring-2 ring-canvas" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span aria-hidden="true">{short}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`${tabClasses} ${moreActive ? 'text-accent' : 'text-faint hover:text-ink'}`}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>
      {moreOpen && <MoreSheet items={moreItems} onClose={() => setMoreOpen(false)} onLogout={onLogout} />}
    </>
  );
}

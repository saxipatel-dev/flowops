import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router';
import {
  Activity,
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  UserCircle,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { roleLabels } from '../services/format.js';
import Avatar from './Avatar.jsx';

const sections = [
  {
    label: 'Workspace',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/tasks', label: 'Tasks', icon: ListChecks },
      { to: '/requests', label: 'Requests', icon: FileText },
      { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, roles: ['MANAGER'] },
    ],
  },
  {
    label: 'Updates',
    links: [
      { to: '/activity', label: 'Activity', icon: Activity },
      { to: '/notifications', label: 'Notifications', icon: Bell, showUnread: true },
    ],
  },
  {
    label: 'Account',
    links: [
      { to: '/profile', label: 'Profile', icon: UserCircle },
      { to: '/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
    ],
  },
];

export default function Sidebar({ open, onClose, onLogout }) {
  const { user, unreadCount } = useAuth();
  const closeButtonRef = useRef(null);

  // Move focus into the drawer when it opens on small screens.
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  return (
    // On large screens this wrapper is the full-height sidebar column; the panel inside stays pinned.
    <div className="lg:w-60 lg:shrink-0 lg:border-r lg:border-slate-200 lg:bg-white">
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        // When closing, visibility switches off only after the slide finishes, so the
        // closed drawer is skipped by keyboard focus but opens (and takes focus) at once.
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:border-r-0 lg:translate-x-0 lg:visible ${
          open
            ? 'visible translate-x-0 shadow-overlay [transition:translate_200ms]'
            : 'invisible -translate-x-full [transition:translate_200ms,visibility_0s_200ms]'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white shadow-xs" aria-hidden="true">
              <Workflow className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-navy">FlowOps</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Main navigation">
          {sections.map((section) => {
            const links = section.links.filter((link) => !link.roles || link.roles.includes(user.role));
            if (links.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="mb-1 px-2.5 text-[11px] font-medium tracking-wider text-slate-500 uppercase">{section.label}</p>
                <ul className="space-y-0.5">
                  {links.map(({ to, label, icon: Icon, showUnread }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-brand-soft font-medium text-brand-dark'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand' : 'text-slate-400 group-hover:text-slate-600'}`}
                              aria-hidden="true"
                            />
                            <span className="flex-1">{label}</span>
                            {showUnread && unreadCount > 0 && (
                              <span
                                className="min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] leading-5 font-semibold text-white tabular-nums"
                                aria-hidden="true"
                              >
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-200 p-3">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy">{user.name}</p>
            <p className="truncate text-xs text-slate-500">
              {roleLabels[user.role]}
              {user.department && ` · ${user.department.name}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>
  );
}

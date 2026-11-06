import { Link, NavLink } from 'react-router';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Avatar from '../Avatar.jsx';
import LogoMark from './LogoMark.jsx';
import { visibleNavItems } from './navigation.js';

// The label appears beside the icon on hover and on keyboard focus.
function RailLabel({ children }) {
  return (
    <span
      className="pointer-events-none absolute top-1/2 left-full z-40 ml-3 -translate-x-1 -translate-y-1/2 rounded-md border border-line bg-raised px-2 py-1 text-xs font-medium whitespace-nowrap text-ink opacity-0 shadow-raised transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

const railButton =
  'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150';

export default function IconRail({ onLogout }) {
  const { user, unreadCount } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r border-line bg-canvas/95 py-3 backdrop-blur lg:flex">
      <Link to="/dashboard" className="rounded-xl" aria-label="FlowOps, go to Mission Control">
        <LogoMark className="h-9 w-9" />
      </Link>

      <nav aria-label="Main navigation" className="mt-5 flex-1">
        <ul className="flex flex-col items-center gap-1.5">
          {visibleNavItems(user.role).map(({ to, label, icon: Icon, line, showUnread }) => (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={label}
                className={({ isActive }) =>
                  `${railButton} ${isActive ? 'bg-accent-soft text-accent' : 'text-faint hover:bg-hover hover:text-ink'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* The section's line colour marks where you are. */}
                    <span
                      className={`absolute top-1/2 -left-3 w-[3px] -translate-y-1/2 rounded-r-full transition-[height] duration-200 ${line} ${isActive ? 'h-5' : 'h-0'}`}
                      aria-hidden="true"
                    />
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    {showUnread && unreadCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-accent-strong px-1 text-center text-[10px] leading-4 font-semibold text-on-accent tabular-nums ring-2 ring-canvas"
                        aria-hidden="true"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    <RailLabel>{label}</RailLabel>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col items-center gap-2">
        <NavLink
          to="/profile"
          aria-label="Profile"
          className={({ isActive }) => `${railButton} ${isActive ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-line-strong'}`}
        >
          <Avatar name={user.name} size="md" />
          <RailLabel>Profile</RailLabel>
        </NavLink>
        <button type="button" onClick={onLogout} aria-label="Log out" className={`${railButton} text-faint hover:bg-hover hover:text-ink`}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <RailLabel>Log out</RailLabel>
        </button>
      </div>
    </aside>
  );
}

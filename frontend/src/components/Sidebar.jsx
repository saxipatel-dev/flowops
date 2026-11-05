import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/requests', label: 'Requests' },
  { to: '/approvals', label: 'Approvals', roles: ['MANAGER'] },
  { to: '/activity', label: 'Activity' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/profile', label: 'Profile' },
  { to: '/users', label: 'User Management', roles: ['ADMIN'] },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const visibleLinks = links.filter((link) => !link.roles || link.roles.includes(user.role));

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 transform bg-navy text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center px-6 text-lg font-bold tracking-wide text-white">FLOWOPS</div>
        <nav className="space-y-1 px-3" aria-label="Main navigation">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

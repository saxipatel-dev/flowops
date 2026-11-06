import { Activity, Bell, ClipboardCheck, FileText, LayoutDashboard, ListChecks, UserCircle, Users } from 'lucide-react';

// Every section has a "line" colour, like a transit map. The same colour marks the
// section in the rail, the top bar and the phone tab bar.
export const navItems = [
  { to: '/dashboard', label: 'Mission Control', short: 'Home', icon: LayoutDashboard, line: 'bg-accent', tab: true },
  { to: '/tasks', label: 'Tasks', short: 'Tasks', icon: ListChecks, line: 'bg-info', tab: true },
  { to: '/requests', label: 'Requests', short: 'Requests', icon: FileText, line: 'bg-warn', tab: true },
  { to: '/approvals', label: 'Approvals', short: 'Approvals', icon: ClipboardCheck, line: 'bg-ok', roles: ['MANAGER'] },
  { to: '/activity', label: 'Activity', short: 'Activity', icon: Activity, line: 'bg-faint' },
  { to: '/notifications', label: 'Notifications', short: 'Inbox', icon: Bell, line: 'bg-faint', tab: true, showUnread: true },
  { to: '/users', label: 'User Management', short: 'Users', icon: Users, line: 'bg-faint', roles: ['ADMIN'] },
];

export const profileItem = { to: '/profile', label: 'Profile', short: 'Profile', icon: UserCircle, line: 'bg-faint' };

export function visibleNavItems(role) {
  return navItems.filter((item) => !item.roles || item.roles.includes(role));
}

// The section the current path belongs to, for the top bar.
export function findSection(pathname) {
  return [...navItems, profileItem].find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import ActivityPage from '../pages/ActivityPage.jsx';
import NotificationsPage from '../pages/NotificationsPage.jsx';
import UsersPage from '../pages/UsersPage.jsx';
import LoginGraphic from '../components/shell/LoginGraphic.jsx';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, setUnauthorizedHandler: vi.fn() };
});

const maya = { id: 1, name: 'Maya Chen', email: 'maya@x.test' };
const days = Array.from({ length: 91 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 7, 9) + index * 86400000).toISOString().slice(0, 10),
  count: index === 88 ? 2 : 0,
}));

function CurrentUrl() {
  const location = useLocation();
  return <p data-testid="url">{location.pathname + location.search}</p>;
}

function WhenLoaded({ children }) {
  const { user } = useAuth();
  return user ? children : null;
}

function renderPage(path, element, { role = 'EMPLOYEE', routes } = {}) {
  api.get.mockImplementation((url, config) => {
    if (url === '/auth/me') return Promise.resolve({ data: { user: { ...maya, role, department: null } } });
    return routes(url, config?.params || {});
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route
              path="*"
              element={
                <WhenLoaded>
                  {element}
                  <CurrentUrl />
                </WhenLoaded>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('History', () => {
  const event = { id: 9, action: 'submitted request', details: 'Standing desk', entityType: 'request', entityId: 4, createdAt: `${days[88].date}T10:00:00Z`, user: maya };
  const routes = (url) => {
    if (url === '/activity/summary') return Promise.resolve({ data: { days, total: 2 } });
    if (url === '/activity') return Promise.resolve({ data: { activity: [event], total: 1, page: 1, pageSize: 10 } });
    return Promise.reject(new Error(url));
  };
  beforeEach(() => vi.clearAllMocks());

  it('filters the timeline to the day picked on the pulse ribbon', async () => {
    renderPage('/activity', <ActivityPage />, { routes });
    await userEvent.click(await screen.findByRole('button', { name: /: 2 events$/ }));
    expect(screen.getByTestId('url')).toHaveTextContent(`date=${days[88].date}`);
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/activity', { params: expect.objectContaining({ date: days[88].date, utcOffset: expect.any(Number) }) }),
    );
    expect(await screen.findByRole('link', { name: 'Standing desk' })).toHaveAttribute('href', '/requests/4');
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByTestId('url')).toHaveTextContent(`date=${days[87].date}`);
    await userEvent.click(screen.getByRole('button', { name: /All days/ }));
    expect(screen.getByTestId('url')).not.toHaveTextContent('date=');
  });

  it('filters by kind of record and offers People only to admins', async () => {
    const { unmount } = renderPage('/activity', <ActivityPage />, { routes });
    await userEvent.click(await screen.findByRole('button', { name: 'Requests' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/activity', { params: expect.objectContaining({ entityType: 'request' }) }));
    expect(screen.queryByRole('button', { name: 'People' })).not.toBeInTheDocument();
    unmount();
    renderPage('/activity', <ActivityPage />, { routes, role: 'ADMIN' });
    expect(await screen.findByRole('button', { name: 'People' })).toBeInTheDocument();
  });
});

describe('Inbox', () => {
  const notifications = [
    { id: 1, message: 'Daniel assigned you a task', link: '/tasks/3', isRead: false, createdAt: new Date().toISOString() },
    { id: 2, message: 'Your request was approved', link: '/requests/6', isRead: false, createdAt: new Date().toISOString() },
    { id: 3, message: 'Older update', link: '/requests/7', isRead: true, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  ];
  const routes = (url) => (url === '/notifications' ? Promise.resolve({ data: { notifications, unreadCount: 2 } }) : Promise.reject(new Error(url)));
  beforeEach(() => vi.clearAllMocks());

  it('puts unread updates in their own lane and says plainly that it is not live', async () => {
    renderPage('/notifications', <NotificationsPage />, { routes });
    const lane = (await screen.findByRole('heading', { name: /Unread/ })).closest('section');
    expect(within(lane).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByText(/not live|not pushed live/).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /^Tasks/ }));
    expect(screen.getByText('Daniel assigned you a task')).toBeInTheDocument();
    expect(screen.queryByText('Your request was approved')).not.toBeInTheDocument();
  });

  it('moves an item out of the unread lane at once and back if the server refuses', async () => {
    api.patch.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Could not save.' } } });
    renderPage('/notifications', <NotificationsPage />, { routes });
    await screen.findByRole('heading', { name: /Unread/ });
    const [first] = screen.getAllByRole('button', { name: /Mark as read/ });
    await userEvent.click(first);
    expect(api.patch).toHaveBeenCalledWith('/notifications/1/read');
    expect(await screen.findByText('Could not save.')).toBeInTheDocument();
    const lane = screen.getByRole('heading', { name: /Unread/ }).closest('section');
    expect(within(lane).getByText('Daniel assigned you a task')).toBeInTheDocument();

    api.patch.mockResolvedValueOnce({ data: {} });
    await userEvent.click(within(lane).getAllByRole('button', { name: /Mark as read/ })[0]);
    await waitFor(() => expect(within(screen.getByRole('heading', { name: /Unread/ }).closest('section')).queryByText('Daniel assigned you a task')).not.toBeInTheDocument());
  });
});

describe('People', () => {
  const users = [
    { id: 1, name: 'Maya Chen', email: 'maya@x.test', role: 'EMPLOYEE', isActive: true, jobTitle: 'Coordinator', department: { id: 1, name: 'Operations' } },
    { id: 2, name: 'Daniel Reyes', email: 'daniel@x.test', role: 'MANAGER', isActive: true, jobTitle: 'Manager', department: { id: 1, name: 'Operations' } },
    { id: 3, name: 'Grace Thompson', email: 'grace@x.test', role: 'ADMIN', isActive: true, jobTitle: null, department: null },
  ];
  const routes = (url) => {
    if (url === '/users') return Promise.resolve({ data: { users } });
    if (url === '/departments') return Promise.resolve({ data: { departments: [{ id: 1, name: 'Operations' }] } });
    return Promise.reject(new Error(url));
  };

  it('groups people by department and edits them in a side panel', async () => {
    renderPage('/users', <UsersPage />, { routes, role: 'ADMIN' });
    const operations = (await screen.findByRole('heading', { name: /Operations/ })).closest('section');
    expect(within(operations).getAllByRole('listitem')).toHaveLength(2);
    expect(within(operations).getByText('Managers: Daniel Reyes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /No department/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit Maya Chen' }));
    const panel = screen.getByRole('dialog', { name: 'Edit Maya Chen' });
    await userEvent.click(within(panel).getByRole('checkbox', { name: 'Account is active' }));
    expect(within(panel).getByText('Saving signs Maya Chen out on every device straight away.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('LoginGraphic', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('leaves out the moving train when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<LoginGraphic />);
    expect(container.querySelector('animateMotion')).toBeNull();
  });

  it('animates the train otherwise', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<LoginGraphic />);
    expect(container.querySelector('animateMotion')).not.toBeNull();
  });
});

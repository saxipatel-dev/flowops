import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import TasksPage from '../pages/TasksPage.jsx';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, setUnauthorizedHandler: vi.fn() };
});

const maya = { id: 1, name: 'Maya Chen', email: 'maya@x.test' };
const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const tasks = [
  { id: 11, title: 'Update onboarding guide', status: 'TODO', priority: 'MEDIUM', dueDate: `${soon}T00:00:00.000Z`, createdAt: new Date().toISOString(), assignedTo: 1, assignee: maya, canUpdateStatus: true },
  { id: 12, title: 'Inventory report', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: `${soon}T00:00:00.000Z`, createdAt: new Date().toISOString(), assignedTo: 1, assignee: maya, canUpdateStatus: false },
];

function CurrentUrl() {
  const location = useLocation();
  return <p data-testid="url">{location.pathname + location.search}</p>;
}

// The app only renders pages once the signed-in user has loaded.
function WhenLoaded({ children }) {
  const { user } = useAuth();
  return user ? children : null;
}

function renderPage(url = '/tasks') {
  api.get.mockImplementation((path) => {
    if (path === '/auth/me') return Promise.resolve({ data: { user: { ...maya, role: 'EMPLOYEE', department: null } } });
    if (path === '/notifications') return Promise.resolve({ data: { notifications: [], unreadCount: 0 } });
    if (path === '/tasks') return Promise.resolve({ data: { tasks, total: 2, page: 1, pageSize: 200 } });
    return Promise.reject(new Error(path));
  });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/tasks" element={<WhenLoaded><TasksPage /><CurrentUrl /></WhenLoaded>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Task Atlas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens on the board with a column per status and loads every task at once', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /To Do/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /In Progress/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Completed/ })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/tasks', { params: expect.objectContaining({ pageSize: 200, scope: 'mine' }) });
  });

  it('only offers drag handles and "Move to" on tasks the user may move', async () => {
    renderPage();
    await screen.findByText('Update onboarding guide');
    expect(screen.getByRole('button', { name: 'Drag “Update onboarding guide”' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drag “Inventory report”' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move “Inventory report”/ })).not.toBeInTheDocument();
  });

  it('moves a card with the "Move to" menu and keeps it there when the server agrees', async () => {
    api.patch.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Move “Update onboarding guide”/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'In Progress' }));

    expect(api.patch).toHaveBeenCalledWith('/tasks/11', { status: 'IN_PROGRESS' });
    expect(await screen.findByText('Moved “Update onboarding guide” to In Progress.')).toBeInTheDocument();
  });

  it('puts the card back when the server refuses the move', async () => {
    api.patch.mockRejectedValue({ response: { status: 403, data: { error: 'You can only update the status of tasks assigned to you.' } } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Move “Update onboarding guide”/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Completed' }));

    expect(await screen.findByText('You can only update the status of tasks assigned to you.')).toBeInTheDocument();
    const todo = screen.getByRole('heading', { name: /To Do/ }).closest('section');
    expect(within(todo).getByText('Update onboarding guide')).toBeInTheDocument();
  });

  it('keeps the filters when switching views', async () => {
    renderPage('/tasks?search=guide&priority=HIGH');
    await screen.findByRole('heading', { name: /To Do/ });
    await userEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByTestId('url')).toHaveTextContent('search=guide');
    expect(screen.getByTestId('url')).toHaveTextContent('priority=HIGH');
    expect(screen.getByTestId('url')).toHaveTextContent('view=timeline');
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(api.get).toHaveBeenLastCalledWith('/tasks', { params: expect.objectContaining({ search: 'guide', priority: 'HIGH', page: '1' }) });
  });

  it('opens a task in the side panel and closes it with Escape', async () => {
    api.get.mockClear();
    renderPage();
    const link = await screen.findByRole('link', { name: 'Update onboarding guide' });
    api.get.mockImplementation((path) => {
      if (path === '/tasks/11') {
        return Promise.resolve({
          data: {
            task: { ...tasks[0], description: 'Refresh the guide', creator: maya, comments: [], request: null },
            activity: [{ id: 1, action: 'created task', user: maya, createdAt: new Date().toISOString() }],
            permissions: { canUpdateStatus: true, canEdit: false },
          },
        });
      }
      if (path === '/tasks') return Promise.resolve({ data: { tasks, total: 2, page: 1, pageSize: 200 } });
      return Promise.resolve({ data: { notifications: [], unreadCount: 0 } });
    });
    await userEvent.click(link);
    const panel = await screen.findByRole('dialog', { name: 'Update onboarding guide' });
    expect(within(panel).getByText('Refresh the guide')).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('task=11');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('url')).not.toHaveTextContent('task=11');
  });
});

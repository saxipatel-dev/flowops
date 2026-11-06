import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import CommandPalette from '../components/shell/CommandPalette.jsx';
import MobileTabBar from '../components/shell/MobileTabBar.jsx';
import SlideOver from '../components/SlideOver.jsx';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { ToastProvider, useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, default: { get: vi.fn(), post: vi.fn() }, setUnauthorizedHandler: vi.fn() };
});

function mockUser(role) {
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: { user: { id: 1, name: 'Test User', role, department: null } } });
    if (url === '/notifications') return Promise.resolve({ data: { notifications: [], unreadCount: 0 } });
    if (url === '/tasks') return Promise.resolve({ data: { tasks: [{ id: 7, title: 'Review backup logs', status: 'TODO', assignee: { name: 'Jordan Lee' } }] } });
    if (url === '/requests') return Promise.resolve({ data: { requests: [{ id: 3, title: 'Backup drive', status: 'PENDING', requester: { name: 'Sam Okafor' } }] } });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
}

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function WhenLoaded({ children }) {
  const { user } = useAuth();
  return user ? children : null;
}

function renderWithUser(role, ui) {
  mockUser(role);
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <ToastProvider>
          <WhenLoaded>
            {ui}
            <Routes>
              <Route path="*" element={<CurrentPath />} />
            </Routes>
          </WhenLoaded>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CommandPalette', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers only the pages and actions the role can use', async () => {
    renderWithUser('EMPLOYEE', <CommandPalette open onClose={() => {}} />);
    expect(await screen.findByRole('option', { name: /Tasks/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Approvals/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /New task/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /New request/ })).toBeInTheDocument();
  });

  it('searches tasks and requests through the normal list endpoints', async () => {
    renderWithUser('MANAGER', <CommandPalette open onClose={() => {}} />);
    await userEvent.type(await screen.findByRole('combobox'), 'backup');
    expect(await screen.findByRole('option', { name: /Review backup logs/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Backup drive/ })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/tasks', { params: { search: 'backup' } });
    expect(api.get).toHaveBeenCalledWith('/requests', { params: { search: 'backup', scope: 'team' } });
  });

  it('moves with the arrow keys and opens the chosen result with Enter', async () => {
    const onClose = vi.fn();
    renderWithUser('EMPLOYEE', <CommandPalette open onClose={onClose} />);
    const input = await screen.findByRole('combobox');
    expect(input).toHaveFocus();
    await userEvent.type(input, 'backup');
    await screen.findByRole('option', { name: /Review backup logs/ });
    // Arrow down past any matching pages until the task result is active.
    while (!screen.getByRole('option', { name: /Review backup logs/ }).getAttribute('aria-selected').includes('true')) {
      await userEvent.keyboard('{ArrowDown}');
    }
    await userEvent.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('path')).toHaveTextContent('/tasks/7');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    renderWithUser('EMPLOYEE', <CommandPalette open onClose={onClose} />);
    await screen.findByRole('combobox');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('MobileTabBar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('puts the remaining pages in the More menu and closes it with Escape', async () => {
    renderWithUser('MANAGER', <MobileTabBar onLogout={() => {}} />);
    const more = await screen.findByRole('button', { name: 'More' });
    expect(screen.getByRole('link', { name: 'Tasks' })).toBeInTheDocument();

    await userEvent.click(more);
    const sheet = screen.getByRole('dialog');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
    expect(sheet).toHaveTextContent('Approvals');
    expect(sheet).not.toHaveTextContent('User Management');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(more).toHaveFocus();
  });
});

describe('SlideOver', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open details
        </button>
        <SlideOver open={open} onClose={() => setOpen(false)} title="Task details">
          <button type="button">Inside</button>
        </SlideOver>
      </>
    );
  }

  it('takes focus, closes on Escape, and returns focus to the opener', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open details' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Task details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('Toasts', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <button type="button" onClick={() => toast.show('Moved to In progress.')}>
        Save
      </button>
    );
  }

  it('announces a message and lets the user dismiss it', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('Moved to In progress.');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Moved to In progress.'));
  });
});

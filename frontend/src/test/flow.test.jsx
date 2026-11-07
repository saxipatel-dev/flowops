import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import FlowMap from '../components/flow/FlowMap.jsx';
import DecisionForm from '../components/DecisionForm.jsx';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, setUnauthorizedHandler: vi.fn() };
});

const jordan = { id: 3, name: 'Jordan Lee' };
const priya = { id: 2, name: 'Priya Nair' };
const base = {
  id: 12,
  title: 'Second monitor',
  category: 'EQUIPMENT',
  estimatedCost: '210.00',
  createdAt: '2026-11-02T09:40:00.000Z',
  requester: jordan,
  reviewer: priya,
  task: null,
};
const noPermissions = { canDecide: false, createsFollowUpTask: true, canViewFollowUpTask: false };

function renderMap(request, permissions = noPermissions, viewerId = 3) {
  return render(
    <MemoryRouter>
      <FlowMap request={request} permissions={permissions} viewerId={viewerId} />
    </MemoryRouter>,
  );
}

const stops = () => within(screen.getByRole('list', { name: /Request journey/ })).getAllByRole('button');

describe('FlowMap', () => {
  it('opens on the current stage and moves with the arrow keys', async () => {
    renderMap({ ...base, status: 'PENDING' });
    expect(stops()).toHaveLength(5);
    expect(stops()[1]).toHaveAttribute('aria-pressed', 'true'); // With reviewer
    expect(screen.getAllByText(/The reviewer is assigned when the request is submitted/)[0]).toBeInTheDocument();

    stops()[1].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(stops()[2]).toHaveFocus();
    expect(stops()[2]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('No decision yet')[0]).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(stops()[4]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(stops()[0]).toHaveFocus();
  });

  it('tells the reviewer the request is waiting on them', () => {
    renderMap({ ...base, status: 'PENDING' }, { ...noPermissions, canDecide: true }, 2);
    // Starts on "With reviewer", worded for the person who has to decide.
    expect(stops()[1]).toHaveAccessibleName(/With you/);
  });

  it('shows a rejection, its reason, and the stages that no longer apply', () => {
    renderMap({ ...base, status: 'REJECTED', reviewedAt: '2026-11-03T10:00:00.000Z', decidedBy: priya, reviewComment: 'Not this quarter' });
    expect(stops()[2]).toHaveAttribute('aria-pressed', 'true');
    expect(stops()[2]).toHaveAccessibleName(/^Rejected\b[\s\S]*\. Rejected\./);
    expect(screen.getAllByText('“Not this quarter”')[0]).toBeInTheDocument();
    expect(stops()[3]).toHaveAccessibleName(/Does not apply/);
  });

  it('links to the follow-up task only for people who may open it', () => {
    const approved = {
      ...base,
      status: 'APPROVED',
      reviewedAt: '2026-11-03T10:00:00.000Z',
      decidedBy: priya,
      task: { id: 40, title: 'Fulfil request: Second monitor', status: 'IN_PROGRESS', completedAt: null, assignee: { id: 5, name: 'Sam Okafor' } },
    };
    const { unmount } = renderMap(approved);
    expect(stops()[3]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: 'Fulfil request: Second monitor' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/The task belongs to Sam Okafor/)[0]).toBeInTheDocument();
    unmount();

    renderMap(approved, { ...noPermissions, canViewFollowUpTask: true }, 2);
    expect(screen.getAllByRole('link', { name: 'Fulfil request: Second monitor' })[0]).toHaveAttribute('href', '/tasks/40');
  });

  it('never invents a completion time', async () => {
    renderMap({
      ...base,
      status: 'APPROVED',
      reviewedAt: '2026-11-03T10:00:00.000Z',
      decidedBy: priya,
      task: { id: 40, title: 'Fulfil', status: 'COMPLETED', completedAt: null, assignee: jordan },
    });
    await userEvent.click(stops()[4]);
    expect(screen.getAllByText('Time not recorded')[0]).toBeInTheDocument();
  });
});

describe('DecisionForm', () => {
  function WhenLoaded({ children }) {
    const { user } = useAuth();
    return user ? children : null;
  }

  beforeEach(() => {
    api.get.mockImplementation((path) => {
      if (path === '/auth/me') return Promise.resolve({ data: { user: { ...priya, role: 'MANAGER', department: null } } });
      if (path === '/users/assignable') return Promise.resolve({ data: { users: [priya, { id: 5, name: 'Sam Okafor' }] } });
      return Promise.reject(new Error(path));
    });
  });

  function renderForm(createsFollowUpTask) {
    return render(
      <AuthProvider>
        <WhenLoaded>
          <DecisionForm request={{ ...base, status: 'PENDING' }} createsFollowUpTask={createsFollowUpTask} onDecided={() => {}} />
        </WhenLoaded>
      </AuthProvider>,
    );
  }

  it('asks for a follow-up assignee only when the server says approval creates a task', async () => {
    const { unmount } = renderForm(false);
    expect(await screen.findByLabelText('Comment or rejection reason')).toBeInTheDocument();
    expect(screen.queryByLabelText('Assign task to')).not.toBeInTheDocument();
    expect(screen.getByText(/Jordan Lee is notified\.$/)).toBeInTheDocument();
    unmount();

    renderForm(true);
    const select = await screen.findByLabelText('Assign task to');
    expect(await screen.findByRole('option', { name: 'Sam Okafor' })).toBeInTheDocument();
    await userEvent.selectOptions(select, 'Sam Okafor');
    expect(screen.getByText('“Fulfil request: Second monitor”')).toBeInTheDocument();
    expect(screen.getAllByText('Sam Okafor').length).toBeGreaterThan(1);
  });
});

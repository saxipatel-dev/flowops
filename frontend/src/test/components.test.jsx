import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import Badge from '../components/Badge.jsx';
import Pagination from '../components/Pagination.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import IconRail from '../components/shell/IconRail.jsx';
import StatusChart from '../components/StatusChart.jsx';
import { getTimelineSteps } from '../components/ApprovalTimeline.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    default: { get: vi.fn(), post: vi.fn() },
    setUnauthorizedHandler: vi.fn(),
  };
});

describe('Badge', () => {
  it('shows readable labels for statuses and priorities', () => {
    render(
      <>
        <Badge value="IN_PROGRESS" />
        <Badge value="REJECTED" />
        <Badge value="HIGH" />
      </>,
    );
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('is hidden when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} pageSize={10} total={5} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('moves to the next page', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageSize={10} total={25} onChange={onChange} />);
    expect(screen.getByText('Page 1 of 3 (25 total)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    api.get.mockRejectedValue({ response: { status: 401 } });
    api.post.mockReset();
  });

  function renderLogin() {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('shows validation messages without calling the API', async () => {
    renderLogin();
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the server error for wrong credentials', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { error: 'Incorrect email or password.' } } });
    renderLogin();
    await userEvent.type(await screen.findByLabelText('Email'), 'maya@flowops.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'maya@flowops.test', password: 'wrong' });
  });
});

describe('IconRail', () => {
  // The app only renders the navigation after the user has loaded.
  function LoadedSidebar() {
    const { user } = useAuth();
    return user ? <IconRail onLogout={() => {}} /> : null;
  }

  function renderSidebar(role) {
    api.get.mockResolvedValue({ data: { user: { id: 1, name: 'Test User', role, department: null } } });
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoadedSidebar />
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('shows employees only the links they can use', async () => {
    renderSidebar('EMPLOYEE');
    expect(await screen.findByRole('link', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'User Management' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('shows Approvals to managers and User Management to admins', async () => {
    const { unmount } = renderSidebar('MANAGER');
    expect(await screen.findByRole('link', { name: 'Approvals' })).toBeInTheDocument();
    unmount();

    renderSidebar('ADMIN');
    expect(await screen.findByRole('link', { name: 'User Management' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument();
  });
});

describe('StatusChart', () => {
  it('lists each status with its count, share, and a filtered link', () => {
    render(
      <MemoryRouter>
        <StatusChart
          title="Team tasks"
          segments={[
            { key: 'TODO', label: 'To Do', value: 1, stroke: '', dot: '', to: '/tasks?status=TODO' },
            { key: 'COMPLETED', label: 'Completed', value: 3, stroke: '', dot: '', to: '/tasks?status=COMPLETED' },
          ]}
          emptyMessage="No tasks yet."
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: 'Team tasks: To Do: 1, Completed: 3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Completed\s*3\s*75%/ })).toHaveAttribute('href', '/tasks?status=COMPLETED');
  });

  it('shows a message when there is no data', () => {
    render(
      <MemoryRouter>
        <StatusChart title="My requests" segments={[{ key: 'PENDING', label: 'Pending', value: 0, to: '/' }]} emptyMessage="No requests yet." />
      </MemoryRouter>,
    );
    expect(screen.getByText('No requests yet.')).toBeInTheDocument();
  });
});

describe('ApprovalTimeline', () => {
  const base = {
    requester: { name: 'Maya Chen' },
    reviewer: { name: 'Daniel Reyes' },
    createdAt: '2026-11-01T09:00:00.000Z',
    category: 'EQUIPMENT',
    task: null,
  };

  it('shows a pending request waiting on its reviewer', () => {
    const steps = getTimelineSteps({ ...base, status: 'PENDING' });
    expect(steps.map((step) => [step.title, step.state])).toEqual([
      ['Submitted', 'submitted'],
      ['Awaiting review', 'current'],
      ['Decision', 'upcoming'],
      ['Follow-up task', 'upcoming'],
    ]);
    expect(steps[1].detail).toBe('Assigned to Daniel Reyes');
  });

  it('shows the rejection reason and no follow-up step', () => {
    const steps = getTimelineSteps({
      ...base,
      status: 'REJECTED',
      decidedBy: { name: 'Daniel Reyes' },
      reviewedAt: '2026-11-02T09:00:00.000Z',
      reviewComment: 'Use the spare one',
    });
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({ title: 'Rejected', state: 'rejected', comment: 'Use the spare one', commentLabel: 'Reason' });
  });

  it('marks an approved request fulfilled once its task is completed', () => {
    const task = { id: 7, title: 'Fulfil request: Laptop', status: 'COMPLETED', assignee: { name: 'Maya Chen' } };
    const steps = getTimelineSteps({ ...base, status: 'APPROVED', decidedBy: { name: 'Daniel Reyes' }, task });
    expect(steps.map((step) => step.title)).toEqual(['Submitted', 'Approved', 'Fulfilled']);
  });
});

describe('FilterBar', () => {
  it('searches automatically after typing stops', async () => {
    const onSearch = vi.fn();
    render(<FilterBar searchValue="" onSearch={onSearch} filters={[]} values={{}} onFilterChange={() => {}} onClear={() => {}} />);
    await userEvent.type(screen.getByRole('searchbox'), 'laptop');
    expect(onSearch).not.toHaveBeenCalled();
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('laptop'));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('offers a clear button only when filters are active', async () => {
    const onClear = vi.fn();
    const props = { onSearch: () => {}, values: { status: 'TODO' }, onFilterChange: () => {}, onClear };
    const filters = [{ name: 'status', label: 'Statuses', options: [{ value: 'TODO', label: 'To Do' }] }];
    const { rerender } = render(<FilterBar {...props} filters={filters} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalled();

    rerender(<FilterBar {...props} values={{}} filters={filters} />);
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import WeekLineMap from '../components/mission/WeekLineMap.jsx';
import PulseHeatmap from '../components/mission/PulseHeatmap.jsx';
import FocusTickets from '../components/mission/FocusTickets.jsx';
import RequestLines from '../components/mission/RequestLines.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, setUnauthorizedHandler: vi.fn() };
});

const maya = { id: 1, name: 'Maya Chen', email: 'maya@x.test' };
const sam = { id: 2, name: 'Sam Okafor', email: 'sam@x.test' };
const timeline = {
  start: '2026-11-09',
  days: 7,
  tasks: [
    { id: 11, title: 'Update onboarding guide', status: 'TODO', priority: 'MEDIUM', dueDate: '2026-11-11T00:00:00.000Z', assignedTo: 1, assignee: maya, canUpdateStatus: true },
    { id: 12, title: 'Guest Wi-Fi', status: 'TODO', priority: 'LOW', dueDate: '2026-11-13T00:00:00.000Z', assignedTo: 2, assignee: sam, canUpdateStatus: false },
  ],
  earlierOverdue: [],
};

function renderMap(props = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <WeekLineMap
          startKey="2026-11-09"
          today="2026-11-10"
          now={new Date('2026-11-10T10:00:00')}
          timeline={timeline}
          onWeekChange={() => {}}
          userId={1}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('WeekLineMap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('draws a line per person with a stop per task', () => {
    renderMap();
    const lines = screen.getByRole('list', { name: 'Tasks by person' });
    expect(within(lines).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Update onboarding guide\s*, you, To do/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guest Wi-Fi\s*, Sam Okafor/ })).toBeInTheDocument();
  });

  it('offers a status action only on tasks the user may move', async () => {
    renderMap();
    await userEvent.click(screen.getByRole('button', { name: /Guest Wi-Fi/ }));
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open task' })).toHaveAttribute('href', '/tasks/12');
  });

  it('moves a task straight away and keeps it when the server agrees', async () => {
    api.patch.mockResolvedValue({ data: {} });
    const onChanged = vi.fn();
    renderMap({ onChanged });
    await userEvent.click(screen.getByRole('button', { name: /Update onboarding guide/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(api.patch).toHaveBeenCalledWith('/tasks/11', { status: 'IN_PROGRESS' });
    expect(await screen.findByText('Moved “Update onboarding guide” to In Progress.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update onboarding guide\s*, you, In progress/ })).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('puts the task back and explains why when the server refuses', async () => {
    api.patch.mockRejectedValue({ response: { status: 403, data: { error: 'You can only update the status of tasks assigned to you.' } } });
    renderMap();
    await userEvent.click(screen.getByRole('button', { name: /Update onboarding guide/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(await screen.findByText('You can only update the status of tasks assigned to you.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update onboarding guide\s*, you, To do/ })).toBeInTheDocument();
  });

  it('changes week with the navigation buttons', async () => {
    const onWeekChange = vi.fn();
    renderMap({ onWeekChange });
    expect(screen.getByRole('button', { name: 'This week' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onWeekChange).toHaveBeenCalledWith(1);
  });
});

describe('PulseHeatmap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows each day, picks the latest active day, and moves with the arrow keys', async () => {
    const days = Array.from({ length: 91 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 7, 12) + index * 86400000).toISOString().slice(0, 10),
      count: index === 89 ? 3 : index === 82 ? 1 : 0,
    }));
    api.get.mockImplementation((url, { params }) => {
      if (url === '/activity/summary') return Promise.resolve({ data: { days, total: 4 } });
      if (url === '/activity') {
        return Promise.resolve({
          data: { activity: [{ id: params.date === days[89].date ? 1 : 2, action: 'created task', details: `Task on ${params.date}`, entityType: 'task', entityId: 3, createdAt: `${params.date}T12:00:00Z`, user: maya }], total: 1 },
        });
      }
      return Promise.reject(new Error(url));
    });

    render(
      <MemoryRouter>
        <PulseHeatmap />
      </MemoryRouter>,
    );
    const busy = await screen.findByRole('button', { name: /: 3 events/ });
    expect(busy).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /events?$/ })).toHaveLength(91);
    expect(await screen.findByText(`Task on ${days[89].date}`)).toBeInTheDocument();

    busy.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /: 1 event$/ })).toHaveFocus();
    expect(await screen.findByText(`Task on ${days[82].date}`)).toBeInTheDocument();
  });
});

describe('FocusTickets', () => {
  it('links each ticket to its record and says when nothing needs attention', () => {
    const items = [{ id: 'task-3', kind: 'late', title: 'Inventory report', detail: 'Assigned to you', to: '/tasks/3', stub: { value: '2d', label: 'late' } }];
    const { rerender } = render(
      <MemoryRouter>
        <FocusTickets items={items} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Late task\s+Inventory report/ })).toHaveAttribute('href', '/tasks/3');
    rerender(
      <MemoryRouter>
        <FocusTickets items={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nothing needs you right now')).toBeInTheDocument();
  });
});

describe('RequestLines', () => {
  const request = {
    id: 5,
    title: 'Second monitor',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    requester: { id: 3, name: 'Jordan Lee' },
    reviewer: { id: 2, name: 'Priya Nair' },
    task: null,
  };

  it('reveals what happened at a stop on hover, focus or tap', async () => {
    render(
      <MemoryRouter>
        <RequestLines requests={[request]} viewerId={2} />
      </MemoryRouter>,
    );
    expect(screen.getByText('With you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Second monitor' })).toHaveAttribute('href', '/requests/5');

    const stops = within(screen.getByRole('list', { name: 'Stages of Second monitor' })).getAllByRole('button');
    expect(stops).toHaveLength(5);

    await userEvent.hover(stops[0]);
    expect(screen.getByText(/Submitted by Jordan Lee/)).toBeInTheDocument();
    await userEvent.unhover(stops[0]);
    expect(screen.getByText('With you')).toBeInTheDocument();

    await userEvent.click(stops[2]);
    await userEvent.unhover(stops[2]);
    expect(stops[2]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No decision yet')).toBeInTheDocument();
  });
});

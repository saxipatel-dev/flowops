import { useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, CalendarRange, Columns3, List, ListChecks, Plus, SearchX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { useTaskStatus } from '../hooks/useTaskStatus.js';
import { formatDate, isOverdue, priorityLabels, taskStatusLabels, toOptions } from '../services/format.js';
import { todayKey } from '../services/missionControl.js';
import { VIEWS, shiftRange } from '../services/taskAtlas.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Tabs from '../components/Tabs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import { UserLabel } from '../components/Avatar.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import { buttonClasses } from '../components/Button.jsx';
import TaskBoard from '../components/tasks/TaskBoard.jsx';
import TaskTimeline from '../components/tasks/TaskTimeline.jsx';
import TaskSlideOver from '../components/tasks/TaskSlideOver.jsx';

// Board and timeline show every matching task at once (the API allows up to 200).
const ALL_AT_ONCE = 200;

const viewOptions = [
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'list', label: 'List', icon: List },
  { value: 'timeline', label: 'Timeline', icon: CalendarRange },
];

function DueDate({ task }) {
  if (!task.dueDate) return <span className="text-faint">No due date</span>;
  const overdue = isOverdue(task);
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${overdue ? 'font-medium text-bad' : ''}`}>
      {overdue && <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      {formatDate(task.dueDate)}
      {overdue && <span className="sr-only">(overdue)</span>}
    </span>
  );
}

const TaskTitle = ({ task }) => (
  <Link to={`/tasks/${task.id}`} className="font-medium text-ink transition-colors hover:text-accent">
    {task.title}
  </Link>
);

const columns = [
  { key: 'title', header: 'Task', cell: (task) => <TaskTitle task={task} />, className: 'w-full min-w-56' },
  { key: 'assignee', header: 'Assignee', cell: (task) => <UserLabel name={task.assignee.name} />, className: 'whitespace-nowrap' },
  { key: 'due', header: 'Due date', cell: (task) => <DueDate task={task} /> },
  { key: 'priority', header: 'Priority', cell: (task) => <Badge value={task.priority} /> },
  { key: 'status', header: 'Status', cell: (task) => <Badge value={task.status} /> },
];

function TaskCardRow({ task }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <TaskTitle task={task} />
        <Badge value={task.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
        <UserLabel name={task.assignee.name} size="xs" />
        <DueDate task={task} />
        <Badge value={task.priority} />
      </div>
    </div>
  );
}

function ViewSwitcher({ view, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-sunken p-0.5" role="group" aria-label="View">
      {viewOptions.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={view === value}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            view === value ? 'bg-raised text-ink shadow-raised' : 'text-muted hover:text-ink'
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const canCreate = user.role === 'MANAGER' || user.role === 'ADMIN';
  const [query, setQuery] = useQueryParams({ scope: 'mine', page: '1', view: 'board', range: 'week' });
  const view = VIEWS.includes(query.view) ? query.view : 'board';
  const now = useMemo(() => new Date(), []);
  const today = todayKey(now);

  // Only the filters reach the API; view, timeline position and the open task stay in the page.
  const apiParams = { scope: query.scope, search: query.search, status: query.status, priority: query.priority };
  if (view === 'list') apiParams.page = query.page;
  else apiParams.pageSize = ALL_AT_ONCE;
  const { data, loading, error, reload } = useApi('/tasks', apiParams);
  const { withChanges, move, savingId } = useTaskStatus(data?.tasks, { onSaved: reload });

  const hasFilters = Boolean(query.search || query.status || query.priority);
  const clearFilters = () => setQuery({ search: '', status: '', priority: '' });
  const tabs = [
    { value: 'mine', label: 'Assigned to me' },
    { value: 'all', label: user.role === 'ADMIN' ? 'All tasks' : 'Team tasks' },
  ];

  // Opening a task adds a history entry, so Back closes the panel.
  const openTask = useCallback(
    (task) => {
      const params = new URLSearchParams(location.search);
      params.set('task', String(task.id));
      setSearchParams(params, { state: { taskPanel: true } });
    },
    [location.search, setSearchParams],
  );
  const closeTask = useCallback(() => {
    if (location.state?.taskPanel) {
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(location.search);
    params.delete('task');
    setSearchParams(params, { replace: true });
  }, [location.search, location.state, navigate, setSearchParams]);

  function renderEmpty() {
    return hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No tasks match your filters"
        message="Try a different search or clear the filters."
        action={
          <button type="button" className={buttonClasses('secondary', 'sm')} onClick={clearFilters}>
            Clear filters
          </button>
        }
      />
    ) : (
      <EmptyState
        icon={ListChecks}
        title={query.scope === 'mine' ? 'No tasks assigned to you' : 'No team tasks yet'}
        message={query.scope === 'mine' ? 'New assignments will show up here.' : 'Tasks you create for your team will appear here.'}
        action={
          canCreate && (
            <Link to="/tasks/new" className={buttonClasses('secondary', 'sm')}>
              Create a task
            </Link>
          )
        }
      />
    );
  }

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.tasks.length === 0) return renderEmpty();
    const tasks = withChanges(data.tasks);

    if (view === 'list') {
      return (
        <>
          <DataTable label="Tasks" columns={columns} rows={tasks} renderCard={(task) => <TaskCardRow task={task} />} busy={loading} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setQuery({ page: String(page) })} />
        </>
      );
    }
    const truncated = data.total > data.tasks.length && (
      <p className="mx-4 mt-3 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
        Showing the first {data.tasks.length} of {data.total} tasks. Narrow the filters to see the rest.
      </p>
    );
    if (view === 'timeline') {
      return (
        <>
          {truncated}
          <TaskTimeline
            tasks={tasks}
            today={today}
            anchor={query.from || today}
            range={query.range === 'month' ? 'month' : 'week'}
            onRangeChange={(range) => setQuery({ range })}
            onShift={(direction) => setQuery({ from: direction === 0 ? '' : shiftRange(query.from || today, query.range, direction) })}
            onOpen={openTask}
          />
        </>
      );
    }
    return (
      <>
        {truncated}
        <div className={`p-3 transition-opacity sm:p-4 ${loading ? 'opacity-70' : ''}`}>
          <TaskBoard tasks={tasks} today={today} now={now} onOpen={openTask} onMove={move} savingId={savingId} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Task Atlas"
        title="Tasks"
        description="Board, list and timeline views of the same work. Filters carry across all three."
        actions={
          canCreate && (
            <Link to="/tasks/new" className={buttonClasses()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New task
            </Link>
          )
        }
      />

      <div className="card overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pr-3">
          {canCreate ? <Tabs tabs={tabs} active={query.scope} onChange={(scope) => setQuery({ scope })} className="" /> : <span className="px-4 py-3 text-sm font-medium text-ink">Assigned to me</span>}
          <div className="py-2 pl-3">
            <ViewSwitcher view={view} onChange={(next) => setQuery({ view: next })} />
          </div>
        </div>
        <FilterBar
          searchValue={query.search}
          searchPlaceholder="Search tasks by title"
          onSearch={(search) => setQuery({ search })}
          values={query}
          onFilterChange={(name, value) => setQuery({ [name]: value })}
          onClear={clearFilters}
          resultLabel={data && `${data.total} ${data.total === 1 ? 'task' : 'tasks'}`}
          filters={[
            { name: 'status', label: 'Statuses', options: toOptions(taskStatusLabels) },
            { name: 'priority', label: 'Priorities', options: toOptions(priorityLabels) },
          ]}
        />
        {renderBody()}
      </div>

      {query.task && <TaskSlideOver key={query.task} taskId={query.task} onClose={closeTask} onMove={move} savingId={savingId} />}
    </>
  );
}

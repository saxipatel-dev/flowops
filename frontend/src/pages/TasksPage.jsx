import { Link } from 'react-router';
import { AlertCircle, ListChecks, Plus, SearchX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { formatDate, isOverdue, priorityLabels, taskStatusLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Tabs from '../components/Tabs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import { UserLabel } from '../components/Avatar.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import { buttonClasses } from '../components/Button.jsx';

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

function TaskCard({ task }) {
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

export default function TasksPage() {
  const { user } = useAuth();
  const canCreate = user.role === 'MANAGER' || user.role === 'ADMIN';
  const [query, setQuery] = useQueryParams({ scope: 'mine', page: '1' });
  const { data, loading, error, reload } = useApi('/tasks', query);
  const hasFilters = Boolean(query.search || query.status || query.priority);
  const clearFilters = () => setQuery({ search: '', status: '', priority: '' });

  const tabs = [
    { value: 'mine', label: 'Assigned to me' },
    { value: 'all', label: user.role === 'ADMIN' ? 'All tasks' : 'Team tasks' },
  ];

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.tasks.length === 0) {
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
    return (
      <>
        <DataTable label="Tasks" columns={columns} rows={data.tasks} renderCard={(task) => <TaskCard task={task} />} busy={loading} />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setQuery({ page: String(page) })} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Track assigned work, deadlines, and progress."
        actions={
          canCreate && (
            <Link to="/tasks/new" className={buttonClasses()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New task
            </Link>
          )
        }
      />

      <div className="card overflow-hidden">
        {canCreate && <Tabs tabs={tabs} active={query.scope} onChange={(scope) => setQuery({ scope })} />}
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
    </>
  );
}

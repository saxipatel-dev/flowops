import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { formatDate, isOverdue, priorityLabels, taskStatusLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Tabs from '../components/Tabs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

export default function TasksPage() {
  const { user } = useAuth();
  const canCreate = user.role === 'MANAGER' || user.role === 'ADMIN';
  const [query, setQuery] = useQueryParams({ scope: 'mine', page: '1' });
  const { data, loading, error, reload } = useApi('/tasks', query);

  const tabs = [
    { value: 'mine', label: 'Assigned to me' },
    { value: 'all', label: user.role === 'ADMIN' ? 'All tasks' : 'Team tasks' },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Track assigned work, deadlines, and progress."
        actions={
          canCreate && (
            <Link to="/tasks/new" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              New task
            </Link>
          )
        }
      />

      <div className="card">
        {canCreate && <Tabs tabs={tabs} active={query.scope} onChange={(scope) => setQuery({ scope })} />}
        <FilterBar
          searchValue={query.search}
          searchPlaceholder="Search tasks by title"
          onSearch={(search) => setQuery({ search })}
          values={query}
          onFilterChange={(name, value) => setQuery({ [name]: value })}
          filters={[
            { name: 'status', label: 'Statuses', options: toOptions(taskStatusLabels) },
            { name: 'priority', label: 'Priorities', options: toOptions(priorityLabels) },
          ]}
        />

        {loading && <div className="px-4"><Loading /></div>}
        {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
        {!loading && !error && data.tasks.length === 0 && (
          <EmptyState title="No tasks found" message="Try changing the filters, or check back later." />
        )}
        {!loading && !error && data.tasks.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="table-basic">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Due date</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td>
                        <Link to={`/tasks/${task.id}`} className="link">
                          {task.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{task.assignee.name}</td>
                      <td className={`whitespace-nowrap ${isOverdue(task) ? 'font-medium text-red-600' : ''}`}>
                        {formatDate(task.dueDate)}
                      </td>
                      <td>
                        <Badge value={task.priority} />
                      </td>
                      <td>
                        <Badge value={task.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={(page) => setQuery({ page: String(page) })}
            />
          </>
        )}
      </div>
    </>
  );
}

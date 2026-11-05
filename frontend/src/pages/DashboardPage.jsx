import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, isOverdue } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

function SummaryCard({ label, value, to }) {
  return (
    <Link to={to} className="card block p-5 hover:border-brand">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/dashboard/summary');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { counts, upcomingDeadlines, recentActivity } = data;
  const isTeamView = user.role !== 'EMPLOYEE';

  return (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Here is an overview of your work." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Open tasks assigned to me" value={counts.assignedTasks} to="/tasks" />
        <SummaryCard label="Tasks in progress" value={counts.inProgressTasks} to="/tasks?status=IN_PROGRESS" />
        <SummaryCard label="My pending requests" value={counts.pendingRequests} to="/requests?status=PENDING" />
        {counts.pendingApprovals !== null && (
          <SummaryCard label="Waiting for my approval" value={counts.pendingApprovals} to="/approvals" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-navy">
            Upcoming deadlines {isTeamView && <span className="text-sm font-normal text-slate-500">(team)</span>}
          </h2>
          {upcomingDeadlines.length === 0 ? (
            <EmptyState title="No upcoming deadlines" message="Nothing is due in the next two weeks." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-basic">
                <thead>
                  <tr>
                    <th>Task</th>
                    {isTeamView && <th>Assignee</th>}
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingDeadlines.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/tasks/${task.id}`} className="link">
                          {task.title}
                        </Link>
                      </td>
                      {isTeamView && <td>{task.assignee.name}</td>}
                      <td className={isOverdue(task) ? 'font-medium text-red-600' : ''}>
                        {formatDate(task.dueDate)}
                        {isOverdue(task) && ' (overdue)'}
                      </td>
                      <td>
                        <Badge value={task.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-navy">Recent activity</h2>
            <Link to="/activity" className="link text-sm">
              View all
            </Link>
          </div>
          <ActivityList activity={recentActivity} />
        </section>
      </div>
    </>
  );
}

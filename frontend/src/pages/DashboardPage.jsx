import { Link } from 'react-router';
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  FileClock,
  FileText,
  ListChecks,
  Loader,
  PieChart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatDueLabel, isOverdue, requestStatusLabels, taskStatusLabels } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusChart from '../components/StatusChart.jsx';
import Avatar from '../components/Avatar.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

const taskSegments = [
  { key: 'TODO', stroke: 'stroke-slate-400', dot: 'bg-slate-400' },
  { key: 'IN_PROGRESS', stroke: 'stroke-blue-500', dot: 'bg-blue-500' },
  { key: 'COMPLETED', stroke: 'stroke-emerald-500', dot: 'bg-emerald-500' },
];

const requestSegments = [
  { key: 'PENDING', stroke: 'stroke-amber-400', dot: 'bg-amber-400' },
  { key: 'APPROVED', stroke: 'stroke-emerald-500', dot: 'bg-emerald-500' },
  { key: 'REJECTED', stroke: 'stroke-red-400', dot: 'bg-red-400' },
];

function dueTone(task) {
  if (isOverdue(task)) return 'text-red-700';
  if (formatDueLabel(task.dueDate) === 'Due today') return 'text-amber-700';
  return 'text-slate-500';
}

function DeadlineItem({ task, showAssignee }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <Link to={`/tasks/${task.id}`} className="block truncate text-sm font-medium text-navy hover:text-brand">
          {task.title}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          {showAssignee && (
            <>
              <Avatar name={task.assignee.name} size="xs" />
              <span className="truncate">{task.assignee.name}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="whitespace-nowrap">{formatDate(task.dueDate)}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className={`text-xs font-medium whitespace-nowrap ${dueTone(task)}`}>{formatDueLabel(task.dueDate)}</span>
        <Badge value={task.status} />
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi('/dashboard/summary');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { counts, taskStatusCounts, requestStatusCounts, upcomingDeadlines, recentActivity } = data;
  const isTeamView = user.role !== 'EMPLOYEE';
  const isManager = user.role === 'MANAGER';
  const scopeLabel = { EMPLOYEE: 'My', MANAGER: 'Team', ADMIN: 'All' }[user.role];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const taskChart = taskSegments.map((segment) => ({
    ...segment,
    label: taskStatusLabels[segment.key],
    value: taskStatusCounts[segment.key],
    to: isTeamView ? `/tasks?scope=all&status=${segment.key}` : `/tasks?status=${segment.key}`,
  }));
  const requestChart = requestSegments.map((segment) => ({
    ...segment,
    label: requestStatusLabels[segment.key],
    value: requestStatusCounts[segment.key],
    to: isTeamView ? `/requests?scope=team&status=${segment.key}` : `/requests?status=${segment.key}`,
  }));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description={`${today} · ${isTeamView ? 'An overview of your team’s work.' : 'An overview of your work.'}`}
      />

      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${isManager ? 'xl:grid-cols-4' : 'lg:grid-cols-3'} [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1`}>
        <StatCard
          label="Open tasks assigned to me"
          value={counts.assignedTasks}
          hint={counts.overdueTasks > 0 ? `${counts.overdueTasks} overdue` : 'Nothing overdue'}
          to="/tasks"
          icon={ListChecks}
        />
        <StatCard
          label="Tasks in progress"
          value={counts.inProgressTasks}
          hint={
            counts.assignedTasks === 0
              ? 'No open tasks'
              : `Of ${counts.assignedTasks} open ${counts.assignedTasks === 1 ? 'task' : 'tasks'}`
          }
          to="/tasks?status=IN_PROGRESS"
          icon={Loader}
          tone="blue"
        />
        <StatCard
          label="My pending requests"
          value={counts.pendingRequests}
          hint="Awaiting a manager’s review"
          to="/requests?status=PENDING"
          icon={FileClock}
          tone="amber"
        />
        {counts.pendingApprovals !== null && (
          <StatCard
            label="Waiting for my approval"
            value={counts.pendingApprovals}
            hint={counts.pendingApprovals > 0 ? 'Requests assigned to you' : 'You’re all caught up'}
            to="/approvals"
            icon={ClipboardCheck}
            tone="emerald"
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusChart
          title={`${scopeLabel} tasks`}
          description="By status"
          icon={PieChart}
          segments={taskChart}
          emptyMessage="No tasks yet."
        />
        <StatusChart
          title={`${scopeLabel} requests`}
          description="By status"
          icon={FileText}
          segments={requestChart}
          emptyMessage="No requests yet."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Upcoming deadlines"
            description={`Next 14 days${isTeamView ? ' · team' : ''}`}
            icon={CalendarClock}
            action={
              <Link to={isTeamView ? '/tasks?scope=all' : '/tasks'} className="link">
                All tasks
              </Link>
            }
          />
          {upcomingDeadlines.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No upcoming deadlines" message="Nothing is due in the next two weeks." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingDeadlines.map((task) => (
                <DeadlineItem key={task.id} task={task} showAssignee={isTeamView} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            icon={Activity}
            action={
              <Link to="/activity" className="link">
                View all
              </Link>
            }
          />
          <ActivityList activity={recentActivity.slice(0, 5)} />
        </Card>
      </div>
    </>
  );
}

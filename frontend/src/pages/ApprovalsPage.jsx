import { useState } from 'react';
import { Link } from 'react-router';
import { ClipboardCheck, History, Inbox } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { categoryLabels, formatCurrency, formatDate, formatDateTime, requestCode } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import Avatar, { UserLabel } from '../components/Avatar.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import { buttonClasses } from '../components/Button.jsx';

function PendingList() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi('/requests', { scope: 'review', status: 'PENDING', page });

  if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
  if (!data) return <Loading />;
  if (data.requests.length === 0) {
    return <EmptyState icon={ClipboardCheck} title="You're all caught up" message="There are no requests waiting for your review." />;
  }

  return (
    <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <ul className="divide-y divide-line-soft">
        {data.requests.map((request) => (
          <li key={request.id} className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-sunken sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar name={request.requester.name} />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-ink">{request.title}</span>
                  <span className="ml-2 font-mono text-[11px] whitespace-nowrap text-faint">{requestCode(request.id)}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {request.requester.name} · {categoryLabels[request.category]}
                  {request.estimatedCost !== null && <> · <span className="tabular-nums">{formatCurrency(request.estimatedCost)}</span></>} ·
                  Submitted {formatDate(request.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pl-11 sm:pl-0">
              <Badge value={request.priority} />
              <Link to={`/requests/${request.id}`} className={buttonClasses('primary', 'sm')}>
                Review
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </div>
  );
}

const historyColumns = [
  {
    key: 'request',
    header: 'Request',
    cell: (request) => (
      <Link to={`/requests/${request.id}`} className="font-medium text-ink transition-colors hover:text-accent">
        {request.title}
      </Link>
    ),
    className: 'min-w-48',
  },
  { key: 'requester', header: 'Requested by', cell: (request) => <UserLabel name={request.requester.name} />, className: 'whitespace-nowrap' },
  { key: 'decision', header: 'Decision', cell: (request) => <Badge value={request.status} /> },
  { key: 'reviewed', header: 'Reviewed', cell: (request) => formatDateTime(request.reviewedAt), className: 'whitespace-nowrap' },
  {
    key: 'comment',
    header: 'Comment',
    cell: (request) => (
      <span className="block max-w-xs truncate text-muted" title={request.reviewComment || ''}>
        {request.reviewComment || '—'}
      </span>
    ),
  },
];

function HistoryCard({ request }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/requests/${request.id}`} className="font-medium text-ink hover:text-accent">
          {request.title}
        </Link>
        <Badge value={request.status} />
      </div>
      <p className="text-xs text-muted">
        {request.requester.name} · {formatDateTime(request.reviewedAt)}
      </p>
      {request.reviewComment && <p className="line-clamp-2 text-xs text-muted">“{request.reviewComment}”</p>}
    </div>
  );
}

function ReviewHistory() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('APPROVED');
  const { data, loading, error, reload } = useApi('/requests', { scope: 'review', status, page });

  return (
    <>
      <div className="border-b border-line px-4 py-2.5">
        <div className="inline-flex rounded-lg bg-hover p-0.5" role="group" aria-label="Filter by decision">
          {['APPROVED', 'REJECTED'].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                status === value ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
            >
              {value === 'APPROVED' ? 'Approved' : 'Rejected'}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
      {!error && !data && <Loading />}
      {!error && data && data.requests.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={`No ${status === 'APPROVED' ? 'approved' : 'rejected'} requests yet`}
          message="Requests you review will be listed here."
        />
      )}
      {!error && data && data.requests.length > 0 && (
        <>
          <DataTable
            label="Review history"
            columns={historyColumns}
            rows={data.requests}
            renderCard={(request) => <HistoryCard request={request} />}
            busy={loading}
            stackBelow="lg"
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader title="Approvals" description="Requests from your team that are waiting for your decision." />
      <Card className="overflow-hidden">
        <CardHeader title="Pending approvals" icon={ClipboardCheck} />
        <PendingList />
      </Card>
      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Review history" icon={History} />
        <ReviewHistory />
      </Card>
    </>
  );
}

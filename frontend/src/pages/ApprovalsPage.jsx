import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ClipboardCheck, History, Inbox } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { categoryLabels, formatCurrency, formatDateTime, requestCode } from '../services/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import FlowMap from '../components/flow/FlowMap.jsx';
import DecisionForm from '../components/DecisionForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Badge, { PriorityBars } from '../components/Badge.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import Avatar, { UserLabel } from '../components/Avatar.jsx';
import { EmptyState, ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';
import { buttonClasses } from '../components/Button.jsx';

// "25m", "5h", "4d": how long a request has waited, short enough for the queue stub.
function formatWait(createdAt) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(createdAt)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function waitTone(createdAt) {
  const days = (Date.now() - new Date(createdAt)) / 86400000;
  if (days >= 3) return 'text-bad';
  if (days >= 1) return 'text-warn';
  return 'text-ink';
}

// One request in the queue: a button on wide screens (opens it in the review pane),
// a link to the full page on phones.
function QueueItem({ request, selected, onSelect }) {
  const body = (
    <>
      <Avatar name={request.requester.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{request.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {request.requester.name} · {categoryLabels[request.category]}
          {request.estimatedCost !== null && <> · <span className="font-mono">{formatCurrency(request.estimatedCost)}</span></>}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <PriorityBars value={request.priority} />
          <span className="text-[11px] text-faint">{request.priority.toLowerCase()} priority</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 border-l border-dashed border-line pl-3">
        <span className={`font-display text-lg leading-none font-bold ${waitTone(request.createdAt)}`}>{formatWait(request.createdAt)}</span>
        <span className="text-[11px] text-faint">waiting</span>
        <span className="mt-1 rounded-md bg-accent-strong px-2 py-0.5 text-[11px] font-medium text-on-accent" aria-hidden="true">
          Review
        </span>
      </span>
    </>
  );
  const classes = `w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
    selected ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong'
  }`;
  return (
    <li className="min-w-0">
      <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`Review “${request.title}” from ${request.requester.name}`} className={`hidden lg:flex ${classes}`}>
        {body}
      </button>
      <Link to={`/requests/${request.id}`} aria-label={`Review “${request.title}” from ${request.requester.name}`} className={`flex lg:hidden ${classes}`}>
        {body}
      </Link>
    </li>
  );
}

// The selected request, reviewed in place: its journey, what was asked, and the decision form.
function ReviewPane({ requestId, onDecided }) {
  const { user } = useAuth();
  const { data, error, reload } = useApi(`/requests/${requestId}`);
  const [message, setMessage] = useState('');

  if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
  if (!data) return <Loading text="Opening request…" />;
  const { request, permissions } = data;

  function decided(text) {
    setMessage(text);
    reload();
    onDecided(text);
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {requestCode(request.id)} · {categoryLabels[request.category]}
          </p>
          <h2 className="mt-1 text-xl font-bold">{request.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {request.requester.name} · submitted {formatDateTime(request.createdAt)} · <span className="font-mono text-ink-2">{formatCurrency(request.estimatedCost)}</span>
          </p>
        </div>
        <Link to={`/requests/${request.id}`} className={buttonClasses('secondary', 'sm')}>
          Open full page
        </Link>
      </div>
      <SuccessMessage message={message} />
      <FlowMap key={`${request.id}-${request.status}`} request={request} permissions={permissions} viewerId={user.id} compact />
      <div className="rounded-xl border border-line-soft bg-sunken p-4">
        <p className="eyebrow mb-1.5">What they asked for</p>
        <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{request.description}</p>
      </div>
      {permissions.canDecide && <DecisionForm request={request} createsFollowUpTask={permissions.createsFollowUpTask} onDecided={decided} />}
    </div>
  );
}

function ApprovalDesk() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi('/requests', { scope: 'review', status: 'PENDING', sort: 'oldest', page });
  const selectedId = searchParams.get('request') || (data?.requests[0] ? String(data.requests[0].id) : null);

  function select(id) {
    const params = new URLSearchParams(searchParams);
    params.set('request', String(id));
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="card overflow-hidden" aria-labelledby="queue-title">
        <div className="flex items-baseline justify-between border-b border-line px-4 py-3.5">
          <h2 id="queue-title" className="text-base font-semibold">
            Waiting for you
          </h2>
          <span className="text-xs text-faint">{data ? `${data.total} pending · longest first` : ''}</span>
        </div>
        {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
        {!data && !error && <Loading />}
        {data && data.requests.length === 0 && (
          <EmptyState icon={ClipboardCheck} title="You're all caught up" message="There are no requests waiting for your review." />
        )}
        {data && data.requests.length > 0 && (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <ul className="grid gap-2 p-3" aria-label="Requests waiting for your decision">
              {data.requests.map((request) => (
                <QueueItem key={request.id} request={request} selected={String(request.id) === selectedId} onSelect={() => select(request.id)} />
              ))}
            </ul>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </div>
        )}
      </section>

      <section className="card hidden min-h-[420px] lg:block" aria-label="Review">
        {selectedId ? (
          <ReviewPane
            key={selectedId}
            requestId={selectedId}
            onDecided={(text) => {
              toast.show(text);
              reload();
            }}
          />
        ) : (
          <EmptyState icon={ClipboardCheck} title="Nothing to review" message="New requests from your team will appear in the queue." />
        )}
      </section>
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
      <PageHeader eyebrow="Approval desk" title="Approvals" description="Review each request in context and decide without leaving the queue." />
      <ApprovalDesk />
      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Review history" icon={History} />
        <ReviewHistory />
      </Card>
    </>
  );
}

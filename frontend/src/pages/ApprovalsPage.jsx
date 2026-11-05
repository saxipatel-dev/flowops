import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { categoryLabels, formatCurrency, formatDate, formatDateTime, requestCode } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

function PendingList() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi('/requests', { scope: 'review', status: 'PENDING', page });

  if (loading) return <div className="px-4"><Loading /></div>;
  if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
  if (data.requests.length === 0) {
    return <EmptyState title="You're all caught up" message="There are no requests waiting for your review." />;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {data.requests.map((request) => (
          <li key={request.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm">
                <span className="mr-2 text-slate-500">{requestCode(request.id)}</span>
                <span className="font-medium text-slate-900">{request.title}</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Submitted by {request.requester.name} · {categoryLabels[request.category]} · {formatCurrency(request.estimatedCost)} ·{' '}
                {formatDate(request.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge value={request.priority} />
              <Link to={`/requests/${request.id}`} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                Review
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </>
  );
}

function ReviewHistory() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('APPROVED');
  const { data, loading, error, reload } = useApi('/requests', { scope: 'review', status, page });

  return (
    <>
      <div className="flex gap-2 border-b border-slate-200 px-4 py-3">
        {['APPROVED', 'REJECTED'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1 text-sm font-medium ${status === value ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {value === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>
      {loading && <div className="px-4"><Loading /></div>}
      {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
      {!loading && !error && data.requests.length === 0 && <EmptyState title="No reviewed requests yet" />}
      {!loading && !error && data.requests.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="table-basic">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Requested by</th>
                  <th>Decision</th>
                  <th>Reviewed</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link to={`/requests/${request.id}`} className="link">
                        {request.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{request.requester.name}</td>
                    <td>
                      <Badge value={request.status} />
                    </td>
                    <td className="whitespace-nowrap">{formatDateTime(request.reviewedAt)}</td>
                    <td className="max-w-xs truncate text-slate-500" title={request.reviewComment || ''}>
                      {request.reviewComment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <section className="card">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-navy">Pending approvals</h2>
        <PendingList />
      </section>
      <section className="card mt-6">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-navy">Review history</h2>
        <ReviewHistory />
      </section>
    </>
  );
}

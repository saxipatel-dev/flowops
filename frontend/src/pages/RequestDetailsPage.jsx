import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useApi } from '../hooks/useApi.js';
import { categoryLabels, formatCurrency, formatDateTime, requestCode } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import DecisionForm from '../components/DecisionForm.jsx';
import CommentSection from '../components/CommentSection.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function RequestDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const { data, loading, error, reload } = useApi(`/requests/${id}`);
  const [message, setMessage] = useState(location.state?.message || '');

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { request, activity, permissions } = data;

  function handleDecided(text) {
    setMessage(text);
    reload();
  }

  return (
    <>
      <Link to="/requests" className="link mb-3 inline-block text-sm">
        ← Back to requests
      </Link>
      <PageHeader title={request.title} description={`${requestCode(request.id)} · Submitted ${formatDateTime(request.createdAt)}`} />
      <SuccessMessage message={message} />

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="font-semibold text-navy">Description</h2>
            <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{request.description}</p>
          </section>

          {permissions.canDecide && <DecisionForm request={request} onDecided={handleDecided} />}

          {request.status !== 'PENDING' && (
            <section className={`card p-5 ${request.status === 'REJECTED' ? 'border-red-200' : 'border-emerald-200'}`}>
              <h2 className="font-semibold text-navy">Manager review</h2>
              <p className="mt-2 text-sm text-slate-700">
                <Badge value={request.status} /> by <span className="font-medium">{request.decidedBy?.name}</span> on{' '}
                {formatDateTime(request.reviewedAt)}
              </p>
              {request.reviewComment && (
                <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-medium">{request.status === 'REJECTED' ? 'Reason: ' : 'Comment: '}</span>
                  {request.reviewComment}
                </p>
              )}
            </section>
          )}

          <CommentSection comments={request.comments} target={{ requestId: request.id }} onAdded={reload} />
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <dl className="space-y-4">
              <Detail label="Status">
                <Badge value={request.status} />
              </Detail>
              <Detail label="Category">{categoryLabels[request.category]}</Detail>
              <Detail label="Priority">
                <Badge value={request.priority} />
              </Detail>
              <Detail label="Estimated cost">{formatCurrency(request.estimatedCost)}</Detail>
              <Detail label="Requested by">
                {request.requester.name}
                {request.requester.department && <span className="text-slate-500"> · {request.requester.department.name}</span>}
              </Detail>
              <Detail label="Reviewer">{request.reviewer.name}</Detail>
              {request.task && (
                <Detail label="Follow-up task">
                  <Link to={`/tasks/${request.task.id}`} className="link">
                    {request.task.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Badge value={request.task.status} /> Assigned to {request.task.assignee.name}
                  </div>
                </Detail>
              )}
            </dl>
          </section>

          <section className="card">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-navy">History</h2>
            <ActivityList activity={activity} showLinks={false} />
          </section>
        </div>
      </div>
    </>
  );
}

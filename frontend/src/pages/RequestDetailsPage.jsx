import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { FileText, Gavel, History, Info, Route } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { categoryLabels, formatCurrency, formatDateTime, formatDuration, requestCode } from '../services/format.js';
import Badge from '../components/Badge.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import DetailList, { DetailItem } from '../components/DetailList.jsx';
import { UserLabel } from '../components/Avatar.jsx';
import FlowMap from '../components/flow/FlowMap.jsx';
import DecisionForm from '../components/DecisionForm.jsx';
import CommentSection from '../components/CommentSection.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

// The recorded decision: who, when, how long it took and what they said.
function DecisionRecord({ request }) {
  if (request.status === 'PENDING') {
    return (
      <p className="px-4 py-3.5 text-sm text-muted">
        Waiting for {request.reviewer.name} for {formatDuration(request.createdAt)}.
      </p>
    );
  }
  const approved = request.status === 'APPROVED';
  return (
    <DetailList>
      <DetailItem label="Decision">
        <Badge value={request.status} />
      </DetailItem>
      <DetailItem label="Decided by">
        <UserLabel name={request.decidedBy?.name || request.reviewer.name} size="xs" />
      </DetailItem>
      <DetailItem label="When">
        <span className="font-mono text-[13px]">{formatDateTime(request.reviewedAt)}</span>
      </DetailItem>
      <DetailItem label="Time to decide">{formatDuration(request.createdAt, request.reviewedAt)}</DetailItem>
      <DetailItem label={approved ? 'Note' : 'Reason'}>
        {request.reviewComment ? <span className="italic">“{request.reviewComment}”</span> : <span className="text-faint">No note</span>}
      </DetailItem>
    </DetailList>
  );
}

// Decision Journey: a request and everything that has happened to it, with the FlowMap first.
export default function RequestDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
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
      <header className="mb-5">
        <p className="eyebrow">
          {requestCode(request.id)} · {categoryLabels[request.category]}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[26px] leading-tight font-bold sm:text-[30px]">{request.title}</h1>
          <Badge value={request.status} />
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <UserLabel name={request.requester.name} size="xs" />
          <span aria-hidden="true">·</span>
          <span>Submitted {formatDateTime(request.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-ink-2">{formatCurrency(request.estimatedCost)}</span>
          <Badge value={request.priority} />
        </p>
      </header>
      <SuccessMessage message={message} />

      <Card className="mt-4">
        <CardHeader title="Decision journey" description="Every stage comes from the request's own record." icon={Route} />
        <div className="p-4 sm:p-5">
          <FlowMap key={`${request.status}-${request.task?.status}`} request={request} permissions={permissions} viewerId={user.id} />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Description" icon={FileText} />
            <p className="px-4 py-3.5 text-sm leading-relaxed whitespace-pre-line text-ink-2">{request.description}</p>
          </Card>

          {permissions.canDecide && <DecisionForm request={request} createsFollowUpTask={permissions.createsFollowUpTask} onDecided={handleDecided} />}

          <CommentSection comments={request.comments} target={{ requestId: request.id }} onAdded={reload} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Decision" icon={Gavel} />
            <DecisionRecord request={request} />
          </Card>

          <Card>
            <CardHeader title="Facts" icon={Info} />
            <DetailList>
              <DetailItem label="Category">{categoryLabels[request.category]}</DetailItem>
              <DetailItem label="Estimated cost">
                <span className="font-mono text-[13px]">{formatCurrency(request.estimatedCost)}</span>
              </DetailItem>
              <DetailItem label="Requested by">
                <UserLabel name={request.requester.name} size="xs" />
              </DetailItem>
              {request.requester.department && <DetailItem label="Department">{request.requester.department.name}</DetailItem>}
              <DetailItem label="Reviewer">
                <UserLabel name={request.reviewer.name} size="xs" />
              </DetailItem>
              <DetailItem label="Follow-up task">
                {permissions.createsFollowUpTask ? 'Created when approved' : 'Not used for this category'}
              </DetailItem>
            </DetailList>
          </Card>

          <Card>
            <CardHeader title="History" icon={History} />
            <ActivityList activity={activity} showLinks={false} />
          </Card>
        </div>
      </div>
    </>
  );
}

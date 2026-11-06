import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { FileText, History, Info, Route } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { categoryLabels, formatCurrency, formatDateTime, requestCode } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import DetailList, { DetailItem } from '../components/DetailList.jsx';
import { UserLabel } from '../components/Avatar.jsx';
import ApprovalTimeline from '../components/ApprovalTimeline.jsx';
import DecisionForm from '../components/DecisionForm.jsx';
import CommentSection from '../components/CommentSection.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

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
      <PageHeader
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="tabular-nums">{requestCode(request.id)}</span>
            <Badge value={request.status} />
            <Badge value={request.priority} />
            <span>Submitted {formatDateTime(request.createdAt)}</span>
          </span>
        }
      />
      <SuccessMessage message={message} />

      {/* On phones the approval progress comes first; on desktop it heads the side column. */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        <Card className="lg:col-start-3 lg:row-start-1">
          <CardHeader title="Approval progress" icon={Route} />
          <ApprovalTimeline request={request} />
        </Card>

        <div className="space-y-4 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Card>
            <CardHeader title="Description" icon={FileText} />
            <p className="px-4 py-3.5 text-sm leading-relaxed whitespace-pre-line text-slate-700">{request.description}</p>
          </Card>

          {permissions.canDecide && <DecisionForm request={request} onDecided={handleDecided} />}

          <CommentSection comments={request.comments} target={{ requestId: request.id }} onAdded={reload} />
        </div>

        <div className="space-y-4 lg:col-start-3 lg:row-start-2">
          <Card>
            <CardHeader title="Details" icon={Info} />
            <DetailList>
              <DetailItem label="Category">{categoryLabels[request.category]}</DetailItem>
              <DetailItem label="Estimated cost">
                <span className="tabular-nums">{formatCurrency(request.estimatedCost)}</span>
              </DetailItem>
              <DetailItem label="Requested by">
                <UserLabel name={request.requester.name} size="xs" />
              </DetailItem>
              {request.requester.department && <DetailItem label="Department">{request.requester.department.name}</DetailItem>}
              <DetailItem label="Reviewer">
                <UserLabel name={request.reviewer.name} size="xs" />
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

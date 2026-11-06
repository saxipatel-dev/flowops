import { useState } from 'react';
import { Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import PageHeader from '../components/PageHeader.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import Pagination from '../components/Pagination.jsx';
import Tabs from '../components/Tabs.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

const descriptions = {
  ADMIN: 'All activity across FlowOps.',
  MANAGER: 'Recent actions by you and your team.',
  EMPLOYEE: 'Your actions and updates to your tasks and requests.',
};

export default function ActivityPage() {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi('/activity', { entityType, page });

  const tabs = [
    { value: '', label: 'All' },
    { value: 'task', label: 'Tasks' },
    { value: 'request', label: 'Requests' },
  ];
  if (user.role === 'ADMIN') tabs.push({ value: 'user', label: 'Users' });

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.activity.length === 0) {
      return <EmptyState icon={Activity} title="No activity yet" message="Actions on tasks and requests will appear here as they happen." />;
    }
    return (
      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <ActivityTimeline activity={data.activity} />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Activity" description={descriptions[user.role]} />
      <div className="card overflow-clip">
        <Tabs
          tabs={tabs}
          active={entityType}
          onChange={(value) => {
            setEntityType(value);
            setPage(1);
          }}
        />
        {renderBody()}
      </div>
    </div>
  );
}

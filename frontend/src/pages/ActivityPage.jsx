import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import PageHeader from '../components/PageHeader.jsx';
import ActivityList from '../components/ActivityList.jsx';
import Pagination from '../components/Pagination.jsx';
import Tabs from '../components/Tabs.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

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

  return (
    <>
      <PageHeader title="Activity" description={descriptions[user.role]} />
      <div className="card">
        <Tabs
          tabs={tabs}
          active={entityType}
          onChange={(value) => {
            setEntityType(value);
            setPage(1);
          }}
        />
        {loading && <div className="px-4"><Loading /></div>}
        {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
        {!loading && !error && (
          <>
            <ActivityList activity={data.activity} />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}

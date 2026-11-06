import { Link } from 'react-router';
import { FileText, Plus, SearchX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { categoryLabels, formatCurrency, formatDate, requestCode, requestStatusLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Tabs from '../components/Tabs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import { UserLabel } from '../components/Avatar.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import { buttonClasses } from '../components/Button.jsx';

const RequestTitle = ({ request }) => (
  <div className="min-w-0">
    <Link to={`/requests/${request.id}`} className="font-medium text-navy transition-colors hover:text-brand">
      {request.title}
    </Link>
    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{requestCode(request.id)}</p>
  </div>
);

function getColumns(showRequester) {
  return [
    { key: 'title', header: 'Request', cell: (request) => <RequestTitle request={request} />, className: 'w-full min-w-56' },
    showRequester && {
      key: 'requester',
      header: 'Requested by',
      cell: (request) => <UserLabel name={request.requester.name} />,
      className: 'whitespace-nowrap',
    },
    { key: 'category', header: 'Category', cell: (request) => categoryLabels[request.category], className: 'whitespace-nowrap' },
    {
      key: 'amount',
      header: 'Amount',
      cell: (request) => formatCurrency(request.estimatedCost),
      className: 'text-right whitespace-nowrap tabular-nums',
    },
    { key: 'submitted', header: 'Submitted', cell: (request) => formatDate(request.createdAt), className: 'whitespace-nowrap' },
    { key: 'priority', header: 'Priority', cell: (request) => <Badge value={request.priority} /> },
    { key: 'status', header: 'Status', cell: (request) => <Badge value={request.status} /> },
  ].filter(Boolean);
}

function RequestCard({ request, showRequester }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <RequestTitle request={request} />
        <Badge value={request.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
        {showRequester && <UserLabel name={request.requester.name} size="xs" />}
        <span>{categoryLabels[request.category]}</span>
        {request.estimatedCost !== null && <span className="tabular-nums">{formatCurrency(request.estimatedCost)}</span>}
        <span>{formatDate(request.createdAt)}</span>
        <Badge value={request.priority} />
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useQueryParams({ scope: 'mine', page: '1' });
  const { data, loading, error, reload } = useApi('/requests', query);
  const showRequester = query.scope !== 'mine';
  const hasFilters = Boolean(query.search || query.status || query.category);
  const clearFilters = () => setQuery({ search: '', status: '', category: '' });

  const tabs = [{ value: 'mine', label: 'My requests' }];
  if (user.role === 'MANAGER') tabs.push({ value: 'team', label: 'Team requests' });
  if (user.role === 'ADMIN') tabs.push({ value: 'team', label: 'All requests' });

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.requests.length === 0) {
      if (hasFilters) {
        return (
          <EmptyState
            icon={SearchX}
            title="No requests match your filters"
            message="Try a different search or clear the filters."
            action={
              <button type="button" className={buttonClasses('secondary', 'sm')} onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        );
      }
      return query.scope === 'mine' ? (
        <EmptyState
          icon={FileText}
          title="You haven't submitted any requests"
          message="Need equipment, a purchase, or IT help? Submit a request and your manager will review it."
          action={
            <Link to="/requests/new" className={buttonClasses('secondary', 'sm')}>
              Submit a request
            </Link>
          }
        />
      ) : (
        <EmptyState icon={FileText} title="No team requests yet" message="Requests from your team will appear here." />
      );
    }
    return (
      <>
        <DataTable
          label="Requests"
          columns={getColumns(showRequester)}
          rows={data.requests}
          renderCard={(request) => <RequestCard request={request} showRequester={showRequester} />}
          busy={loading}
          stackBelow="lg"
        />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setQuery({ page: String(page) })} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Requests"
        description="Submit internal requests and follow their status."
        actions={
          <Link to="/requests/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New request
          </Link>
        }
      />

      <div className="card overflow-hidden">
        {tabs.length > 1 && <Tabs tabs={tabs} active={query.scope} onChange={(scope) => setQuery({ scope })} />}
        <FilterBar
          searchValue={query.search}
          searchPlaceholder="Search requests by title"
          onSearch={(search) => setQuery({ search })}
          values={query}
          onFilterChange={(name, value) => setQuery({ [name]: value })}
          onClear={clearFilters}
          resultLabel={data && `${data.total} ${data.total === 1 ? 'request' : 'requests'}`}
          filters={[
            { name: 'status', label: 'Statuses', options: toOptions(requestStatusLabels) },
            { name: 'category', label: 'Categories', options: toOptions(categoryLabels) },
          ]}
        />
        {renderBody()}
      </div>
    </>
  );
}

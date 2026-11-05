import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { categoryLabels, formatCurrency, formatDate, requestCode, requestStatusLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Tabs from '../components/Tabs.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

export default function RequestsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useQueryParams({ scope: 'mine', page: '1' });
  const { data, loading, error, reload } = useApi('/requests', query);
  const showRequester = query.scope !== 'mine';

  const tabs = [{ value: 'mine', label: 'My requests' }];
  if (user.role === 'MANAGER') tabs.push({ value: 'team', label: 'Team requests' });
  if (user.role === 'ADMIN') tabs.push({ value: 'team', label: 'All requests' });

  return (
    <>
      <PageHeader
        title="Requests"
        description="Submit internal requests and follow their status."
        actions={
          <Link to="/requests/new" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            New request
          </Link>
        }
      />

      <div className="card">
        {tabs.length > 1 && <Tabs tabs={tabs} active={query.scope} onChange={(scope) => setQuery({ scope })} />}
        <FilterBar
          searchValue={query.search}
          searchPlaceholder="Search requests by title"
          onSearch={(search) => setQuery({ search })}
          values={query}
          onFilterChange={(name, value) => setQuery({ [name]: value })}
          filters={[
            { name: 'status', label: 'Statuses', options: toOptions(requestStatusLabels) },
            { name: 'category', label: 'Categories', options: toOptions(categoryLabels) },
          ]}
        />

        {loading && <div className="px-4"><Loading /></div>}
        {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
        {!loading && !error && data.requests.length === 0 && (
          <EmptyState
            title="No requests found"
            message={query.scope === 'mine' ? 'You have not submitted any matching requests.' : 'Try changing the filters.'}
          />
        )}
        {!loading && !error && data.requests.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="table-basic">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    {showRequester && <th>Requested by</th>}
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap text-slate-500">{requestCode(request.id)}</td>
                      <td>
                        <Link to={`/requests/${request.id}`} className="link">
                          {request.title}
                        </Link>
                      </td>
                      {showRequester && <td className="whitespace-nowrap">{request.requester.name}</td>}
                      <td className="whitespace-nowrap">{categoryLabels[request.category]}</td>
                      <td>{formatCurrency(request.estimatedCost)}</td>
                      <td className="whitespace-nowrap">{formatDate(request.createdAt)}</td>
                      <td>
                        <Badge value={request.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setQuery({ page: String(page) })} />
          </>
        )}
      </div>
    </>
  );
}

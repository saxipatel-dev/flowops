import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { roleLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import FilterBar from '../components/FilterBar.jsx';
import UserForm from '../components/UserForm.jsx';
import { EmptyState, ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

export default function UsersPage() {
  const [filters, setFilters] = useState({ search: '', role: '' });
  const { data, loading, error, reload } = useApi('/users', filters);
  const { data: departmentData } = useApi('/departments');
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  function openForm(user = null) {
    setEditingUser(user);
    setShowForm(true);
    setMessage('');
  }

  function handleSaved(text) {
    setShowForm(false);
    setEditingUser(null);
    setMessage(text);
    reload();
  }

  return (
    <>
      <PageHeader
        title="User management"
        description="Add people, assign roles and departments, and deactivate accounts."
        actions={!showForm && <Button onClick={() => openForm()}>Add user</Button>}
      />

      <div className="space-y-4">
        <SuccessMessage message={message} />
        {showForm && (
          <UserForm
            key={editingUser?.id || 'new'}
            user={editingUser}
            departments={departmentData?.departments || []}
            onSaved={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="card">
          <FilterBar
            searchValue={filters.search}
            searchPlaceholder="Search by name or email"
            onSearch={(search) => setFilters({ ...filters, search })}
            values={filters}
            onFilterChange={(name, value) => setFilters({ ...filters, [name]: value })}
            filters={[{ name: 'role', label: 'Roles', options: toOptions(roleLabels) }]}
          />
          {loading && <div className="px-4"><Loading /></div>}
          {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
          {!loading && !error && data.users.length === 0 && <EmptyState title="No users found" />}
          {!loading && !error && data.users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table-basic">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.users.map((user) => (
                    <tr key={user.id} className={user.isActive ? '' : 'text-slate-400'}>
                      <td>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        {user.jobTitle && <p className="text-xs text-slate-500">{user.jobTitle}</p>}
                      </td>
                      <td>{user.email}</td>
                      <td>{roleLabels[user.role]}</td>
                      <td>{user.department?.name || '—'}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button type="button" className="link text-sm" onClick={() => openForm(user)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

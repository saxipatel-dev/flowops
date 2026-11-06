import { useEffect, useRef, useState } from 'react';
import { Pencil, UserPlus, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { roleLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import Avatar from '../components/Avatar.jsx';
import UserForm from '../components/UserForm.jsx';
import { EmptyState, ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

function Person({ user }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={user.name} />
      <div className="min-w-0">
        <p className={`truncate font-medium ${user.isActive ? 'text-navy' : 'text-slate-500'}`}>{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.jobTitle || 'No job title'}</p>
      </div>
    </div>
  );
}

function EditButton({ user, onEdit }) {
  return (
    <Button variant="ghost" size="sm" icon={Pencil} onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`}>
      Edit
    </Button>
  );
}

function getColumns(onEdit) {
  return [
    { key: 'name', header: 'Name', cell: (user) => <Person user={user} />, className: 'min-w-56' },
    { key: 'email', header: 'Email', cell: (user) => <span className="text-slate-600">{user.email}</span> },
    { key: 'role', header: 'Role', cell: (user) => <Badge value={user.role} /> },
    {
      key: 'department',
      header: 'Department',
      cell: (user) => user.department?.name || <span className="text-slate-400">—</span>,
      className: 'whitespace-nowrap',
    },
    { key: 'status', header: 'Status', cell: (user) => <Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (user) => <EditButton user={user} onEdit={onEdit} />,
      className: 'text-right',
    },
  ];
}

function UserCard({ user, onEdit }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <Person user={user} />
        <EditButton user={user} onEdit={onEdit} />
      </div>
      <p className="truncate pl-11 text-xs text-slate-500">{user.email}</p>
      <div className="flex flex-wrap items-center gap-2 pl-11 text-xs text-slate-500">
        <Badge value={user.role} />
        <Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
        {user.department && <span>{user.department.name}</span>}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [filters, setFilters] = useState({ search: '', role: '' });
  const { data, loading, error, reload } = useApi('/users', filters);
  const { data: departmentData } = useApi('/departments');
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const formRef = useRef(null);

  // Bring the form into view when it opens, since it sits above a long list.
  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showForm, editingUser]);

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

  const hasFilters = Boolean(filters.search || filters.role);

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.users.length === 0) {
      return <EmptyState icon={Users} title="No users found" message={hasFilters ? 'Try a different search or role.' : 'Add the first person to get started.'} />;
    }
    return (
      <DataTable
        label="Users"
        columns={getColumns(openForm)}
        rows={data.users}
        renderCard={(user) => <UserCard user={user} onEdit={openForm} />}
        busy={loading}
        stackBelow="lg"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="User management"
        description="Add people, assign roles and departments, and deactivate accounts."
        actions={
          !showForm && (
            <Button icon={UserPlus} onClick={() => openForm()}>
              Add user
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <SuccessMessage message={message} />
        {showForm && (
          <div ref={formRef} className="scroll-mt-20">
            <UserForm
              key={editingUser?.id || 'new'}
              user={editingUser}
              departments={departmentData?.departments || []}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <div className="card overflow-hidden">
          <FilterBar
            searchValue={filters.search}
            searchPlaceholder="Search by name or email"
            onSearch={(search) => setFilters({ ...filters, search })}
            values={filters}
            onFilterChange={(name, value) => setFilters({ ...filters, [name]: value })}
            onClear={() => setFilters({ search: '', role: '' })}
            resultLabel={data && `${data.users.length} ${data.users.length === 1 ? 'person' : 'people'}`}
            filters={[{ name: 'role', label: 'Roles', options: toOptions(roleLabels) }]}
          />
          {renderBody()}
        </div>
      </div>
    </>
  );
}

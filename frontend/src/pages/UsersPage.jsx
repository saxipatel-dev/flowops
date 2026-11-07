import { useState } from 'react';
import { Pencil, UserPlus, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { roleLabels, toOptions } from '../services/format.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Avatar from '../components/Avatar.jsx';
import UserForm from '../components/UserForm.jsx';
import SlideOver from '../components/SlideOver.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

const NO_DEPARTMENT = 'No department';

// Everyone grouped by department, departments in name order and unassigned people last.
function groupByDepartment(users) {
  const groups = new Map();
  for (const user of users) {
    const name = user.department?.name || NO_DEPARTMENT;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(user);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === NO_DEPARTMENT) - (b === NO_DEPARTMENT) || a.localeCompare(b));
}

function Person({ user, onEdit }) {
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-sunken sm:flex-nowrap sm:px-5 ${user.isActive ? '' : 'opacity-60'}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.jobTitle || 'No job title'}</p>
        </div>
      </div>
      <p className="w-full truncate pl-11 font-mono text-xs text-faint sm:w-56 sm:pl-0">{user.email}</p>
      <div className="flex items-center gap-2 pl-11 sm:w-48 sm:pl-0">
        <Badge value={user.role} />
        <Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </div>
      <Button variant="ghost" size="sm" icon={Pencil} onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`} className="ml-auto">
        Edit
      </Button>
    </li>
  );
}

// People: the directory as one line per department. Adding and editing happen in a side
// panel, so the list never jumps around.
export default function UsersPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ search: '', role: '' });
  const { data, loading, error, reload } = useApi('/users', filters);
  const { data: departmentData } = useApi('/departments');
  // null = closed, {} = new person, a user = editing them.
  const [editing, setEditing] = useState(null);

  const hasFilters = Boolean(filters.search || filters.role);

  function handleSaved(text) {
    setEditing(null);
    toast.show(text);
    reload();
  }

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.users.length === 0) {
      return <EmptyState icon={Users} title="No people found" message={hasFilters ? 'Try a different search or role.' : 'Add the first person to get started.'} />;
    }
    return (
      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {groupByDepartment(data.users).map(([department, people]) => {
          const active = people.filter((person) => person.isActive).length;
          const managers = people.filter((person) => person.role === 'MANAGER');
          return (
            <section key={department} aria-labelledby={`dept-${department}`}>
              <h2 id={`dept-${department}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-line-soft bg-sunken px-4 py-2.5 sm:px-5">
                <span className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                  <span className={`h-1 w-4 rounded-full ${department === NO_DEPARTMENT ? 'bg-faint' : 'bg-accent'}`} aria-hidden="true" />
                  {department}
                </span>
                <span className="font-mono text-[11px] text-faint">
                  {active} active{people.length > active ? ` · ${people.length - active} inactive` : ''}
                </span>
                {managers.length > 0 && <span className="text-xs text-muted">Managers: {managers.map((manager) => manager.name).join(', ')}</span>}
              </h2>
              <ul className="divide-y divide-line-soft">
                {people.map((person) => (
                  <Person key={person.id} user={person} onEdit={setEditing} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  const isNew = editing && !editing.id;

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="User management"
        description="Everyone in FlowOps by department. Add people, change roles and departments, or deactivate accounts."
        actions={
          <Button icon={UserPlus} onClick={() => setEditing({})}>
            Add user
          </Button>
        }
      />

      <div className="card overflow-clip">
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

      <SlideOver open={Boolean(editing)} onClose={() => setEditing(null)} eyebrow="People" title={isNew ? 'Add a new user' : `Edit ${editing?.name || ''}`}>
        {editing && (
          <UserForm
            key={editing.id || 'new'}
            user={isNew ? null : editing}
            departments={departmentData?.departments || []}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
            inPanel
          />
        )}
      </SlideOver>
    </>
  );
}

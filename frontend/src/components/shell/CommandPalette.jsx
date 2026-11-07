import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CornerDownLeft, FileText, ListChecks, Loader2, Plus, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDialog } from '../../hooks/useDialog.js';
import api from '../../services/api.js';
import Badge from '../Badge.jsx';
import { profileItem, visibleNavItems } from './navigation.js';

const SEARCH_DELAY_MS = 200;
const MAX_RESULTS = 5;

function staticCommands(role) {
  const pages = [...visibleNavItems(role), profileItem].map((item) => ({
    id: `page:${item.to}`,
    group: 'Go to',
    label: item.label,
    to: item.to,
    icon: item.icon,
    line: item.line,
  }));
  const actions = [{ id: 'new-request', group: 'Create', label: 'New request', to: '/requests/new', icon: Plus }];
  if (role === 'MANAGER' || role === 'ADMIN') {
    actions.push({ id: 'new-task', group: 'Create', label: 'New task', to: '/tasks/new', icon: Plus });
  }
  return [...actions, ...pages];
}

// Searches the same list endpoints the pages use, so results respect each role's access.
function useRecordSearch(query, role) {
  const [state, setState] = useState({ query: '', results: [], loading: false, error: false });
  const latest = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setState({ query: text, results: [], loading: false, error: false });
      return undefined;
    }
    const requestId = ++latest.current;
    setState((current) => ({ ...current, loading: true, error: false }));
    const timer = setTimeout(async () => {
      try {
        const requestScope = role === 'EMPLOYEE' ? undefined : 'team';
        const [tasks, requests] = await Promise.all([
          api.get('/tasks', { params: { search: text } }),
          api.get('/requests', { params: { search: text, scope: requestScope } }),
        ]);
        if (requestId !== latest.current) return;
        const results = [
          ...tasks.data.tasks.slice(0, MAX_RESULTS).map((task) => ({
            id: `task:${task.id}`,
            group: 'Tasks',
            label: task.title,
            to: `/tasks/${task.id}`,
            icon: ListChecks,
            status: task.status,
            meta: task.assignee?.name,
          })),
          ...requests.data.requests.slice(0, MAX_RESULTS).map((request) => ({
            id: `request:${request.id}`,
            group: 'Requests',
            label: request.title,
            to: `/requests/${request.id}`,
            icon: FileText,
            status: request.status,
            meta: request.requester?.name,
          })),
        ];
        setState({ query: text, results, loading: false, error: false });
      } catch {
        if (requestId === latest.current) setState({ query: text, results: [], loading: false, error: true });
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, role]);

  return state;
}

export default function CommandPalette({ open, onClose }) {
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useDialog(true, onClose, { initialFocusRef: inputRef });
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const search = useRecordSearch(query, user.role);

  const items = useMemo(() => {
    const text = query.trim().toLowerCase();
    const commands = staticCommands(user.role).filter((item) => !text || item.label.toLowerCase().includes(text));
    return [...commands, ...search.results];
  }, [query, search.results, user.role]);

  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  function choose(item) {
    onClose();
    navigate(item.to);
    // Start keyboard and screen reader users at the top of the page they chose.
    requestAnimationFrame(() => document.getElementById('main-content')?.focus());
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + items.length) % items.length);
    } else if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault();
      choose(items[activeIndex]);
    }
  }

  const groups = [];
  items.forEach((item, index) => {
    const group = groups.find((g) => g.name === item.group) || groups[groups.push({ name: item.group, items: [] }) - 1];
    group.items.push({ ...item, index });
  });
  const searching = query.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search or jump to"
        className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-line bg-raised shadow-overlay"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks and requests, or jump to a page"
            className="h-13 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={items[activeIndex] ? `command-${items[activeIndex].id}` : undefined}
            aria-autocomplete="list"
            aria-label="Search"
          />
          {search.loading && <Loader2 className="h-4 w-4 animate-spin text-faint" aria-label="Searching" />}
          <kbd className="rounded border border-line border-b-2 px-1.5 font-mono text-[10px] text-muted">Esc</kbd>
        </div>

        <div ref={listRef} id="command-results" role="listbox" aria-label="Results" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.name} role="group" aria-label={group.name} className="mb-1 last:mb-0">
              <p className="eyebrow px-2.5 pt-2 pb-1">{group.name}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.index === activeIndex;
                return (
                  <div
                    key={item.id}
                    id={`command-${item.id}`}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setActiveIndex(item.index)}
                    onClick={() => choose(item)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm ${active ? 'bg-accent-soft text-ink' : 'text-ink-2'}`}
                  >
                    {item.line ? (
                      <span className={`h-1 w-3 rounded-full ${item.line}`} aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.meta && <span className="hidden truncate text-xs text-faint sm:block">{item.meta}</span>}
                    {item.status && <Badge value={item.status} />}
                    {active && <CornerDownLeft className="h-3.5 w-3.5 text-accent" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          ))}
          {searching && !search.loading && !search.error && search.results.length === 0 && (
            <p className="px-2.5 py-3 text-sm text-muted">No tasks or requests match “{query.trim()}”.</p>
          )}
          {search.error && <p className="px-2.5 py-3 text-sm text-bad">Search isn’t available right now. Pages and actions still work.</p>}
          {!searching && <p className="px-2.5 pt-2 pb-1 text-xs text-faint">Type at least two letters to search tasks and requests you can open.</p>}
        </div>
      </div>
    </div>
  );
}

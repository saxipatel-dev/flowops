import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';
import { taskStatusLabels } from '../services/format.js';
import { useToast } from '../context/ToastContext.jsx';

// Moves tasks to another status straight away, saves in the background, and puts the
// task back (with the server's reason) if the save is refused. Fresh data from the
// server replaces the optimistic changes.
export function useTaskStatus(tasks, { onSaved } = {}) {
  const toast = useToast();
  const [overrides, setOverrides] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => setOverrides({}), [tasks]);

  const withChanges = useCallback(
    (list) => list.map((task) => (overrides[task.id] ? { ...task, status: overrides[task.id] } : task)),
    [overrides],
  );

  const move = useCallback(
    async (task, status) => {
      if (task.status === status) return false;
      setOverrides((current) => ({ ...current, [task.id]: status }));
      setSavingId(task.id);
      try {
        await api.patch(`/tasks/${task.id}`, { status });
        toast.show(`Moved “${task.title}” to ${taskStatusLabels[status]}.`);
        onSaved?.();
        return true;
      } catch (err) {
        setOverrides((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
        toast.show(getErrorMessage(err), { tone: 'error' });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [onSaved, toast],
  );

  return { withChanges, move, savingId };
}

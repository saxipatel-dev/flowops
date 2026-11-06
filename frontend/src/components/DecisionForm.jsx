import { useEffect, useState } from 'react';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Check, ClipboardCheck, X } from 'lucide-react';
import Button from './Button.jsx';
import Card, { CardHeader } from './Card.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { FormField, SelectInput } from './FormField.jsx';
import { ErrorMessage } from './Feedback.jsx';

const FOLLOW_UP_CATEGORIES = ['EQUIPMENT', 'PURCHASE'];

export default function DecisionForm({ request, onDecided }) {
  const { user } = useAuth();
  const needsFollowUp = FOLLOW_UP_CATEGORIES.includes(request.category);
  const [reason, setReason] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!needsFollowUp) return;
    api
      .get('/users/assignable')
      .then((response) => {
        // The manager is already the default ("Myself"), so leave them out of the list.
        const others = response.data.users.filter((person) => person.id !== user.id);
        setAssignees(others.map((person) => ({ value: String(person.id), label: person.name })));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [needsFollowUp, user.id]);

  function startDecision(decision) {
    setError('');
    setFieldErrors({});
    if (decision === 'reject' && reason.trim().length < 5) {
      setFieldErrors({ reason: 'Please give a reason for the rejection (at least 5 characters)' });
      return;
    }
    setPendingDecision(decision);
  }

  async function submitDecision() {
    setSaving(true);
    try {
      const payload = { decision: pendingDecision, reason };
      if (pendingDecision === 'approve' && needsFollowUp) {
        if (assigneeId) payload.assigneeId = Number(assigneeId);
        if (dueDate) payload.dueDate = dueDate;
      }
      await api.post(`/requests/${request.id}/decision`, payload);
      onDecided(pendingDecision === 'approve' ? 'Request approved.' : 'Request rejected.');
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
      setPendingDecision(null);
    }
  }

  return (
    <Card className="ring-2 ring-accent/25">
      <CardHeader title="Review this request" description="Your decision is shared with the requester." icon={ClipboardCheck} />
      <div className="space-y-4 p-4">
        <ErrorMessage message={error} />
        <FormField label="Comment or rejection reason" htmlFor="reason" error={fieldErrors.reason} hint="Required when rejecting.">
          <textarea id="reason" rows={3} className={`input ${fieldErrors.reason ? 'input-error' : ''}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} />
        </FormField>

        {needsFollowUp && (
          <div className="rounded-lg border border-line bg-sunken p-4">
            <p className="mb-3 text-sm text-muted">Approving creates a follow-up task to fulfil this request.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Assign task to" htmlFor="assigneeId">
                <SelectInput id="assigneeId" options={assignees} placeholder="Myself" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} />
              </FormField>
              <FormField label="Task due date" htmlFor="dueDate" hint="Defaults to one week from today." error={fieldErrors.dueDate}>
                <input id="dueDate" type="date" className="input" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </FormField>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="success" icon={Check} onClick={() => startDecision('approve')}>
            Approve
          </Button>
          <Button variant="dangerOutline" icon={X} onClick={() => startDecision('reject')}>
            Reject
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDecision !== null}
        title={pendingDecision === 'approve' ? 'Approve this request?' : 'Reject this request?'}
        message={
          pendingDecision === 'approve'
            ? `The requester will be notified${needsFollowUp ? ' and a follow-up task will be created' : ''}. This cannot be undone.`
            : 'The requester will be notified with your reason. This cannot be undone.'
        }
        confirmLabel={pendingDecision === 'approve' ? 'Approve' : 'Reject'}
        variant={pendingDecision === 'approve' ? 'success' : 'danger'}
        loading={saving}
        onConfirm={submitDecision}
        onCancel={() => setPendingDecision(null)}
      />
    </Card>
  );
}

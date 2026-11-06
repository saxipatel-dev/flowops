import { formatDateTime, formatTimeAgo, taskStatusLabels } from './format.js';

// The stages a request travels through, built only from recorded fields.
// Used by the request lines on Mission Control (and later by FlowMap).
//
// Stage states: done | current | pending | rejected | skipped
// "skipped" means the stage does not apply to this request (for example, a rejected
// request never gets a follow-up task).

export function buildJourney(request) {
  const decided = request.status !== 'PENDING';
  const rejected = request.status === 'REJECTED';
  const task = request.task;
  const taskDone = task?.status === 'COMPLETED';

  const stages = [
    { key: 'submitted', label: 'Submitted', state: 'done', at: request.createdAt, actor: request.requester?.name },
    {
      key: 'review',
      label: 'With reviewer',
      state: decided ? 'done' : 'current',
      actor: request.reviewer?.name,
    },
    {
      key: 'decision',
      label: rejected ? 'Rejected' : decided ? 'Approved' : 'Decision',
      state: rejected ? 'rejected' : decided ? 'done' : 'pending',
      at: request.reviewedAt,
      actor: request.decidedBy?.name,
      note: request.reviewComment,
    },
  ];

  if (rejected) {
    stages.push({ key: 'follow-up', label: 'Follow-up task', state: 'skipped' }, { key: 'complete', label: 'Completed', state: 'skipped' });
  } else if (!decided) {
    stages.push({ key: 'follow-up', label: 'Follow-up task', state: 'pending' }, { key: 'complete', label: 'Completed', state: 'pending' });
  } else if (task) {
    stages.push(
      { key: 'follow-up', label: 'Follow-up task', state: taskDone ? 'done' : 'current', actor: task.assignee?.name, task },
      { key: 'complete', label: 'Completed', state: taskDone ? 'done' : 'pending', at: task.completedAt },
    );
  } else {
    // Approved without a follow-up task: the request is finished at the decision.
    stages.push({ key: 'follow-up', label: 'Follow-up task', state: 'skipped' }, { key: 'complete', label: 'Completed', state: 'done', at: request.reviewedAt });
  }
  return stages;
}

// One short sentence describing where the request is now.
export function journeySummary(request, viewerId) {
  if (request.status === 'PENDING') {
    return request.reviewer?.id === viewerId ? 'With you' : `With ${request.reviewer?.name || 'the reviewer'}`;
  }
  if (request.status === 'REJECTED') return `Rejected by ${request.decidedBy?.name || 'the reviewer'}`;
  if (!request.task) return 'Approved, no follow-up task';
  if (request.task.status === 'COMPLETED') return `Completed by ${request.task.assignee?.name || 'the assignee'}`;
  return `Follow-up with ${request.task.assignee?.name || 'the assignee'}`;
}

// One line describing a stage, from recorded fields only. Shown when a stop on a
// request line is hovered, focused or tapped.
export function describeStage(stage, request, viewerId) {
  const when = stage.at ? formatDateTime(stage.at) : null;
  switch (stage.key) {
    case 'submitted':
      return `Submitted by ${stage.actor || 'the requester'} · ${when}`;
    case 'review':
      return stage.state === 'current'
        ? `With ${request.reviewer?.id === viewerId ? 'you' : stage.actor || 'the reviewer'} · waiting ${formatTimeAgo(request.createdAt).replace(' ago', '')}`
        : `Reviewed by ${request.decidedBy?.name || stage.actor || 'the reviewer'}`;
    case 'decision':
      if (stage.state === 'pending') return 'No decision yet';
      return `${stage.label} by ${stage.actor || 'the reviewer'} · ${when}${stage.note ? ` · “${stage.note}”` : ''}`;
    case 'follow-up':
      if (stage.state === 'skipped') return request.status === 'REJECTED' ? 'No follow-up task: the request was rejected' : 'No follow-up task for this request';
      if (stage.state === 'pending') return 'Not created yet';
      return `${stage.task.title} · ${stage.actor || 'unassigned'} · ${taskStatusLabels[stage.task.status]}`;
    case 'complete':
      if (stage.state === 'skipped') return 'Ended at the decision';
      if (stage.state === 'pending') return 'Not completed yet';
      if (!request.task) return `Finished when approved · ${when}`;
      return when ? `Completed · ${when}` : 'Completed · time not recorded';
    default:
      return stage.label;
  }
}

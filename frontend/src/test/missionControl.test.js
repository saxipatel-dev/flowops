import { describe, it, expect } from 'vitest';
import {
  buildFocusItems,
  buildLines,
  heatLevel,
  stationState,
  toSegments,
  weekPosition,
  weekStartKey,
} from '../services/missionControl.js';
import { buildJourney, describeStage, journeySummary } from '../services/requestJourney.js';

const now = new Date(2026, 10, 10, 10, 0); // Tuesday 10 Nov, local clock
const person = (id, name) => ({ id, name, email: `${id}@x.test` });
const task = (id, fields) => ({ id, title: `Task ${id}`, status: 'TODO', priority: 'MEDIUM', assignedTo: 1, assignee: person(1, 'Maya Chen'), ...fields });

describe('week helpers', () => {
  it('starts weeks on Monday', () => {
    expect(weekStartKey('2026-11-10')).toBe('2026-11-09');
    expect(weekStartKey('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(weekStartKey('2026-11-09')).toBe('2026-11-09');
  });

  it('places weekdays wider than weekends and stays within 0–1', () => {
    expect(weekPosition(0, 0)).toBe(0);
    expect(weekPosition(6, 1)).toBeCloseTo(1);
    const weekday = weekPosition(1, 0) - weekPosition(0, 0);
    const weekend = weekPosition(6, 0) - weekPosition(5, 0);
    expect(weekday).toBeCloseTo(weekend * 2);
  });

  it('reads a task as late, in progress, done or to do', () => {
    expect(stationState(task(1, { dueDate: '2026-11-09T00:00:00.000Z' }), '2026-11-10')).toBe('late');
    expect(stationState(task(1, { dueDate: '2026-11-09T00:00:00.000Z', status: 'COMPLETED' }), '2026-11-10')).toBe('done');
    expect(stationState(task(1, { dueDate: '2026-11-12T00:00:00.000Z', status: 'IN_PROGRESS' }), '2026-11-10')).toBe('progress');
    expect(stationState(task(1, { dueDate: '2026-11-10T00:00:00.000Z' }), '2026-11-10')).toBe('todo');
  });
});

describe('buildLines', () => {
  it('makes one line per person, puts the user first, and stacks same-day stops', () => {
    const tasks = [
      task(1, { dueDate: '2026-11-11T00:00:00.000Z', assignedTo: 2, assignee: person(2, 'Sam Okafor') }),
      task(2, { dueDate: '2026-11-11T00:00:00.000Z', assignedTo: 2, assignee: person(2, 'Sam Okafor') }),
      task(3, { dueDate: '2026-11-12T00:00:00.000Z', assignedTo: 2, assignee: person(2, 'Sam Okafor') }),
      task(4, { dueDate: '2026-11-13T00:00:00.000Z', assignedTo: 1 }),
      task(5, { dueDate: '2026-11-30T00:00:00.000Z', assignedTo: 1 }), // outside the week
    ];
    const { lines } = buildLines(tasks, { startKey: '2026-11-09', today: '2026-11-10', userId: 1 });
    expect(lines.map((line) => line.user.name)).toEqual(['Maya Chen', 'Sam Okafor']);
    expect(lines[0].isMe).toBe(true);
    expect(lines[0].stops).toHaveLength(1);
    const sam = lines[1];
    expect(sam.depth).toBe(2);
    expect(sam.stops.map((stop) => [stop.task.id, stop.dayIndex, stop.stack])).toEqual([
      [1, 2, 0],
      [2, 2, 1],
      [3, 3, 0],
    ]);
  });

  it('stacks a weekday stop next to a weekend stop so their labels do not overlap', () => {
    const tasks = [
      task(1, { dueDate: '2026-11-13T00:00:00.000Z' }), // Friday
      task(2, { dueDate: '2026-11-14T00:00:00.000Z' }), // Saturday
      task(3, { dueDate: '2026-11-15T00:00:00.000Z' }), // Sunday
      task(4, { dueDate: '2026-11-11T00:00:00.000Z' }), // Wednesday: far enough from Friday
    ];
    const [line] = buildLines(tasks, { startKey: '2026-11-09', today: '2026-11-10', userId: 1 }).lines;
    expect(line.stops.map((stop) => [stop.task.id, stop.stack])).toEqual([
      [4, 0],
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
    expect(line.depth).toBe(3);
  });

  it('shows at most seven people and counts the rest', () => {
    const tasks = Array.from({ length: 9 }, (_, index) =>
      task(index + 1, { dueDate: '2026-11-11T00:00:00.000Z', assignedTo: index + 10, assignee: person(index + 10, `Person ${index}`) }),
    );
    const result = buildLines(tasks, { startKey: '2026-11-09', today: '2026-11-10', userId: 1 });
    expect(result.lines).toHaveLength(7);
    expect(result.hiddenPeople).toBe(2);
  });
});

describe('buildFocusItems', () => {
  it('orders late work, then decisions, then today, then soon, then recent decisions', () => {
    const summary = {
      focusTasks: [
        task(1, { dueDate: '2026-11-12T00:00:00.000Z' }),
        task(2, { dueDate: '2026-11-10T00:00:00.000Z' }),
        task(3, { dueDate: '2026-11-07T00:00:00.000Z' }),
        task(4, { dueDate: '2026-11-09T00:00:00.000Z', assignedTo: 2, assignee: person(2, 'Sam Okafor') }),
      ],
      approvalQueue: [{ id: 7, title: 'Projector', createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString(), requester: person(3, 'Jordan Lee'), estimatedCost: '480.00' }],
      requestLines: [
        { id: 8, title: 'Headset', requestedBy: 1, status: 'APPROVED', reviewedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(), decidedBy: person(4, 'Daniel') },
        { id: 9, title: 'Old', requestedBy: 1, status: 'REJECTED', reviewedAt: '2026-10-01T14:00:00Z', decidedBy: person(4, 'Daniel') },
        { id: 10, title: 'Not mine', requestedBy: 5, status: 'APPROVED', reviewedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString() },
      ],
    };
    const items = buildFocusItems(summary, { userId: 1, now });
    expect(items.map((item) => item.id)).toEqual(['task-3', 'task-4', 'approval-7', 'task-2', 'task-1', 'decided-8']);
    expect(items[0].stub).toEqual({ value: '3d', label: 'late' });
    expect(items[1].detail).toBe('Sam Okafor');
    expect(items[2].stub).toEqual({ value: '2d', label: 'waiting' });
    expect(items[2].cost).toBe('480.00');
  });

  it('returns nothing when nothing needs attention', () => {
    expect(buildFocusItems({ focusTasks: [], approvalQueue: [], requestLines: [] }, { userId: 1, now })).toEqual([]);
  });
});

describe('meters and heat levels', () => {
  it('splits counts into shares', () => {
    const { total, segments } = toSegments({ TODO: 1, IN_PROGRESS: 1, COMPLETED: 2 }, ['TODO', 'IN_PROGRESS', 'COMPLETED']);
    expect(total).toBe(4);
    expect(segments.map((segment) => segment.share)).toEqual([0.25, 0.25, 0.5]);
    expect(toSegments({}, ['TODO']).segments[0].share).toBe(0);
  });

  it('scales heat from 0 to 4 against the busiest day', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(10, 10)).toBe(4);
    expect(heatLevel(3, 0)).toBe(0);
  });
});

describe('buildJourney', () => {
  const base = { createdAt: '2026-11-02T09:40:00Z', requester: person(1, 'Jordan Lee'), reviewer: person(2, 'Priya Nair') };
  const states = (request) => buildJourney(request).map((stage) => stage.state);

  it('shows a pending request waiting on its reviewer', () => {
    const request = { ...base, status: 'PENDING', task: null };
    expect(states(request)).toEqual(['done', 'current', 'pending', 'pending', 'pending']);
    expect(journeySummary(request)).toBe('With Priya Nair');
    expect(journeySummary(request, 2)).toBe('With you');
  });

  it('ends a rejected request at the decision', () => {
    const request = { ...base, status: 'REJECTED', reviewedAt: '2026-11-03T10:00:00Z', decidedBy: person(2, 'Priya Nair'), reviewComment: 'No budget', task: null };
    const journey = buildJourney(request);
    expect(journey.map((stage) => stage.state)).toEqual(['done', 'done', 'rejected', 'skipped', 'skipped']);
    expect(journey[2].note).toBe('No budget');
  });

  it('follows an approved request through its follow-up task', () => {
    const open = { ...base, status: 'APPROVED', reviewedAt: '2026-11-03T10:00:00Z', task: { id: 4, status: 'IN_PROGRESS', completedAt: null, assignee: person(1, 'Jordan Lee') } };
    expect(states(open)).toEqual(['done', 'done', 'done', 'current', 'pending']);
    const done = { ...open, task: { ...open.task, status: 'COMPLETED', completedAt: '2026-11-05T15:00:00Z' } };
    expect(states(done)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(buildJourney(done)[4].at).toBe('2026-11-05T15:00:00Z');
  });

  it('keeps an unknown completion time empty instead of guessing', () => {
    const request = { ...base, status: 'APPROVED', reviewedAt: '2026-11-03T10:00:00Z', task: { id: 4, status: 'COMPLETED', completedAt: null } };
    expect(buildJourney(request)[4].at).toBeNull();
  });

  it('finishes an approved request with no follow-up task at the decision', () => {
    const request = { ...base, status: 'APPROVED', reviewedAt: '2026-11-03T10:00:00Z', task: null };
    expect(states(request)).toEqual(['done', 'done', 'done', 'skipped', 'done']);
    expect(journeySummary(request)).toBe('Approved, no follow-up task');
  });

  it('describes each stage from recorded data only', () => {
    const request = {
      ...base,
      status: 'APPROVED',
      reviewedAt: '2026-11-03T10:00:00Z',
      decidedBy: person(2, 'Priya Nair'),
      reviewComment: 'Use the standard model',
      task: { id: 4, title: 'Fulfil request: Headset', status: 'COMPLETED', completedAt: null, assignee: person(1, 'Jordan Lee') },
    };
    const text = buildJourney(request).map((stage) => describeStage(stage, request));
    expect(text[0]).toMatch(/^Submitted by Jordan Lee · /);
    expect(text[1]).toBe('Reviewed by Priya Nair');
    expect(text[2]).toMatch(/^Approved by Priya Nair · .* · “Use the standard model”$/);
    expect(text[3]).toBe('Fulfil request: Headset · Jordan Lee · Completed');
    expect(text[4]).toBe('Completed · time not recorded');

    const rejected = { ...base, status: 'REJECTED', reviewedAt: '2026-11-03T10:00:00Z', decidedBy: person(2, 'Priya Nair'), task: null };
    const rejectedText = buildJourney(rejected).map((stage) => describeStage(stage, rejected));
    expect(rejectedText[3]).toBe('No follow-up task: the request was rejected');
    expect(rejectedText[4]).toBe('Ended at the decision');
  });
});

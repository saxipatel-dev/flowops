import { describe, it, expect } from 'vitest';
import { dueCue, groupByStatus, placeOnTimeline, shiftRange, timeUsed, timelineRange } from '../services/taskAtlas.js';

const task = (id, fields) => ({ id, title: `Task ${id}`, status: 'TODO', priority: 'MEDIUM', createdAt: '2026-11-02T10:00:00.000Z', ...fields });

describe('board helpers', () => {
  it('groups tasks into the three columns, keeping empty ones', () => {
    const columns = groupByStatus([task(1, {}), task(2, { status: 'COMPLETED' })]);
    expect(Object.keys(columns)).toEqual(['TODO', 'IN_PROGRESS', 'COMPLETED']);
    expect(columns.TODO.map((t) => t.id)).toEqual([1]);
    expect(columns.IN_PROGRESS).toEqual([]);
  });

  it('gives each card a short due-date cue', () => {
    const today = '2026-11-10';
    expect(dueCue(task(1, { dueDate: '2026-11-07T00:00:00.000Z' }), today)).toEqual({ text: '3d late', tone: 'bad' });
    expect(dueCue(task(1, { dueDate: '2026-11-10T00:00:00.000Z' }), today)).toEqual({ text: 'Today', tone: 'warn' });
    expect(dueCue(task(1, { dueDate: '2026-11-11T00:00:00.000Z' }), today)).toEqual({ text: 'Tomorrow', tone: 'warn' });
    expect(dueCue(task(1, { dueDate: '2026-11-07T00:00:00.000Z', status: 'COMPLETED' }), today)).toEqual({ text: 'Done', tone: 'ok' });
    expect(dueCue(task(1, { dueDate: null }), today).text).toBe('No due date');
  });

  it('measures how much of the time to the due date has gone', () => {
    const t = task(1, { createdAt: new Date(2026, 10, 2, 9).toISOString(), dueDate: '2026-11-11T00:00:00.000Z' });
    expect(timeUsed(t, new Date(2026, 10, 2, 0, 0))).toBe(0);
    expect(timeUsed(t, new Date(2026, 10, 7, 0, 0))).toBeCloseTo(0.5, 1);
    expect(timeUsed(t, new Date(2026, 10, 20))).toBe(1);
    expect(timeUsed({ ...t, status: 'COMPLETED' })).toBeNull();
    expect(timeUsed({ ...t, dueDate: null })).toBeNull();
  });
});

describe('timeline helpers', () => {
  it('starts ranges on Monday and moves by a week or four weeks', () => {
    expect(timelineRange('2026-11-12', 'week')).toMatchObject({ start: '2026-11-09', length: 7 });
    expect(timelineRange('2026-11-12', 'month').days).toHaveLength(28);
    expect(shiftRange('2026-11-12', 'week', 1)).toBe('2026-11-16');
    expect(shiftRange('2026-11-12', 'month', -1)).toBe('2026-10-12');
  });

  it('places tasks as bars, pins open late work, and counts undated tasks', () => {
    const range = timelineRange('2026-11-10', 'week'); // 9–15 Nov
    const placed = placeOnTimeline(
      [
        task(1, { createdAt: new Date(2026, 10, 10, 9).toISOString(), dueDate: '2026-11-12T00:00:00.000Z' }),
        task(2, { createdAt: new Date(2026, 9, 20, 9).toISOString(), dueDate: '2026-11-09T00:00:00.000Z' }),
        task(3, { dueDate: '2026-11-03T00:00:00.000Z' }), // open, due before the range: late lane
        task(4, { dueDate: '2026-11-03T00:00:00.000Z', status: 'COMPLETED' }), // done before the range: hidden
        task(5, { dueDate: null }),
        task(6, { dueDate: '2026-11-30T00:00:00.000Z' }), // after the range
      ],
      range,
      '2026-11-10',
    );
    expect(placed.late.map((t) => t.id)).toEqual([3]);
    expect(placed.undated).toBe(1);
    expect(placed.rows.map((row) => [row.task.id, row.from, row.to, row.startsBefore, row.late])).toEqual([
      [2, 0, 0, true, true],
      [1, 1, 3, false, false],
    ]);
  });
});

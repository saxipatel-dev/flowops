import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDueLabel, formatTimeAgo, groupByDay, isOverdue, requestCode } from '../services/format.js';
import { validateRequest } from '../pages/NewRequestPage.jsx';
import { validateLogin } from '../pages/LoginPage.jsx';

describe('format helpers', () => {
  it('formats request codes and amounts', () => {
    expect(requestCode(42)).toBe('REQ-0042');
    expect(formatCurrency('1200')).toBe('$1,200.00');
    expect(formatCurrency(null)).toBe('—');
  });

  it('formats due dates without shifting the day', () => {
    expect(formatDate('2026-03-01T00:00:00.000Z')).toBe('Mar 1, 2026');
    expect(formatDate(null)).toBe('—');
  });

  it('marks unfinished tasks with a past due date as overdue', () => {
    expect(isOverdue({ dueDate: '2020-01-01T00:00:00.000Z', status: 'TODO' })).toBe(true);
    expect(isOverdue({ dueDate: '2020-01-01T00:00:00.000Z', status: 'COMPLETED' })).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'TODO' })).toBe(false);
  });

  it('describes due dates relative to today', () => {
    const now = new Date('2026-11-05T15:00:00.000Z');
    expect(formatDueLabel('2026-11-03T00:00:00.000Z', now)).toBe('Overdue by 2 days');
    expect(formatDueLabel('2026-11-05T00:00:00.000Z', now)).toBe('Due today');
    expect(formatDueLabel('2026-11-06T00:00:00.000Z', now)).toBe('Due tomorrow');
    expect(formatDueLabel('2026-11-12T00:00:00.000Z', now)).toBe('Due in 7 days');
  });

  it('groups newest-first items by day', () => {
    const now = new Date(2026, 10, 5, 15, 0);
    const items = [
      { id: 1, createdAt: new Date(2026, 10, 5, 9, 0).toISOString() },
      { id: 2, createdAt: new Date(2026, 10, 5, 8, 0).toISOString() },
      { id: 3, createdAt: new Date(2026, 10, 4, 17, 0).toISOString() },
      { id: 4, createdAt: new Date(2026, 10, 2, 12, 0).toISOString() },
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Today', [1, 2]],
      ['Yesterday', [3]],
      ['Monday, Nov 2', [4]],
    ]);
  });

  it('describes how long ago something happened', () => {
    const now = new Date('2026-11-05T15:00:00.000Z');
    expect(formatTimeAgo('2026-11-05T14:59:40.000Z', now)).toBe('Just now');
    expect(formatTimeAgo('2026-11-05T14:35:00.000Z', now)).toBe('25m ago');
    expect(formatTimeAgo('2026-11-05T12:00:00.000Z', now)).toBe('3h ago');
    expect(formatTimeAgo('2026-11-04T12:00:00.000Z', now)).toBe('Yesterday');
    expect(formatTimeAgo('2026-11-01T12:00:00.000Z', now)).toBe('4 days ago');
  });
});

describe('form validation', () => {
  it('requires login fields and a valid email', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    });
    expect(validateLogin({ email: 'maya', password: 'x' }).email).toBe('Enter a valid email address');
    expect(validateLogin({ email: 'maya@flowops.test', password: 'x' })).toEqual({});
  });

  it('validates new request fields', () => {
    const valid = { category: 'EQUIPMENT', title: 'New mouse', description: 'My mouse stopped working.', estimatedCost: '' };
    expect(validateRequest(valid)).toEqual({});
    expect(validateRequest({ ...valid, title: '' }).title).toBeDefined();
    expect(validateRequest({ ...valid, estimatedCost: '-5' }).estimatedCost).toBeDefined();
    expect(validateRequest({ ...valid, category: '' }).category).toBe('Choose a category');
  });
});

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, isOverdue, requestCode } from '../services/format.js';
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

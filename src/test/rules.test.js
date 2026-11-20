import { describe, expect, test } from 'vitest';
import { rules, validateAll } from '../validation/rules';
import { validateWeek, weekToApi, weekFromApi, emptyWeek } from '../features/vendors/OpeningHours';

describe('validation rules (mirror the server)', () => {
  test('password needs 8+ chars with a letter and a number', () => {
    expect(rules.newPassword('short1')).toMatch(/at least 8/);
    expect(rules.newPassword('abcdefgh')).toMatch(/letter and one number/);
    expect(rules.newPassword('abcdefg1')).toBe('');
  });

  test('name, email and required fields give plain-language messages', () => {
    expect(rules.name('A')).toBe('Name must be at least 2 characters');
    expect(rules.email('nope')).toMatch(/valid email/);
    expect(rules.email('a@b.ca')).toBe('');
    expect(rules.storeName('')).toBe('Store name is required');
    expect(rules.reason('ab')).toMatch(/at least 3/);
  });

  test('validateAll returns only failing fields', () => {
    expect(validateAll({ name: rules.name, email: rules.email }, { name: 'Sam', email: 'x' })).toEqual({ email: expect.any(String) });
  });
});

describe('opening hours helpers', () => {
  test('validateWeek flags half-filled and reversed days', () => {
    const w = emptyWeek();
    expect(validateWeek(w)).toBe('');
    w.monday = { closed: false, opens: '08:00', closes: '' };
    expect(validateWeek(w)).toMatch(/Monday: enter both/);
    w.monday = { closed: false, opens: '18:00', closes: '09:00' };
    expect(validateWeek(w)).toMatch(/closing time must be after/);
  });

  test('round trip to and from the API shape', () => {
    const week = weekFromApi([{ day: 'monday', opens: '08:00', closes: '16:00' }, { day: 'sunday', closed: true }]);
    expect(weekToApi(week)).toEqual([
      { day: 'monday', closed: false, opens: '08:00', closes: '16:00' },
      { day: 'sunday', closed: true },
    ]);
  });
});

import { describe, it, expect } from 'vitest';
import { cn, formatDuration, formatDate, formatDateTime, truncate } from './utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('formatDuration', () => {
  it('should format seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('should pad seconds with zeros', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should handle large durations', () => {
    expect(formatDuration(36000)).toBe('10:00:00');
  });
});

describe('formatDate', () => {
  it('should format a timestamp to date string', () => {
    // Use a timestamp that's clearly in 2024 regardless of timezone
    // Jan 15, 2024 12:00:00 UTC
    const timestamp = 1705320000;
    const result = formatDate(timestamp);
    // Check that result contains a year
    expect(result).toMatch(/\d{4}/);
  });

  it('should include month, day, and year', () => {
    const timestamp = 1705320000;
    const result = formatDate(timestamp);
    // Should have format like "Jan 15, 2024"
    expect(result).toMatch(/\w+ \d+, \d{4}/);
  });
});

describe('formatDateTime', () => {
  it('should include time in the output', () => {
    const timestamp = 1705320000;
    const result = formatDateTime(timestamp);
    // formatDateTime should be longer than formatDate (includes time)
    expect(result.length).toBeGreaterThan(formatDate(timestamp).length);
    // Should include AM/PM or time format
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('truncate', () => {
  it('should not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long strings with ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('should handle exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should handle empty strings', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('should handle length of 0', () => {
    expect(truncate('hello', 0)).toBe('...');
  });
});

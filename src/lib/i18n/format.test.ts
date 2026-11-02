import { describe, expect, it } from 'vitest';

// This project has no @types/node; vitest runs these files under Node.
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'UTC';
import { formatDate, formatNumber, formatTime } from './format';

// 2024-01-01T13:05:00Z, the instant used by every assertion below.
const NEW_YEAR_AFTERNOON = Date.UTC(2024, 0, 1, 13, 5);

describe('clock times', () => {
	it('reads the clock the way each language writes it', () => {
		expect(formatTime(NEW_YEAR_AFTERNOON, 'fr')).toBe('13:05');
		expect(formatTime(NEW_YEAR_AFTERNOON, 'en')).toBe('01:05 PM');
	});

	it('stays on the same instant regardless of the machine timezone', () => {
		// The test file pins TZ=UTC, so the value below is UTC midnight.
		expect(formatTime(Date.UTC(2024, 0, 1, 0, 0), 'fr')).toBe('00:00');
	});
});

describe('dates', () => {
	it('writes the date with the month name of the locale', () => {
		expect(formatDate(NEW_YEAR_AFTERNOON, 'fr')).toBe('1 janvier 2024');
		expect(formatDate(NEW_YEAR_AFTERNOON, 'en')).toBe('January 1, 2024');
	});
});

describe('numbers', () => {
	it('groups and separates according to the locale', () => {
		expect(formatNumber(1234567.89, 'en')).toBe('1,234,567.89');
		expect(formatNumber(1234567.89, 'fr')).toBe('1\u202f234\u202f567,89');
	});

	it('keeps a fixed number of fraction digits when asked', () => {
		expect(formatNumber(-30.8, 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('-30.8');
		expect(formatNumber(-30.8, 'fr', { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('-30,8');
	});

	it('shows a number below a thousand without grouping', () => {
		expect(formatNumber(42, 'en')).toBe('42');
		expect(formatNumber(42.5, 'fr')).toBe('42,5');
	});
});

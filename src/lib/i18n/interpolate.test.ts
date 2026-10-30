import { describe, expect, it } from 'vitest';

// This project has no @types/node; vitest runs these files under Node.
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'UTC';
import { interpolate } from './interpolate';
import { translate } from './translate';

describe('interpolation', () => {
	it('fills a text placeholder', () => {
		expect(interpolate('Good night, {name}.', { name: 'Ada' }, 'en')).toBe('Good night, Ada.');
	});

	it('formats a number placeholder for the locale', () => {
		expect(interpolate('{count} days', { count: 1234.5 }, 'fr')).toBe('1\u202f234,5 days');
	});

	it('formats a date placeholder for the locale', () => {
		const instant = new Date(Date.UTC(2024, 0, 1, 13, 5));

		expect(interpolate('{when}', { when: instant }, 'fr')).toBe('1 janvier 2024');
	});

	it('fills several placeholders and repeats one when used twice', () => {
		expect(interpolate('{a} and {b}, {a}', { a: 'day', b: 'night' }, 'en')).toBe(
			'day and night, day'
		);
	});

	it('leaves an unknown placeholder visible instead of swallowing it', () => {
		expect(interpolate('Hello {unknown}', {}, 'en')).toBe('Hello {unknown}');
	});

	it('leaves a message without placeholders alone', () => {
		expect(interpolate('Equator', {}, 'en')).toBe('Equator');
	});
});

describe('translation', () => {
	it('resolves a key in the requested locale', () => {
		expect(translate('en', 'term.sandbox')).toBe('Sandbox');
		expect(translate('fr', 'term.sandbox')).toBe('Bac à sable');
	});

	it('interpolates parameters in the requested locale', () => {
		expect(translate('en', 'language.switch.action', { language: 'Français' })).toBe(
			'Change language: Français'
		);
		expect(translate('fr', 'language.switch.action', { language: 'English' })).toBe(
			'Changer de langue : English'
		);
	});
});

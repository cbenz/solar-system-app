import { describe, expect, it } from 'vitest';
import { resolveLocale } from './detect';
import { DEFAULT_LOCALE, LOCALES } from './locale';

describe('device language detection', () => {
	it('opens in French on a French device', () => {
		const frenchDevices = ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'FR'];

		for (const tag of frenchDevices) {
			expect(resolveLocale(tag), tag).toBe('fr');
		}
	});

	it('opens in English on any other device', () => {
		const otherDevices = ['en', 'en-GB', 'en-US', 'de-DE', 'es-ES', 'it', 'zh-Hans-CN', 'ar-EG'];

		for (const tag of otherDevices) {
			expect(resolveLocale(tag), tag).toBe('en');
		}
	});

	it('opens in English when the device reports no language', () => {
		expect(resolveLocale(undefined)).toBe('en');
		expect(resolveLocale(null)).toBe('en');
		expect(resolveLocale('')).toBe('en');
	});

	it('lets the device language pick the locale a French child reads first', () => {
		expect(resolveLocale('fr-FR')).toBe('fr');
		expect(resolveLocale('en-US')).toBe('en');
	});
});

describe('the locale type', () => {
	it('offers exactly the two languages the app speaks', () => {
		expect([...LOCALES].sort()).toEqual(['en', 'fr']);
	});

	it('falls back to English', () => {
		expect(DEFAULT_LOCALE).toBe('en');
	});
});

/**
 * PLACEHOLDER — ticket 02 (Language) owns this file.
 *
 * Ticket 03 needed `Locale` (and a way to detect the device language) before
 * ticket 02 landed. This is the smallest shape that keeps the session module
 * typed and the build green; ticket 02 replaces it with its catalogue layer and
 * the merger keeps whichever version wins, adjusting imports only.
 */

export type Locale = 'en' | 'fr';

export const LOCALES: readonly Locale[] = ['en', 'fr'];

export const FALLBACK_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'fr';
}

/** Device language, English as the fallback (ADR-0006 / ticket 02). */
export function detectLocale(languages?: readonly string[]): Locale {
	const candidates = languages ?? (typeof navigator === 'undefined' ? [] : navigator.languages);
	for (const tag of candidates) {
		const base = tag.toLowerCase().split('-')[0];
		if (isLocale(base)) return base;
	}
	return FALLBACK_LOCALE;
}

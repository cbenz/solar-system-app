/**
 * The locales the app speaks. Dependency-free on purpose: the session module
 * imports `Locale` from here, so this file must stay free of runs, DOM access
 * and catalogue imports.
 */
export type Locale = 'fr' | 'en';

export const LOCALES: readonly Locale[] = ['fr', 'en'];

/** English is the fallback when the device language is neither French nor English. */
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
	return value === 'en' || value === 'fr';
}

/**
 * The BCP 47 tag each locale is spoken in. One place owns the mapping, so the
 * speech adapter never builds a tag by string concatenation.
 */
export const SPEECH_LOCALE_TAG: Record<Locale, string> = {
	en: 'en-US',
	fr: 'fr-FR'
};

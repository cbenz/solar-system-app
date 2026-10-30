import { DEFAULT_LOCALE, type Locale } from './locale';
import { resolveLocale } from './detect';
import { translate } from './translate';
import type { MessageKey } from './messages';
import type { MessageParams } from './interpolate';

/**
 * The active locale is a Svelte 5 rune so a switch re-renders the screen
 * already displayed, with no reload. Ticket 03's session module takes over
 * ownership of the locale later; until then this module is the single owner.
 */
let active = $state<Locale>(DEFAULT_LOCALE);
let initialised = false;

/** Picks the device language once, at first load. */
export function initLocale(language?: string): void {
	if (initialised) return;
	initialised = true;

	const deviceLanguage =
		language ?? (typeof navigator === 'undefined' ? undefined : navigator.language);

	active = resolveLocale(deviceLanguage);
}

export function getLocale(): Locale {
	return active;
}

export function setLocale(locale: Locale): void {
	active = locale;
}

export function toggleLocale(): void {
	active = active === 'fr' ? 'en' : 'fr';
}

/** Resolves a message key in the active locale. */
export function t(key: MessageKey, params?: MessageParams): string {
	return translate(active, key, params);
}

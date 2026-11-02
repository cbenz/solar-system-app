/**
 * `set-locale`: switch the interface language.
 *
 * The session owns the locale — the catalogue and the formatters take it as an
 * argument and never hold their own copy — so switching is one state field and
 * every renderer that reads it repaints. A locale the app cannot speak is
 * refused rather than half-applied.
 */

import { isLocale } from '$lib/i18n/locale';
import type { SessionEvent, SessionState } from '../types';

export function handleSetLocale(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'set-locale') return null;

	if (!isLocale(event.locale) || event.locale === state.locale) return state;

	return { ...state, locale: event.locale };
}

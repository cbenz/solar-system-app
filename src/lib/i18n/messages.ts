/**
 * PLACEHOLDER — ticket 02 (Language) owns the message catalogues.
 *
 * Ticket 03 needed a handful of keys (the timeline's span words, its play and
 * pause labels) and the no-literal rule (ADR-0006) does not wait for ticket 02.
 * The entries below are the English and French text of exactly those keys, both
 * locales complete so the "no blank line in front of a child" rule holds.
 * Ticket 02 replaces this module wholesale; every consumer imports `t` and
 * `MessageKey`, so the merge only has to keep those two names.
 */

import { FALLBACK_LOCALE, type Locale } from './locale';

export type MessageKey =
	| 'time.timeline'
	| 'time.play'
	| 'time.pause'
	| 'time.span.dayAndHalf'
	| 'time.span.week'
	| 'time.span.month'
	| 'time.span.year';

const en: Record<MessageKey, string> = {
	'time.timeline': 'Timeline',
	'time.play': 'Play',
	'time.pause': 'Pause',
	'time.span.dayAndHalf': 'a day and a half',
	'time.span.week': 'a week',
	'time.span.month': 'a month',
	'time.span.year': 'a year'
};

const fr: Record<MessageKey, string> = {
	'time.timeline': 'Chronologie',
	'time.play': 'Lecture',
	'time.pause': 'Pause',
	'time.span.dayAndHalf': 'un jour et demi',
	'time.span.week': 'une semaine',
	'time.span.month': 'un mois',
	'time.span.year': 'un an'
};

export const messages: Record<Locale, Record<MessageKey, string>> = { en, fr };

export function t(key: MessageKey, locale: Locale): string {
	return messages[locale]?.[key] ?? messages[FALLBACK_LOCALE][key];
}

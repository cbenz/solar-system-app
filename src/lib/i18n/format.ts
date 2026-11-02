import type { Locale } from './locale';

/** An absolute instant, epoch milliseconds in UTC. */
export type Instant = number;

// Intl formatters are expensive to build and immutable, so build one per locale.

const dateFormatters = new Map<Locale, Intl.DateTimeFormat>();
const timeFormatters = new Map<Locale, Intl.DateTimeFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

function dateFormatter(locale: Locale): Intl.DateTimeFormat {
	let formatter = dateFormatters.get(locale);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		dateFormatters.set(locale, formatter);
	}
	return formatter;
}

function timeFormatter(locale: Locale): Intl.DateTimeFormat {
	let formatter = timeFormatters.get(locale);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
		timeFormatters.set(locale, formatter);
	}
	return formatter;
}

function numberFormatter(
	locale: Locale,
	fractionDigits?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): Intl.NumberFormat {
	const key = `${locale}:${fractionDigits?.minimumFractionDigits ?? ''}:${fractionDigits?.maximumFractionDigits ?? ''}`;
	let formatter = numberFormatters.get(key);
	if (!formatter) {
		formatter = new Intl.NumberFormat(locale, fractionDigits);
		numberFormatters.set(key, formatter);
	}
	return formatter;
}

/** The calendar date of an instant, in the locale's own wording. */
export function formatDate(instant: Instant, locale: Locale): string {
	return dateFormatter(locale).format(instant);
}

/** The clock time of an instant, in the locale's own 12- or 24-hour habit. */
export function formatTime(instant: Instant, locale: Locale): string {
	return timeFormatter(locale).format(instant);
}

/**
 * A number with the locale's grouping and decimal separators. The optional
 * fraction digits are the caller's presentation choice, never a locale's.
 */
export function formatNumber(
	value: number,
	locale: Locale,
	fractionDigits?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
	return numberFormatter(locale, fractionDigits).format(value);
}

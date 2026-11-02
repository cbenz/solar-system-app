/**
 * Instant arithmetic. The instant is the only time authority in the app: a
 * plain epoch-millisecond number in UTC, always produced by a pure function
 * here, so that scrubbing forwards and backwards is exactly reversible.
 */

import type { MessageKey } from '$lib/i18n/messages';
import type { Instant, TimeSpan } from './types';

export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_MINUTE = 60_000;

/** J2000.0: JD 2451545.0, 2000-01-01 12:00 UTC (UT treated as TT, §0). */
export const J2000_INSTANT: Instant = Date.UTC(2000, 0, 1, 12, 0, 0);
export const J2000_JULIAN_DAY = 2_451_545.0;

/** Julian Day of an instant; JD 2440587.5 is the Unix epoch. */
export function julianDay(instant: Instant): number {
	return instant / MS_PER_DAY + 2_440_587.5;
}

/** Julian centuries since J2000.0. */
export function julianCenturies(instant: Instant): number {
	return (julianDay(instant) - J2000_JULIAN_DAY) / 36525;
}

export function instantFromJulianDay(jd: number): Instant {
	return (jd - 2_440_587.5) * MS_PER_DAY;
}

/**
 * The UTC calendar year of an instant, derived arithmetically. `Instant` is a
 * plain number and never a `Date` (see `types.ts`); this is the civil-from-days
 * algorithm, so no `Date` object is constructed.
 */
export function utcYear(instant: Instant): number {
	const days = Math.floor(instant / MS_PER_DAY) + 719468;
	const era = Math.floor(days / 146097);
	const dayOfEra = days - era * 146097;
	const yearOfEra = Math.floor(
		(dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) /
			365
	);
	const year = yearOfEra + era * 400;
	const dayOfYear =
		dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
	const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
	const month = monthPrime + (monthPrime < 10 ? 3 : -9);
	return year + (month <= 2 ? 1 : 0);
}

export function startOfDay(instant: Instant): Instant {
	return Math.floor(instant / MS_PER_DAY) * MS_PER_DAY;
}

/** Clamp an instant into a span. A degenerate span collapses onto its start. */
export function clampInstant(instant: Instant, span: TimeSpan): Instant {
	if (span.toInstant <= span.fromInstant) return span.fromInstant;
	if (instant < span.fromInstant) return span.fromInstant;
	if (instant > span.toInstant) return span.toInstant;
	return instant;
}

/** Position on the track, 0 at the span's start and 1 at its end. */
export function ratioOfInstant(instant: Instant, span: TimeSpan): number {
	const width = span.toInstant - span.fromInstant;
	if (width <= 0) return 0;
	return (clampInstant(instant, span) - span.fromInstant) / width;
}

/** The instant at a position on the track. */
export function instantAtRatio(ratio: number, span: TimeSpan): Instant {
	const width = Math.max(0, span.toInstant - span.fromInstant);
	const clamped = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
	return span.fromInstant + clamped * width;
}

/**
 * One playback tick.
 *
 * `daysPerSecond` is the setting's playback speed: simulated days per real
 * second. The result is clamped to the span, so playback stops at the end rather
 * than wrapping.
 */
export function advanceInstant(
	instant: Instant,
	realElapsedMs: number,
	daysPerSecond: number,
	span: TimeSpan
): Instant {
	if (!Number.isFinite(realElapsedMs) || realElapsedMs <= 0) return clampInstant(instant, span);
	if (!Number.isFinite(daysPerSecond) || daysPerSecond <= 0) return clampInstant(instant, span);

	const simulatedMs = (realElapsedMs / 1000) * daysPerSecond * MS_PER_DAY;
	return clampInstant(instant + simulatedMs, span);
}

export function hasReachedEnd(instant: Instant, span: TimeSpan): boolean {
	return instant >= span.toInstant;
}

/** The sandbox's default span: one calendar year, starting in a known January. */
export function sandboxSpan(year = 2025): TimeSpan {
	return { fromInstant: Date.UTC(year, 0, 1), toInstant: Date.UTC(year + 1, 0, 1) };
}

/**
 * The span in words, behind the timeline track. The key names the *rounded*
 * duration, so a one-year span says "a year" and a one-and-a-half-day span says
 * "a day and a half"; ticket 02's catalogue supplies the text.
 */
export function spanLabelKey(span: TimeSpan): MessageKey {
	const days = Math.abs(span.toInstant - span.fromInstant) / MS_PER_DAY;

	if (days <= 2.5) return 'time.span.dayAndHalf';
	if (days <= 10) return 'time.span.week';
	if (days <= 45) return 'time.span.month';
	return 'time.span.year';
}

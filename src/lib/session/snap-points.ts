/**
 * Which instants are worth snapping to, for the current session state.
 *
 * Kept out of the component: the timeline asks for points, it does not decide
 * what is interesting. Add a new family of points here (a mission's declared
 * instants, an eclipse's contacts) and the scrubber picks it up untouched.
 */

import {
	earthSunDistanceAu,
	sunLongitudeDeg
} from './ephemeris';
import { elevationOfPointDeg, observerPositionAu } from './observers';
import { MS_PER_DAY, MS_PER_MINUTE, clampInstant } from './time';
import { normalizeDeg } from './ephemeris';
import type { SnapKind, SnapPoint } from './snap';
import type { Instant, Observer, TimeSpan } from './types';

const SEASONAL_LONGITUDES: ReadonlyArray<{ longitudeDeg: number; kind: SnapKind }> = [
	{ longitudeDeg: 0, kind: 'equinox' },
	{ longitudeDeg: 90, kind: 'solstice' },
	{ longitudeDeg: 180, kind: 'equinox' },
	{ longitudeDeg: 270, kind: 'solstice' }
];

function wrap180(degrees: number): number {
	return normalizeDeg(degrees + 180) - 180;
}

/** Bisect `predicate`'s zero crossing inside a bracket known to straddle it. */
function bisectInstant(
	predicate: (instant: Instant) => number,
	from: Instant,
	to: Instant,
	toleranceMs = MS_PER_MINUTE
): Instant {
	let low = from;
	let high = to;
	let lowValue = predicate(low);

	for (let iteration = 0; iteration < 60 && high - low > toleranceMs; iteration += 1) {
		const middle = (low + high) / 2;
		const middleValue = predicate(middle);

		if (middleValue === 0) return middle;
		if (Math.sign(middleValue) === Math.sign(lowValue)) {
			low = middle;
			lowValue = middleValue;
		} else {
			high = middle;
		}
	}

	return (low + high) / 2;
}

/** The four seasonal instants inside the span (zero, four or five of them). */
function seasonalPoints(span: TimeSpan): SnapPoint[] {
	const points: SnapPoint[] = [];
	const step = MS_PER_DAY;
	const start = span.fromInstant;

	for (const season of SEASONAL_LONGITUDES) {
		const difference = (instant: Instant) =>
			wrap180(sunLongitudeDeg(instant) - season.longitudeDeg);

		let previous = difference(start);
		let previousInstant = start;

		for (let instant = start + step; instant <= span.toInstant; instant += step) {
			const current = difference(instant);

			if (previous <= 0 && current > 0) {
				const crossing = bisectInstant(difference, previousInstant, instant);
				if (crossing >= span.fromInstant && crossing <= span.toInstant) {
					points.push({ instant: crossing, kind: season.kind });
				}
			}

			previous = current;
			previousInstant = instant;
		}
	}

	return points;
}

/** Perihelion and aphelion inside the span, by daily sampling and ternary refinement. */
function apsisPoints(span: TimeSpan): SnapPoint[] {
	const points: SnapPoint[] = [];
	const step = MS_PER_DAY;
	const radius = (instant: Instant) => earthSunDistanceAu(instant);

	let beforePrevious = radius(span.fromInstant);
	let previous = radius(span.fromInstant + step);
	let previousInstant = span.fromInstant + step;

	for (let instant = span.fromInstant + 2 * step; instant <= span.toInstant; instant += step) {
		const current = radius(instant);
		const bracketFrom = Math.max(span.fromInstant, previousInstant - step);

		if (previous < beforePrevious && previous < current) {
			points.push({
				instant: refineExtremum(radius, bracketFrom, instant, 'min'),
				kind: 'perihelion'
			});
		} else if (previous > beforePrevious && previous > current) {
			points.push({
				instant: refineExtremum(radius, bracketFrom, instant, 'max'),
				kind: 'aphelion'
			});
		}

		beforePrevious = previous;
		previous = current;
		previousInstant = instant;
	}

	return points;
}

/** Ternary search for a squared-distance extremum on a sampled bracket. */
function refineExtremum(
	value: (instant: Instant) => number,
	from: Instant,
	to: Instant,
	kind: 'min' | 'max'
): Instant {
	const sign = kind === 'min' ? 1 : -1;
	let low = from;
	let high = to;

	for (let iteration = 0; iteration < 100 && high - low > MS_PER_MINUTE; iteration += 1) {
		const third = (high - low) / 3;
		const left = low + third;
		const right = high - third;

		if (sign * value(left) < sign * value(right)) high = right;
		else low = left;
	}

	return (low + high) / 2;
}

/**
 * Sunrise and sunset of the day the given instant falls in, for one observer.
 * Found as the zero crossings of the same elevation the POV draws (h₀ = 0), so
 * the snap point and the panel can never disagree.
 */
function dayLightBoundaries(
	observer: Observer,
	instant: Instant,
	span: TimeSpan
): SnapPoint[] {
	const points: SnapPoint[] = [];
	const dayStart = Math.floor(instant / MS_PER_DAY) * MS_PER_DAY;
	const sunPosition = (at: Instant) => elevationOfPointDeg(observer, { x: 0, y: 0, z: 0 }, at);
	const step = 5 * MS_PER_MINUTE;

	let previous = sunPosition(dayStart);

	for (let at = dayStart + step; at < dayStart + MS_PER_DAY; at += step) {
		const current = sunPosition(at);

		if (previous <= 0 && current > 0) {
			const crossing = bisectInstant(sunPosition, at - step, at);
			if (crossing >= span.fromInstant && crossing <= span.toInstant) {
				points.push({ instant: crossing, kind: 'sunrise' });
			}
		} else if (previous > 0 && current <= 0) {
			const crossing = bisectInstant(sunPosition, at - step, at);
			if (crossing >= span.fromInstant && crossing <= span.toInstant) {
				points.push({ instant: crossing, kind: 'sunset' });
			}
		}

		previous = current;
	}

	return points;
}

/**
 * Every snap point for a session: the season's four turns, the two apsides, and
 * the current day's sunrise and sunset for the first observer when there is one.
 */
export function snapPointsFor(
	span: TimeSpan,
	observers: readonly Observer[],
	instant: Instant
): SnapPoint[] {
	const points = [...seasonalPoints(span), ...apsisPoints(span)];
	const observer = observers[0];

	if (observer !== undefined && observer.bodyId === 'earth') {
		points.push(...dayLightBoundaries(observer, clampInstant(instant, span), span));
	}

	const seen = new Set<number>();
	return points
		.filter((point) => {
			if (seen.has(point.instant)) return false;
			seen.add(point.instant);
			return true;
		})
		.sort((a, b) => a.instant - b.instant);
}

/**
 * Unused re-export kept for tickets 05/06, which will place observers and need
 * the same surface point this module's daylight search uses.
 */
export { observerPositionAu };

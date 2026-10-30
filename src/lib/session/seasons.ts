/**
 * The seasons model: the same geometry as `observers.ts`, with the obliquity as
 * a **parameter** instead of a constant.
 *
 * Ticket 13's activity has one control that must bite: the tilt. A slider that
 * only moved a number on screen would teach nothing, so every quantity here is
 * a pure function of `(instant, latitude, tiltDeg)` and the session's observer
 * contributor passes the activity's `tilt` setting in. The default is the
 * model's `OBLIQUITY_DEG`, so every other activity and the sandbox are unchanged.
 *
 * The one honest subtlety, recorded because it decides a ticket assertion:
 * **at zero tilt the day LENGTH is exactly twelve hours everywhere, all year**
 * (`h₀ = 0`, `δ = 0`). The seasonal remainder that survives at zero tilt is in
 * the *intensity*, through `1/r²`: the Earth is near aphelion in June and near
 * perihelion in December. `daylightMinutesForTilt` therefore reports the day's
 * sunlight as **equivalent minutes at full intensity** — duration × the noon
 * sine × `(1 AU / r)²` — which is the quantity that can show the remainder, and
 * it is also the quantity that refutes the distance theory below.
 *
 * Declination, day length and the horizon convention follow ASTRONOMY.md §2–§3:
 * `δ = asin(sin ε · sin λ☉)`, `cos H₀ = −tan φ · tan δ`, `h₀ = 0`.
 */

import {
	AU_KM,
	OBLIQUITY_DEG,
	normalizeDeg,
	earthSunDistanceAu as trueEarthSunDistanceAu,
	sunLongitudeDeg
} from './ephemeris';
import { bodyCenterAu } from './observers';
import type { Instant, Observer, TimeSpan, Vec3 } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const HOURS_PER_DAY = 24;

/** The setting keys this activity's two controls write. */
export const TILT_SETTING_KEY = 'tilt';
export const EXAGGERATED_ORBIT_SETTING_KEY = 'exaggeratedOrbit';

/** The tilt a scene uses: the setting where it exists, the model otherwise. */
export function tiltDegFromSettings(settings: Record<string, number | boolean>): number {
	const value = settings[TILT_SETTING_KEY];
	if (typeof value !== 'number' || !Number.isFinite(value)) return OBLIQUITY_DEG;
	return Math.min(OBLIQUITY_DEG, Math.max(0, value));
}

/** The Sun's declination at a chosen tilt: `asin(sin ε · sin λ☉)`. */
export function solarDeclinationForTiltDeg(instant: Instant, tiltDeg: number): number {
	const longitude = sunLongitudeDeg(instant) * DEG;
	const temperature = Math.sin(Math.min(OBLIQUITY_DEG, Math.max(0, tiltDeg)) * DEG);
	return Math.asin(temperature * Math.sin(longitude)) * RAD;
}

/**
 * Daylight duration in hours, geometric centre of the Sun (`h₀ = 0`).
 *
 * `cos H₀ = −tan φ · tan δ`, with the two polar cases handled before the arc
 * cosine. The latitude is clamped away from the exact pole so `tan φ` stays
 * finite; ASTRONOMY.md §3.4.
 */
export function dayLengthHours(latitudeDeg: number, declinationDeg: number): number {
	const latitude = Math.min(89.999, Math.max(-89.999, latitudeDeg)) * DEG;
	const declination = declinationDeg * DEG;

	const cosHourAngle = -Math.tan(latitude) * Math.tan(declination);

	if (!Number.isFinite(cosHourAngle)) return declination === 0 ? 12 : 0;
	if (cosHourAngle <= -1) return HOURS_PER_DAY;
	if (cosHourAngle >= 1) return 0;

	const hourAngle = Math.acos(cosHourAngle) * RAD;
	return (2 * hourAngle) / 15;
}

/** Daylight duration at a latitude, instant and tilt. */
export function dayLengthHoursForTilt(
	latitudeDeg: number,
	instant: Instant,
	tiltDeg: number
): number {
	return dayLengthHours(latitudeDeg, solarDeclinationForTiltDeg(instant, tiltDeg));
}

/** The Sun's noon elevation, `90° − |φ − δ|`; negative means it never rises. */
export function noonElevationDeg(latitudeDeg: number, declinationDeg: number): number {
	return 90 - Math.abs(latitudeDeg - declinationDeg);
}

/**
 * The day's sunlight as equivalent minutes at full intensity.
 *
 * `dayLength × sin(noon elevation) × (1 AU / r)² × 60`. The first two factors
 * are the obliquity's contribution (length and concentration), the last is the
 * distance's. It is a proxy for daily insolation, not a radiometric quantity:
 * no atmosphere, no solar constant, because the comparison is what matters.
 */
export function daylightMinutesForTilt(
	latitudeDeg: number,
	instant: Instant,
	tiltDeg: number
): number {
	const declination = solarDeclinationForTiltDeg(instant, tiltDeg);
	const noon = noonElevationDeg(latitudeDeg, declination);
	if (noon <= 0) return 0;

	const duration = dayLengthHours(latitudeDeg, declination);
	const concentration = Math.sin(noon * DEG);
	const distance = trueEarthSunDistanceAu(instant);

	return duration * concentration * (1 / (distance * distance)) * 60;
}

/**
 * Daily insolation contrast between two instants at one latitude, with the
 * obliquity and distance contributions returned separately.
 *
 * The point of the split is the refutation the activity exists for: the
 * distance factor is **the same number for both hemispheres** at a given
 * instant, so it can never make one hemisphere's summer while the other has
 * winter. Only `obliquityFactor` changes sign with the hemisphere.
 */
export function insolationContrast(
	latitudeDeg: number,
	summerInstant: Instant,
	winterInstant: Instant,
	tiltDeg: number
): { obliquityFactor: number; distanceFactor: number; combined: number } {
	const summerDeclination = solarDeclinationForTiltDeg(summerInstant, tiltDeg);
	const winterDeclination = solarDeclinationForTiltDeg(winterInstant, tiltDeg);

	const summerNoon = noonElevationDeg(latitudeDeg, summerDeclination);
	const winterNoon = noonElevationDeg(latitudeDeg, winterDeclination);
	const summerDuration = dayLengthHours(latitudeDeg, summerDeclination);
	const winterDuration = dayLengthHours(latitudeDeg, winterDeclination);

	const summerObliquity = summerNoon > 0 ? summerDuration * Math.sin(summerNoon * DEG) : 0;
	const winterObliquity = winterNoon > 0 ? winterDuration * Math.sin(winterNoon * DEG) : 0;

	const summerDistance = 1 / trueEarthSunDistanceAu(summerInstant) ** 2;
	const winterDistance = 1 / trueEarthSunDistanceAu(winterInstant) ** 2;

	return {
		obliquityFactor: summerObliquity - winterObliquity,
		distanceFactor: summerDistance - winterDistance,
		combined: summerObliquity * summerDistance - winterObliquity * winterDistance
	};
}

/** Distance from the Sun to the body an observer stands on, in AU. */
export function distanceToSunAu(observer: Observer, instant: Instant): number {
	const centre = bodyCenterAu(observer.bodyId, instant);
	return Math.hypot(centre.x, centre.y, centre.z);
}

/** Earth–Sun distance in AU, re-exported for the activity and its tests. */
export function earthSunDistanceAu(instant: Instant): number {
	return trueEarthSunDistanceAu(instant);
}

/** Earth–Sun distance in kilometres, for a readout a child can compare. */
export function earthSunDistanceKm(instant: Instant): number {
	return trueEarthSunDistanceAu(instant) * AU_KM;
}

const SAMPLE_STEP_MS = 6 * 3_600_000;

/**
 * The instant of an extremum of the Earth–Sun distance over a span.
 *
 * A six-hour scan finds the bracketing day, then a bounded ternary search
 * refines it. The distance curve has one minimum and one maximum per year, so
 * the search is on a unimodal interval and needs no derivative.
 */
function extremumInstant(span: TimeSpan, direction: 'min' | 'max'): Instant {
	const sign = direction === 'min' ? 1 : -1;
	const score = (instant: Instant) => sign * trueEarthSunDistanceAu(instant);

	let bestInstant = span.fromInstant;
	let bestScore = score(bestInstant);

	for (
		let instant = span.fromInstant + SAMPLE_STEP_MS;
		instant <= span.toInstant;
		instant += SAMPLE_STEP_MS
	) {
		const candidate = score(instant);
		if (candidate < bestScore) {
			bestScore = candidate;
			bestInstant = instant;
		}
	}

	let low = bestInstant - SAMPLE_STEP_MS;
	let high = bestInstant + SAMPLE_STEP_MS;
	for (let iteration = 0; iteration < 60; iteration += 1) {
		const left = low + (high - low) / 3;
		const right = high - (high - low) / 3;
		if (score(left) < score(right)) high = right;
		else low = left;
	}

	return (low + high) / 2;
}

/** The instant the Earth is nearest the Sun inside a span. */
export function perihelionInstant(fromInstant: Instant, toInstant: Instant): Instant {
	return extremumInstant({ fromInstant, toInstant }, 'min');
}

/** The instant the Earth is farthest from the Sun inside a span. */
export function aphelionInstant(fromInstant: Instant, toInstant: Instant): Instant {
	return extremumInstant({ fromInstant, toInstant }, 'max');
}

/**
 * A year of Earth–Sun distances, for the measurement the reveal shows: the
 * curve the child's own summer sits on, and the January minimum in it.
 */
export function annualDistanceCurve(
	fromInstant: Instant,
	toInstant: Instant,
	samples = 366
): { instant: Instant; distanceAu: number }[] {
	if (samples < 2) return [{ instant: fromInstant, distanceAu: trueEarthSunDistanceAu(fromInstant) }];

	const step = (toInstant - fromInstant) / (samples - 1);
	return Array.from({ length: samples }, (_unused, index) => {
		const instant = fromInstant + index * step;
		return { instant, distanceAu: trueEarthSunDistanceAu(instant) };
	});
}

/**
 * Where the child's claimed summer sits on that curve: the index of the nearest
 * sample. The reveal marks that point, so the claim is not erased.
 */
export function nearestCurveIndex(
	curve: readonly { instant: Instant }[],
	instant: Instant
): number {
	let best = 0;
	let bestDistance = Number.POSITIVE_INFINITY;
	curve.forEach((sample, index) => {
		const distance = Math.abs(sample.instant - instant);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = index;
		}
	});
	return best;
}

/** Unit direction of sunlight's travel at the Earth: from the Sun, toward it. */
export function sunlightDirection(instant: Instant): Vec3 {
	const earth = bodyCenterAu('earth', instant);
	const size = Math.hypot(earth.x, earth.y, earth.z);
	return { x: -earth.x / size, y: -earth.y / size, z: -earth.z / size };
}

/** The Sun's ecliptic longitude, re-exported so the activity reads no ephemeris directly. */
export function sunEclipticLongitudeDeg(instant: Instant): number {
	return normalizeDeg(sunLongitudeDeg(instant));
}

/**
 * The flux ratio a given orbital eccentricity can produce:
 * `((1 + e) / (1 − e))²` between perihelion and aphelion. At the real 0.0167
 * it is 1.069; at the hypothesis's 0.5 it is 9. Large — and still common to
 * both hemispheres at any instant, which is why it cannot give one summer and
 * the other winter.
 */
export function distanceInsolationRatio(eccentricity: number): number {
	const e = Math.min(0.9, Math.max(0, eccentricity));
	return ((1 + e) / (1 - e)) ** 2;
}

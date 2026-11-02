/**
 * The Moon as an observer sees it: phase, angular size and apparent magnitude.
 *
 * Phase comes from the Sun–Earth–Moon elongation, never from a longitude
 * difference (ASTRONOMY.md §6.1): `f = (1 − cos ψ)/2` is exact for the vector
 * geometry, and it stays right when the Moon's orbit is inclined.
 *
 * Like the rest of the session module this file is pure; the POV panel only
 * reads what it returns.
 */

import {
	AU_KM,
	dot,
	moonGeocentricPositionAu,
	normalizeDeg,
	sunGeocentricPositionAu,
	unit
} from './ephemeris';
import type { Instant, Vec3 } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** The Moon's mean radius, in km (ASTRONOMY.md §6.2). */
export const MOON_RADIUS_KM = 1737.4;

/** The Moon's mean distance, in km — the reference of the magnitude fit. */
const MOON_MEAN_DISTANCE_KM = 384_400;

export type MoonPhase = {
	/** Sun–Earth–Moon angle, in degrees: 0 at new, 180 at full. */
	elongationDeg: number;
	/** Sun–Moon–Earth angle, in degrees: 180 at new, 0 at full. */
	phaseAngleDeg: number;
	/** Illuminated fraction of the disc, in [0, 1]. */
	illuminatedFraction: number;
	/** True while the lit limb grows: the Moon east of the Sun. */
	waxing: boolean;
};

function clampUnit(value: number): number {
	return Math.min(Math.max(value, -1), 1);
}

/** The Moon's distance from the Earth's centre, in km. */
export function moonDistanceKm(
	instant: Instant,
	positionAu: Vec3 = moonGeocentricPositionAu(instant)
): number {
	return Math.hypot(positionAu.x, positionAu.y, positionAu.z) * AU_KM;
}

/**
 * The Moon's phase at an instant, from the unit vectors Earth→Moon and
 * Earth→Sun (ASTRONOMY.md §6.1).
 *
 * Waxing is `sin(λ☾ − λ☉) > 0`, the Moon east of the Sun. The sign is read
 * from the `z` component of the cross product, which is that sine scaled by the
 * two lengths — positive while the Moon runs ahead of the Sun in longitude.
 */
export function moonPhase(
	instant: Instant,
	moonPositionAu: Vec3 = moonGeocentricPositionAu(instant)
): MoonPhase {
	const moon = moonPositionAu;
	const sun = sunGeocentricPositionAu(instant);

	const elongationDeg = Math.acos(clampUnit(dot(unit(moon), unit(sun)))) * RAD;
	const eastOfSun = sun.x * moon.y - sun.y * moon.x;

	return {
		elongationDeg,
		phaseAngleDeg: 180 - elongationDeg,
		illuminatedFraction: (1 - Math.cos(elongationDeg * DEG)) / 2,
		waxing: eastOfSun > 0
	};
}

/**
 * The Moon's apparent magnitude.
 *
 * Standard phase-dependent empirical fit, `m = −12.73 + 0.026·|α| + 4e-9·α⁴`
 * (`α` in degrees), plus the `5·log10(d_mean/d)` distance term. Source:
 * ASTRONOMY.md §6.3, taken from Meeus, *Astronomical Algorithms* (2nd ed.) and
 * the *Explanatory Supplement to the Astronomical Almanac*; good to ±0.1 mag at
 * mean distance.
 */
export function moonApparentMagnitude(
	instant: Instant,
	positionAu: Vec3 = moonGeocentricPositionAu(instant)
): number {
	const phaseAngle = Math.abs(moonPhase(instant, positionAu).phaseAngleDeg);
	const phaseTerm = -12.73 + 0.026 * phaseAngle + 4e-9 * phaseAngle ** 4;
	const distanceTerm = 5 * Math.log10(MOON_MEAN_DISTANCE_KM / moonDistanceKm(instant, positionAu));

	return phaseTerm + distanceTerm;
}

/** The Moon's apparent angular diameter, in degrees, from its true distance. */
export function moonAngularDiameterDeg(
	instant: Instant,
	positionAu: Vec3 = moonGeocentricPositionAu(instant)
): number {
	return 2 * Math.asin(MOON_RADIUS_KM / moonDistanceKm(instant, positionAu)) * RAD;
}

/**
 * Normalised angular difference `b − a` in (−180, 180], in degrees. The POV
 * panel needs it to point the lit limb at the Sun the short way round.
 */
export function shortestAngleDeg(fromDeg: number, toDeg: number): number {
	const difference = normalizeDeg(toDeg - fromDeg + 180) - 180;

	return difference === -180 ? 180 : difference;
}

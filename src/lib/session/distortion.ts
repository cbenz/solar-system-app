/**
 * The two distortions (ADR-0003), as numbers the renderer multiplies by.
 *
 * Distances and radii are distorted by default so the scene stays readable, and
 * the two distortions are independent: a child can ask for real distances while
 * the bodies stay big enough to see, or for real sizes while the distances stay
 * short enough to follow. Both switches off is the readable default; both on is
 * the honest one. This module owns every factor; the renderer and the components
 * only apply them.
 *
 * Values in this file are in astronomical units (AU), the session module's unit.
 * A drawn quantity is `true quantity × factor`.
 *
 * ## Distances: log compression with a floor
 *
 * Distances already shorter than `DISTANCE_FLOOR_AU` are drawn true — they are
 * small enough to read — and everything above the floor is compressed
 * logarithmically:
 *
 *     drawn(d) = d                                        when d <= floor
 *              = floor * (1 + ln(d / floor))              when d >  floor
 *
 * With `floor = 0.01 AU` (1.5 million km) the numbers are:
 *
 * | body  | true distance from its primary | drawn    | factor   |
 * |-------|-------------------------------:|---------:|---------:|
 * | Sun   | 0 (it is the origin)            | 0        | 1        |
 * | Earth | 1 AU                            | 0.0561 AU| 0.0561   |
 * | Moon  | 0.00257 AU                      | 0.025 AU | 9.73     |
 *
 * So the Earth is drawn 5.6 Earth radii from the Sun instead of 23 500: short
 * enough that both fit a phone screen, long enough that the orbit still reads as
 * an orbit. Turning the switch on multiplies by 1 instead, which is 17.8 times
 * further — far enough that the Sun leaves the frame, which is the point.
 *
 * **The Moon's orbit gets a second, documented distortion** (ticket 14). The
 * Moon's true distance is 0.26 drawn Earth radii, i.e. inside the enlarged
 * globe, so the default view would hide the Moon and its orbit entirely. The
 * readable default therefore draws the Moon's orbit at 2.5 drawn Earth radii:
 * outside the globe, close enough to the Earth to read as *its* orbit, and
 * stated in the scene's notice like the other distortions. That is the `9.73`
 * in the table above. With true distance on, the factor is 1 like everything
 * else and the Moon is back inside the drawn Earth — which is what true
 * distance means here.
 *
 * The factor applies to a body's position **relative to its primary** (see
 * `primaryOf`): compressing heliocentric positions instead would squeeze the
 * Earth and the Moon onto the same point, because they sit 1 AU from the Sun.
 *
 * ## Radii: one enlargement, capped for the Sun
 *
 * Every body but the Sun is drawn `ENLARGEMENT` times its true radius, so their
 * sizes stay in proportion to each other: at 234.8×, the Earth is drawn at
 * 0.01 AU and the Moon at 0.27 of that, its true ratio. The Sun at the same
 * enlargement would be 1.09 AU in radius — twenty times the compressed orbit —
 * so it is capped at `SUN_RADIUS_CAP_AU = 0.02 AU`, twice the drawn Earth
 * radius.
 * That keeps the Sun visibly the biggest body without swallowing the Earth, and
 * the notice in the scene says the sizes are not to scale anyway.
 *
 * With `trueSize` on, the factor is exactly 1 for every body: real radii, tiny
 * bodies, and the notice drops that half of its sentence.
 */

import type { MessageKey } from '$lib/i18n/messages';
import { AU_KM } from './ephemeris';
import type { BodyId, SessionState } from './types';

/** The radius of each body, in AU, from the published values in km. */
const TRUE_RADIUS_KM: Record<BodyId, number> = {
	sun: 696_000,
	mercury: 2_439.7,
	venus: 6_051.8,
	earth: 6_371,
	moon: 1_737.4,
	mars: 3_389.5,
	jupiter: 69_911,
	saturn: 58_232,
	uranus: 25_362,
	neptune: 24_622
};

/** The Earth's drawn radius in the readable default: the scene's unit. */
export const DRAWN_EARTH_RADIUS_AU = 0.01;

/** A body below the floor is already readable, so its distance is drawn true. */
export const DISTANCE_FLOOR_AU = 0.01;

/** The Sun's drawn radius, in AU, when the readable default is active. */
export const SUN_RADIUS_CAP_AU = 2 * DRAWN_EARTH_RADIUS_AU;

/**
 * The Moon's orbit, in drawn Earth radii, in the readable default.
 *
 * Two and a half is the smallest round number that clears the drawn globe
 * (radius 1) plus the drawn Moon (radius 0.27) with a gap, and it keeps the
 * whole orbit inside the closest camera preset. See the header.
 */
export const MOON_ORBIT_DRAWN_RADII = 2.5;

/** The Moon's orbit, in AU, in the readable default. */
export const MOON_ORBIT_DRAWN_AU = MOON_ORBIT_DRAWN_RADII * DRAWN_EARTH_RADIUS_AU;

/** One enlargement for every body but the Sun; see the header for the numbers. */
const ENLARGEMENT = DRAWN_EARTH_RADIUS_AU / (TRUE_RADIUS_KM.earth / AU_KM);

/** The body each body's distance is measured from. The Sun has none. */
const PRIMARY: Record<BodyId, BodyId | null> = {
	sun: null,
	mercury: 'sun',
	venus: 'sun',
	earth: 'sun',
	moon: 'earth',
	mars: 'sun',
	jupiter: 'sun',
	saturn: 'sun',
	uranus: 'sun',
	neptune: 'sun'
};

/** Each body's mean distance from its primary, in AU (the compression's input). */
const MEAN_PRIMARY_DISTANCE_AU: Record<BodyId, number> = {
	sun: 0,
	mercury: 0.38709927,
	venus: 0.72333566,
	earth: 1.000001018,
	moon: 384_400 / AU_KM,
	mars: 1.52371034,
	jupiter: 5.202887,
	saturn: 9.53667594,
	uranus: 19.18916464,
	neptune: 30.06992276
};

export type DistortionFactors = {
	/** Multiplies the body's offset from its primary. */
	distanceFactor: number;
	/** Multiplies the body's true radius. */
	radiusFactor: number;
};

/** A body's true radius in AU. Exported so tests and the renderer agree. */
export function trueRadiusAu(body: BodyId): number {
	return TRUE_RADIUS_KM[body] / AU_KM;
}

/** The body this body orbits, or `null` for the Sun. */
export function primaryOf(body: BodyId): BodyId | null {
	return PRIMARY[body];
}

/**
 * The drawn distance for a true distance, in AU. Monotone non-decreasing, exact
 * identity below the floor, logarithmic above it.
 */
export function compressedDistanceAu(trueDistanceAu: number): number {
	if (trueDistanceAu <= DISTANCE_FLOOR_AU) return trueDistanceAu;
	return DISTANCE_FLOOR_AU * (1 + Math.log(trueDistanceAu / DISTANCE_FLOOR_AU));
}

/** The drawn radius for a true radius, in AU. Monotone non-decreasing. */
export function enlargedRadiusAu(trueRadiusAuValue: number): number {
	return Math.min(trueRadiusAuValue * ENLARGEMENT, SUN_RADIUS_CAP_AU);
}

/**
 * The factors the renderer applies to one body.
 *
 * `trueDistance` and `trueSize` are the session's two switches; the factors
 * depend on nothing else, so turning one switch on cannot change the other
 * distortion.
 */
export function bodyDistortion(
	trueDistance: boolean,
	trueSize: boolean,
	body: BodyId
): DistortionFactors {
	const meanDistance = MEAN_PRIMARY_DISTANCE_AU[body];
	// The Moon's orbit is drawn at a readable radius, not at its true one: at its
	// true distance it would be inside the enlarged Earth (see the header).
	const drawnDistance = body === 'moon' ? MOON_ORBIT_DRAWN_AU : compressedDistanceAu(meanDistance);
	const radius = trueRadiusAu(body);

	return {
		distanceFactor: trueDistance || meanDistance === 0 ? 1 : drawnDistance / meanDistance,
		radiusFactor: trueSize ? 1 : enlargedRadiusAu(radius) / radius
	};
}

/**
 * Which distortion is active, as message keys, in the child's language.
 *
 * Returns one key per distorted scale, in the order distances then sizes, and
 * nothing at all only when both switches are on. The banner in the scene renders
 * these through `t()`; the session decides, never the component.
 */
export function distortionNotice(state: Pick<SessionState, 'trueDistance' | 'trueSize'>): MessageKey[] {
	const notice: MessageKey[] = [];
	if (!state.trueDistance) notice.push('distortion.distancesNotToScale');
	if (!state.trueSize) notice.push('distortion.sizesNotToScale');
	return notice;
}

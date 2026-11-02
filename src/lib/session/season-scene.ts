/**
 * The seasons scene model: what the seasons activity draws around the bodies.
 *
 * ADR-0004 rule 1 is the reason this file is separate and tested: the orbit the
 * child sees while seasons are explained is a **circle** (drawn eccentricity 0,
 * under the stated 0.02 ceiling). The eccentric orbit exists only as a
 * hypothesis the child switches on, and is drawn with an explicit eccentricity
 * so the measurement can refute the distance theory in front of them.
 *
 * The model is pure and in the session's heliocentric frame (AU, ecliptic
 * plane). The renderer converts the points through the same drawn offset it
 * uses for the bodies (`distortion.ts`), so the shape is never decided in WebGL.
 */

import { findSetting } from '../../activities/settings';
import type { MessageKey } from '$lib/i18n/messages';
import { currentActivity } from './camera';
import { earthHeliocentricPositionAu } from './ephemeris';
import { placeName } from './places';
import {
	daylightMinutesForTilt,
	earthSunDistanceAu,
	earthSunDistanceKm,
	perihelionInstant,
	tiltDegFromSettings
} from './seasons';
import { utcYear } from './time';
import { parallelSunRays, type SunRayBundle } from './sun-rays';
import type { Instant, SessionState, Vec3 } from './types';

/** The ceiling the default drawing must stay under, in geometric eccentricity. */
export const DRAWN_ORBIT_MAX_ECCENTRICITY = 0.02;

/** The eccentricity the hypothesis switch draws. Deliberately obvious. */
export const DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED = 0.5;

/** The drawn orbit's eccentricity: circular unless the child asks otherwise. */
export function drawnOrbitEccentricity(exaggerated: boolean): number {
	return exaggerated ? DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED : 0;
}

/** Earth's heliocentric direction at the year's perihelion, in radians. */
function perihelionAngle(instant: Instant): number {
	// `utcYear` derives the calendar year arithmetically: the instant is a plain
	// number and never a `Date`.
	const year = utcYear(instant);
	const perihelion = perihelionInstant(Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1));
	const position = earthHeliocentricPositionAu(perihelion);
	return Math.atan2(position.y, position.x);
}

/** The two solstices of an instant's year, near enough for the daylight readout. */
function solsticeInstants(instant: Instant): { june: Instant; december: Instant } {
	const year = utcYear(instant);
	return {
		june: Date.UTC(year, 5, 21, 2, 42),
		december: Date.UTC(year, 11, 21, 15, 3)
	};
}

/**
 * The June/December daylight difference at one POV, in equivalent minutes at
 * full intensity. At zero tilt the day length is the same everywhere, but the
 * distance's `1/r²` remainder survives: this is the small number story 53 asks
 * the child to keep seeing.
 */
export type SeasonDaylight = {
	povId: string;
	label: MessageKey;
	juneMinutes: number;
	decemberMinutes: number;
	differenceMinutes: number;
};

/**
 * The closed drawn orbit, in heliocentric AU, in the ecliptic plane.
 *
 * `a` is chosen so the curve passes through the Earth's current position for
 * the declared eccentricity, which keeps the body on its own drawn track when
 * the hypothesis switch changes without snapping the view.
 */
export function drawnOrbitPoints(
	instant: Instant,
	eccentricity: number,
	samples = 240
): Vec3[] {
	const e = Math.min(0.9, Math.max(0, eccentricity));
	const current = earthHeliocentricPositionAu(instant);
	const currentRadius = Math.hypot(current.x, current.y, current.z);
	const focusAngle = perihelionAngle(instant);
	const trueAnomaly = Math.atan2(current.y, current.x) - focusAngle;
	const semiMajorAxis =
		e === 0
			? currentRadius
			: (currentRadius * (1 + e * Math.cos(trueAnomaly))) / (1 - e * e);

	const points: Vec3[] = [];
	for (let index = 0; index < samples; index += 1) {
		const anomaly = (index / samples) * 2 * Math.PI;
		const radius = (semiMajorAxis * (1 - e * e)) / (1 + e * Math.cos(anomaly));
		const angle = focusAngle + anomaly;
		points.push({
			x: radius * Math.cos(angle),
			y: radius * Math.sin(angle),
			z: 0
		});
	}

	return points;
}

/** Everything the seasons scene draws beyond the bodies themselves. */
export type SeasonScene = {
	tiltDeg: number;
	exaggeratedOrbit: boolean;
	drawnEccentricity: number;
	/** Closed heliocentric orbit, in AU. */
	orbit: readonly Vec3[];
	/** The parallel sunlight bundle crossing the Earth, in AU. */
	rays: SunRayBundle;
	earthSunDistanceAu: number;
	earthSunDistanceKm: number;
	/** The June/December daylight difference at each declared POV. */
	daylight: readonly SeasonDaylight[];
};

/**
 * The seasons scene for a session state, or `null` for every other activity.
 *
 * Activation is data-driven: an activity that declares a `tilt` setting is
 * asking for the seasons model, so no activity id is hard-coded here.
 */
export function seasonSceneFor(state: SessionState): SeasonScene | null {
	const activity = currentActivity(state);
	if (activity === undefined) return null;
	if (findSetting(activity.settings, 'tilt') === undefined) return null;

	const tiltDeg = tiltDegFromSettings(state.settings);
	const exaggeratedOrbit = state.settings.exaggeratedOrbit === true;
	const drawnEccentricity = drawnOrbitEccentricity(exaggeratedOrbit);
	const { june, december } = solsticeInstants(state.instant);
	const daylight = activity.povs.map((pov) => {
		const juneMinutes = daylightMinutesForTilt(pov.latitudeDeg, june, tiltDeg);
		const decemberMinutes = daylightMinutesForTilt(pov.latitudeDeg, december, tiltDeg);
		return {
			povId: pov.id,
			label: pov.label ?? placeName(pov.latitudeDeg),
			juneMinutes,
			decemberMinutes,
			differenceMinutes: juneMinutes - decemberMinutes
		};
	});

	return {
		tiltDeg,
		exaggeratedOrbit,
		drawnEccentricity,
		orbit: drawnOrbitPoints(state.instant, drawnEccentricity),
		rays: parallelSunRays(state.instant),
		earthSunDistanceAu: earthSunDistanceAu(state.instant),
		earthSunDistanceKm: earthSunDistanceKm(state.instant),
		daylight
	};
}

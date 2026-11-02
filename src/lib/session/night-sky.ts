/**
 * The night sky: what one POV sees above the horizon, and whether the eye could
 * see it.
 *
 * Two responsibilities, both pure:
 *
 * - the **visibility limit** (glossary: distinct from presence in the scene)
 *   decides which bodies a POV lists and draws;
 * - the **decorative star field** the POV panel fills the dark with.
 *
 * The stars are decorative and the app never claims otherwise. They are seeded
 * deterministically and placed by a uniform draw over the hemisphere — no
 * constellation, no catalogue, no named star, nothing that would let the
 * pattern imply a claim. Only the Moon is astromonically placed.
 *
 * The one import from `$lib/scene` is `mulberry32`, a pure seed helper that
 * imports nothing; the session still touches no Three.js, no DOM and no Svelte.
 */

import { mulberry32 } from '$lib/random';
import {
	moonAngularDiameterDeg,
	moonApparentMagnitude,
	moonPhase,
	shortestAngleDeg
} from './moon';
import {
	bodyCenterAu,
	elevationOfPointDeg,
	pointAltitudeAzimuthDeg,
	sunElevationDeg
} from './observers';
import { add, earthHeliocentricPositionAu } from './ephemeris';
import { SUN_APPARENT_MAGNITUDE, isAboveVisibilityLimit } from './visibility';
import { lunarEclipseFor, placedMoonGeocentricAu } from './eclipse';
import type {
	BodyId,
	Instant,
	Observer,
	SceneMoon,
	SceneObserver,
	SessionState
} from './types';

/** Seed of the decorative night-sky stars. Fixed: the sky is a place, not a slot machine. */
export const DECORATIVE_STAR_SEED = 0x5c1e57a2;

/** How many decorative stars sit above the horizon. */
export const DECORATIVE_STAR_COUNT = 90;

export type SkyStar = {
	/** Altitude above the horizon, in degrees (0 … 90). */
	altitudeDeg: number;
	/** Azimuth clockwise from north, in degrees (0 … 360). */
	azimuthDeg: number;
	/** Relative brightness in [0, 1), for the panel's dot size and opacity. */
	brightness: number;
};

/**
 * The decorative stars, seeded. Same seed → the same list, exactly, which is
 * what keeps them from shimmering between renders.
 *
 * The draw is uniform over the hemisphere: `sin(altitude)` is uniform in
 * [0, 1), so no part of the sky is over-dense. Nothing here is a real star
 * catalogue, and that is deliberate.
 */
export function decorativeStars(seed: number, count: number = DECORATIVE_STAR_COUNT): SkyStar[] {
	const random = mulberry32(seed);

	return Array.from({ length: count }, () => ({
		altitudeDeg: (Math.asin(random()) * 180) / Math.PI,
		azimuthDeg: random() * 360,
		brightness: random()
	}));
}

/** The visibility-limit switch. Off by default: the app shows bodies above the horizon. */
export function visibilityLimitEnabled(state: SessionState): boolean {
	return state.settings.visibilityLimit === true;
}

/**
 * The apparent magnitude the limit reads, or null when the session models none.
 * Only the Sun and the Moon have one; the Earth seen from the Moon is not a
 * night-sky claim, so the limit leaves it alone.
 */
export function apparentMagnitudeOf(instant: Instant, id: BodyId): number | null {
	switch (id) {
		case 'sun':
			return SUN_APPARENT_MAGNITUDE;
		case 'moon':
			return moonApparentMagnitude(instant);
		default:
			// The model gives the other bodies no apparent magnitude; the limit
			// leaves them alone rather than inventing a number.
			return null;
	}
}

/** The apparent angular diameter the limit reads, or null when unmodelled. */
export function angularDiameterDegOf(instant: Instant, id: BodyId): number | null {
	return id === 'moon' ? moonAngularDiameterDeg(instant) : null;
}

/**
 * The bodies this POV lists.
 *
 * With the visibility limit **off**, a body is listed whenever it is above the
 * horizon — ticket 05's rule — so turning the setting off shows bodies again.
 * With it **on**, the body must also survive `isAboveVisibilityLimit`.
 */
export function visibleBodiesFor(state: SessionState, observer: Observer): BodyId[] {
	const limit = visibilityLimitEnabled(state);
	const sunElevation = observer.bodyId === 'earth' ? sunElevationDeg(observer, state.instant) : 0;

	return state.subsystem.filter((id) => {
		if (id === observer.bodyId) return false;

		const elevationDeg = elevationOfPointDeg(
			observer,
			bodyCenterAu(id, state.instant),
			state.instant
		);
		if (!(elevationDeg > 0)) return false;
		if (!limit) return true;

		return isAboveVisibilityLimit({
			elevationDeg,
			sunElevationDeg: sunElevation,
			apparentMagnitude: apparentMagnitudeOf(state.instant, id),
			angularDiameterDeg: angularDiameterDegOf(state.instant, id)
		});
	});
}

/**
 * The Moon for one POV, or null when there is nothing to draw.
 *
 * `altitudeDeg` and `azimuthDeg` place it with the same rotation the Sun uses;
 * `litLimbAngleDeg` points the lit limb at the Sun on the panel, which is what
 * makes the crescent face the right way. The panel decides whether to draw it
 * from `visibleBodies`, so toggling the limit genuinely removes it.
 */
export function moonFor(
	observer: Observer,
	state: SessionState,
	/** The Sun as the same panel draws it, so the lit limb points at that Sun. */
	sun: { altitudeDeg: number; azimuthDeg: number }
): SceneMoon | null {
	if (observer.bodyId === 'moon') return null;
	if (!state.subsystem.includes('moon')) return null;

	const instant = state.instant;
	// The Moon where this session has it: the ephemeris, moved along its orbit if
	// the activity let the child place it (ticket 14).
	const moonGeocentric = placedMoonGeocentricAu(state, instant);
	const moonCentre = add(earthHeliocentricPositionAu(instant), moonGeocentric);
	const { altitudeDeg, azimuthDeg } = pointAltitudeAzimuthDeg(observer, moonCentre, instant);
	const phase = moonPhase(instant, moonGeocentric);

	const limbAngleDeg =
		(Math.atan2(
			sun.altitudeDeg - altitudeDeg,
			shortestAngleDeg(azimuthDeg, sun.azimuthDeg)
		) *
			180) /
		Math.PI;

	return {
		altitudeDeg,
		azimuthDeg,
		illuminatedFraction: phase.illuminatedFraction,
		phaseAngleDeg: phase.phaseAngleDeg,
		waxing: phase.waxing,
		angularDiameterDeg: moonAngularDiameterDeg(instant, moonGeocentric),
		apparentMagnitude: moonApparentMagnitude(instant, moonGeocentric),
		litLimbAngleDeg: limbAngleDeg,
		eclipse: null
	};
}

/**
 * Fill in the night-sky half of a POV entry. `scene.ts` applies this once per
 * observer; the base contributor keeps its own above-the-horizon pass, which
 * this one owns from here on.
 */
export function withNightSky(entry: SceneObserver, state: SessionState): SceneObserver {
	return {
		...entry,
		visibleBodies: visibleBodiesFor(state, entry.observer),
		visibilityLimit: visibilityLimitEnabled(state),
		moon: lunarEclipseFor(
			state,
			moonFor(entry.observer, state, {
				altitudeDeg: entry.sunElevationDeg,
				azimuthDeg: entry.sunAzimuthDeg
			})
		)
	};
}

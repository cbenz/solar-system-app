/**
 * The sandbox workbench: edited orbits, editable masses, and the draggable Sun.
 *
 * ADR-0007 makes the orbit a consequence. This module never stores an element
 * set: it stores the **state vector** a body was last given, at the instant it
 * was given it, and derives the conic (`orbit.ts`) whenever a position is
 * needed. That is what keeps scrubbing reversible after an edit — the scene is
 * still a pure function of the instant, in both directions.
 *
 * Two units cross this seam. Mass is kilograms, distance is AU, and speed is
 * kilometres per second, because that is what a slider can show. Internally
 * everything is AU and AU/day.
 *
 * ## The conventions this module fixes
 *
 * **An edit restarts the orbit's phase at the current instant.** The body keeps
 * the position it had at the moment of the edit — it never teleports — and its
 * velocity is what the edited parameter implies. New elements are derived from
 * that vector, with the edit instant as epoch.
 *
 * **A body dropped with no velocity starts circular at the drop radius.** This
 * is the ADR-0007 convention chosen here (the other allowed one is "keeps its
 * previous velocity"). A velocity-free drop has no defined orbit; circular is
 * the deterministic, easy-to-read answer, and it is the same at every drop
 * radius: the body stays at that distance and goes round.
 *
 * Only the sandbox reads any of it: `bodyPositionAu` ignores the workbench
 * outside sandbox mode, so an activity never sees an edited orbit.
 */

import { MS_PER_DAY } from './time';
import {
	AU_KM,
	AU_PER_DAY_TO_KM_PER_S,
	EARTH_MASS_KG,
	MOON_MASS_KG,
	SUN_MASS_KG,
	escapeSpeedAtRadius,
	gravitationalParameter,
	orbitFromStateVector,
	positionAtElapsed,
	speedAtRadius,
	stateVectorAtElapsed,
	type ConicOrbit
} from './orbit';
import {
	add,
	earthHeliocentricPositionAu,
	length,
	moonGeocentricPositionAu,
	planetHeliocentricPositionAu,
	scale,
	subtract,
	unit
} from './ephemeris';
import { primaryOf } from './distortion';
import type { BodyId, Instant, SandboxOrbit, SessionState, Vec3 } from './types';

/** The published masses, in kilograms, used until the child edits one. */
export const DEFAULT_MASS_KG: Record<BodyId, number> = {
	sun: SUN_MASS_KG,
	mercury: 3.3011e23,
	venus: 4.8675e24,
	earth: EARTH_MASS_KG,
	moon: MOON_MASS_KG,
	mars: 6.4171e23,
	jupiter: 1.8982e27,
	saturn: 5.6834e26,
	uranus: 8.681e25,
	neptune: 1.02413e26
};

/** The central-difference step used to read the ephemeris' velocity, in days. */
const VELOCITY_STEP_DAYS = 1e-3;

/** The three editable parameters, in the units the card shows. */
export type SandboxParameter = 'mass' | 'distance' | 'speed';

export type BodyParameters = {
	massKg: number;
	/** Semi-major axis in AU, or `null` for the Sun and an unbound conic. */
	distanceAu: number | null;
	/** Instantaneous speed in km/s, or `null` for the Sun. */
	speedKmPerS: number | null;
	/** `null` when the conic does not close. */
	periodDays: number | null;
	escaped: boolean;
};

export type ParameterLimit = {
	min: number;
	max: number;
	step: number;
	/** A mass spans ten orders of magnitude; its slider is logarithmic. */
	scale: 'linear' | 'log';
};

export type BodyParameterLimits = Record<SandboxParameter, ParameterLimit>;

/** One body's orbit relative to its primary, at one instant. */
export type RelativeOrbitState = {
	orbit: ConicOrbit;
	mu: number;
	epochInstant: Instant;
	position: Vec3;
	velocity: Vec3;
};

function absolute(vector: Vec3): number {
	return length(vector);
}

/** The mass the session uses for a body, editing override included. */
export function massOf(state: SessionState, bodyId: BodyId): number {
	return state.sandbox.masses[bodyId] ?? DEFAULT_MASS_KG[bodyId];
}

/** The gravitational parameter of the pair `bodyId` orbits, in AU³/day². */
export function muFor(state: SessionState, bodyId: BodyId): number {
	const primary = primaryOf(bodyId);
	if (primary === null) return gravitationalParameter(SUN_MASS_KG, massOf(state, bodyId));
	return gravitationalParameter(massOf(state, primary), massOf(state, bodyId));
}

/** The body's position from the ephemeris, relative to its primary. */
export function ephemerisRelativePositionAu(bodyId: BodyId, instant: Instant): Vec3 {
	if (bodyId === 'earth') return earthHeliocentricPositionAu(instant);
	if (bodyId === 'moon') return moonGeocentricPositionAu(instant);
	if (bodyId === 'sun') return { x: 0, y: 0, z: 0 };
	return planetHeliocentricPositionAu(bodyId, instant);
}

/** The stored epoch, or `null` when the body is still the ephemeris. */
export function storedOrbit(state: SessionState, bodyId: BodyId): SandboxOrbit | null {
	return state.sandbox.orbits[bodyId] ?? null;
}

/**
 * The body's position relative to its primary at an instant. Edited bodies
 * propagate their stored state vector; every other body reads the ephemeris.
 */
export function relativePositionAu(state: SessionState, bodyId: BodyId, instant: Instant): Vec3 {
	const stored = storedOrbit(state, bodyId);
	if (stored === null) return ephemerisRelativePositionAu(bodyId, instant);

	const mu = muFor(state, bodyId);
	const orbit = orbitFromStateVector({ ...stored, mu });
	return positionAtElapsed(orbit, mu, (instant - stored.epochInstant) / MS_PER_DAY);
}

/**
 * The body's orbit and state vector at an instant. For an unedited body the
 * velocity comes from a central difference of the ephemeris, which is enough
 * for a sandbox and never touches the stored state.
 */
export function relativeOrbitState(
	state: SessionState,
	bodyId: BodyId,
	instant: Instant
): RelativeOrbitState | null {
	if (bodyId === 'sun') return null;

	const mu = muFor(state, bodyId);
	const stored = storedOrbit(state, bodyId);

	if (stored !== null) {
		const orbit = orbitFromStateVector({ ...stored, mu });
		const elapsed = (instant - stored.epochInstant) / MS_PER_DAY;
		const vector = stateVectorAtElapsed(orbit, mu, elapsed);
		return {
			orbit,
			mu,
			epochInstant: stored.epochInstant,
			position: vector.position,
			velocity: vector.velocity
		};
	}

	const step = VELOCITY_STEP_DAYS * MS_PER_DAY;
	const position = ephemerisRelativePositionAu(bodyId, instant);
	const before = ephemerisRelativePositionAu(bodyId, instant - step);
	const after = ephemerisRelativePositionAu(bodyId, instant + step);
	const velocity = scale(subtract(after, before), 1 / (2 * VELOCITY_STEP_DAYS));
	const orbit = orbitFromStateVector({ position, velocity, mu });

	return { orbit, mu, epochInstant: instant, position, velocity };
}

/**
 * Heliocentric position in the sandbox, edited orbits included. The Sun is at
 * its draggable position; a body whose primary is not the Sun adds its primary's
 * position, so the Moon rides on an edited Earth.
 */
export function bodyPositionAu(state: SessionState, bodyId: BodyId, instant: Instant): Vec3 {
	if (bodyId === 'sun') return state.sandbox.sunPositionAu;

	const relative = relativePositionAu(state, bodyId, instant);
	const primary = primaryOf(bodyId);
	if (primary === null || primary === 'sun') return relative;

	return add(bodyPositionAu(state, primary, instant), relative);
}

/** The slider ranges the properties card offers, in its display units. */
export function bodyParameterLimits(bodyId: BodyId): BodyParameterLimits {
	const distance =
		bodyId === 'moon'
			? { min: 5e-4, max: 0.05, step: 1e-5, scale: 'linear' as const }
			: { min: 0.1, max: 20, step: 0.01, scale: 'linear' as const };

	const speed =
		bodyId === 'moon'
			? { min: 0.01, max: 10, step: 0.01, scale: 'linear' as const }
			: { min: 0.01, max: 120, step: 0.01, scale: 'linear' as const };

	return {
		mass: { min: 1e20, max: 1e32, step: 1, scale: 'log' },
		distance,
		speed
	};
}

/** The speed that leaves the body's current orbit, in km/s. */
export function escapeSpeedKmPerS(state: SessionState, bodyId: BodyId): number {
	const relative = relativeOrbitState(state, bodyId, state.instant);
	if (relative === null) return 0;
	return (
		escapeSpeedAtRadius(relative.mu, absolute(relative.position)) *
		AU_PER_DAY_TO_KM_PER_S
	);
}

/** Exposed for the properties card's "period" line and for tests. */
export function orbitPeriodDays(state: SessionState, bodyId: BodyId): number | null {
	return relativeOrbitState(state, bodyId, state.instant)?.orbit.periodDays ?? null;
}

/** Exposed for tests: the speed the body would need to leave, in AU/day. */
export function circularSpeedAuPerDay(state: SessionState, bodyId: BodyId): number {
	const relative = relativeOrbitState(state, bodyId, state.instant);
	if (relative === null) return 0;
	return speedAtRadius(relative.orbit, relative.mu, absolute(relative.position));
}

export { AU_KM };

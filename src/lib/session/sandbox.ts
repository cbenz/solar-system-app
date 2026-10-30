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
	scale,
	subtract,
	unit
} from './ephemeris';
import { primaryOf } from './scale';
import type { BodyId, Instant, SandboxOrbit, SessionState, Vec3 } from './types';

/** The published masses, in kilograms, used until the child edits one. */
export const DEFAULT_MASS_KG: Record<BodyId, number> = {
	sun: SUN_MASS_KG,
	earth: EARTH_MASS_KG,
	moon: MOON_MASS_KG
};

/** How long "never comes back" is checked for when marking a body escaped. */
export const ESCAPE_HORIZON_DAYS = 3650;

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
	return { x: 0, y: 0, z: 0 };
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

/** What the properties card shows. All of it is derived, never stored. */
export function bodyParameters(state: SessionState, bodyId: BodyId): BodyParameters {
	const massKg = massOf(state, bodyId);

	if (bodyId === 'sun') {
		return {
			massKg,
			distanceAu: null,
			speedKmPerS: null,
			periodDays: null,
			escaped: false
		};
	}

	const relative = relativeOrbitState(state, bodyId, state.instant);
	if (relative === null) {
		return { massKg, distanceAu: null, speedKmPerS: null, periodDays: null, escaped: false };
	}

	return {
		massKg,
		distanceAu:
			relative.orbit.kind === 'parabola'
				? null
				: Math.abs(relative.orbit.semiMajorAxisAu),
		speedKmPerS: absolute(relative.velocity) * AU_PER_DAY_TO_KM_PER_S,
		periodDays: relative.orbit.periodDays,
		escaped: hasEscaped(state, bodyId)
	};
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

/**
 * Whether the body has left its primary and will not come back inside
 * `horizonDays`. An unbound conic is required, and the distance must never
 * decrease: a hyperbola whose periapsis is still ahead of it has not escaped yet.
 */
export function hasEscaped(
	state: SessionState,
	bodyId: BodyId,
	horizonDays = ESCAPE_HORIZON_DAYS
): boolean {
	if (state.mode !== 'sandbox') return false;
	if (storedOrbit(state, bodyId) === null) return false;

	const relative = relativeOrbitState(state, bodyId, state.instant);
	if (relative === null || relative.orbit.kind === 'ellipse') return false;

	const elapsedNow = (state.instant - relative.epochInstant) / MS_PER_DAY;
	const samples = 64;
	let previous = absolute(relative.position);

	for (let index = 1; index <= samples; index += 1) {
		const elapsed = elapsedNow + (horizonDays * index) / samples;
		const distance = absolute(positionAtElapsed(relative.orbit, relative.mu, elapsed));
		if (distance < previous - 1e-12) return false;
		previous = distance;
	}

	return true;
}

/** The future track of an escaped body, heliocentric, for the renderer to draw. */
export function escapedTrack(
	state: SessionState,
	bodyId: BodyId,
	horizonDays = ESCAPE_HORIZON_DAYS
): Vec3[] {
	if (!hasEscaped(state, bodyId, horizonDays)) return [];

	const relative = relativeOrbitState(state, bodyId, state.instant);
	if (relative === null) return [];

	const primary = primaryOf(bodyId);
	const anchor =
		primary === null || primary === 'sun'
			? state.sandbox.sunPositionAu
			: bodyPositionAu(state, primary, state.instant);
	const elapsedNow = (state.instant - relative.epochInstant) / MS_PER_DAY;
	const samples = 48;

	const track: Vec3[] = [];
	for (let index = 1; index <= samples; index += 1) {
		const elapsed = elapsedNow + (horizonDays * index) / samples;
		track.push(add(anchor, positionAtElapsed(relative.orbit, relative.mu, elapsed)));
	}
	return track;
}

/**
 * The unit vector from the Earth toward the Sun: the direction every light in
 * the scene comes from (ADR-0002, ADR-0004 rule 2). Moving the Sun in the
 * sandbox changes it; nothing else can.
 */
export function sunDirectionFromEarth(state: SessionState): Vec3 {
	const sun = bodyPositionAu(state, 'sun', state.instant);
	const earth = bodyPositionAu(state, 'earth', state.instant);
	return unit(subtract(sun, earth));
}

/** The transverse (prograde) unit direction at a position and velocity. */
function transverseDirection(position: Vec3, velocity: Vec3): Vec3 {
	const h = {
		x: position.y * velocity.z - position.z * velocity.y,
		y: position.z * velocity.x - position.x * velocity.z,
		z: position.x * velocity.y - position.y * velocity.x
	};
	const transverse = {
		x: h.y * position.z - h.z * position.y,
		y: h.z * position.x - h.x * position.z,
		z: h.x * position.y - h.y * position.x
	};

	if (length(transverse) > 1e-15) return unit(transverse);

	// Radial motion has no orbital plane yet: any perpendicular will do, and the
	// result is still deterministic.
	const fallback =
		Math.abs(position.z) < 0.9 * Math.abs(position.x)
			? { x: 0, y: 0, z: 1 }
			: { x: 1, y: 0, z: 0 };
	const hFallback = {
		x: position.y * fallback.z - position.z * fallback.y,
		y: position.z * fallback.x - position.x * fallback.z,
		z: position.x * fallback.y - position.y * fallback.x
	};
	return unit(hFallback);
}

function sameOrbit(a: SandboxOrbit, b: SandboxOrbit): boolean {
	return (
		a.epochInstant === b.epochInstant &&
		a.position.x === b.position.x &&
		a.position.y === b.position.y &&
		a.position.z === b.position.z &&
		a.velocity.x === b.velocity.x &&
		a.velocity.y === b.velocity.y &&
		a.velocity.z === b.velocity.z
	);
}

function sameMasses(
	a: Partial<Record<BodyId, number>>,
	b: Partial<Record<BodyId, number>>
): boolean {
	return (Object.keys(DEFAULT_MASS_KG) as BodyId[]).every((id) => a[id] === b[id]);
}

/**
 * Re-materialise every stored orbit at the current instant with the current
 * masses, so a mass edit that changes a primary cannot move a child.
 */
function rematerialise(state: SessionState): Partial<Record<BodyId, SandboxOrbit>> {
	const orbits: Partial<Record<BodyId, SandboxOrbit>> = {};

	for (const bodyId of Object.keys(state.sandbox.orbits) as BodyId[]) {
		const relative = relativeOrbitState(state, bodyId, state.instant);
		if (relative === null) continue;
		orbits[bodyId] = {
			position: relative.position,
			velocity: relative.velocity,
			epochInstant: state.instant
		};
	}

	return orbits;
}

/**
 * Apply one edited parameter and derive the new orbit from the resulting state
 * vector. Returns the state unchanged when the value is not a positive finite
 * number, when the pencil is not pressed, or when the requested semi-major axis
 * is impossible at the body's current radius.
 */
export function setBodyParameter(
	state: SessionState,
	bodyId: BodyId,
	parameter: SandboxParameter,
	value: number
): SessionState {
	if (state.mode !== 'sandbox') return state;
	if (state.sandbox.editBaseline === null) return state;
	if (!Number.isFinite(value) || value <= 0) return state;
	if (bodyId === 'sun' && parameter !== 'mass') return state;

	const current = bodyId === 'sun' ? null : relativeOrbitState(state, bodyId, state.instant);
	if (bodyId !== 'sun' && current === null) return state;

	const masses: Partial<Record<BodyId, number>> = {
		...state.sandbox.masses,
		...(parameter === 'mass' ? { [bodyId]: value } : {})
	};
	const nextMassesState: SessionState = {
		...state,
		sandbox: { ...state.sandbox, masses }
	};
	const mu = bodyId === 'sun' ? 0 : muFor(nextMassesState, bodyId);

	const position = current?.position ?? { x: 0, y: 0, z: 0 };
	const radius = absolute(position);

	let velocity = current?.velocity ?? { x: 0, y: 0, z: 0 };

	if (parameter === 'distance' && current !== null) {
		// The child asks for a semi-major axis while the body stays where it is:
		// only the velocity changes, so the position is continuous.
		if (value <= radius / 2) return state;
		const speed = Math.sqrt(mu * (2 / radius - 1 / value));
		velocity = scale(transverseDirection(position, current.velocity), speed);
	} else if (parameter === 'speed' && current !== null) {
		const speed = value / AU_PER_DAY_TO_KM_PER_S;
		const direction =
			absolute(current.velocity) > 0
				? unit(current.velocity)
				: transverseDirection(position, current.velocity);
		velocity = scale(direction, speed);
	}

	const orbits: Partial<Record<BodyId, SandboxOrbit>> = { ...state.sandbox.orbits };

	if (bodyId !== 'sun') {
		orbits[bodyId] = {
			position,
			velocity,
			epochInstant: state.instant
		};
	}

	// A mass edit changes the parameter of every child's primary. Keep those
	// children where they are: re-derive their vectors at this instant first.
	// Children that were still on the ephemeris are materialised too, so a mass
	// edit visibly changes their orbit instead of nothing.
	if (parameter === 'mass') {
		const rewritten = rematerialise(state);
		for (const [id, stored] of Object.entries(rewritten) as [BodyId, SandboxOrbit][]) {
			if (id === bodyId) continue;
			orbits[id] = stored;
		}

		for (const id of Object.keys(DEFAULT_MASS_KG) as BodyId[]) {
			if (id === bodyId || primaryOf(id) !== bodyId) continue;
			const child = relativeOrbitState(state, id, state.instant);
			if (child === null) continue;
			orbits[id] = {
				position: child.position,
				velocity: child.velocity,
				epochInstant: state.instant
			};
		}
	}

	const stored = state.sandbox.orbits[bodyId];
	if (
		bodyId !== 'sun' &&
		stored !== undefined &&
		orbits[bodyId] !== undefined &&
		sameOrbit(stored, orbits[bodyId]) &&
		sameMasses(state.sandbox.masses, masses)
	) {
		return state;
	}

	if (bodyId === 'sun' && sameMasses(state.sandbox.masses, masses)) return state;

	return { ...state, sandbox: { ...state.sandbox, masses, orbits } };
}

/**
 * Drop a body at a position relative to its primary. A `null` velocity (or a
 * zero one) follows the documented convention: **circular at the drop radius**.
 * Any other velocity gives the conic that vector describes.
 */
export function dropBody(
	state: SessionState,
	bodyId: BodyId,
	position: Vec3,
	velocity: Vec3 | null
): SessionState {
	if (state.mode !== 'sandbox') return state;
	if (bodyId === 'sun') return state;
	if (
		!Number.isFinite(position.x) ||
		!Number.isFinite(position.y) ||
		!Number.isFinite(position.z)
	) {
		return state;
	}

	const radius = absolute(position);
	if (!(radius > 0)) return state;

	const mu = muFor(state, bodyId);
	let nextVelocity: Vec3;

	if (velocity === null || absolute(velocity) < 1e-15) {
		// The convention: dropped at rest, the body goes round at that radius.
		nextVelocity = scale(
			transverseDirection(position, { x: 0, y: 0, z: 1 }),
			Math.sqrt(mu / radius)
		);
	} else {
		if (
			!Number.isFinite(velocity.x) ||
			!Number.isFinite(velocity.y) ||
			!Number.isFinite(velocity.z)
		) {
			return state;
		}
		nextVelocity = velocity;
	}

	return {
		...state,
		sandbox: {
			...state.sandbox,
			orbits: {
				...state.sandbox.orbits,
				[bodyId]: {
					position,
					velocity: nextVelocity,
					epochInstant: state.instant
				}
			}
		}
	};
}

/** Move the Sun. Sandbox only: inside an activity the Sun is the fixed light. */
export function moveSun(state: SessionState, position: Vec3): SessionState {
	if (state.mode !== 'sandbox') return state;
	if (
		!Number.isFinite(position.x) ||
		!Number.isFinite(position.y) ||
		!Number.isFinite(position.z)
	) {
		return state;
	}

	const current = state.sandbox.sunPositionAu;
	if (current.x === position.x && current.y === position.y && current.z === position.z) {
		return state;
	}

	return { ...state, sandbox: { ...state.sandbox, sunPositionAu: position } };
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

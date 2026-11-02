/**
 * Parameter editing and undo: the pencil's live changes and the drag's drops.
 *
 * The orbit is a consequence (ADR-0007): an edit restarts the phase at the
 * current instant from the state vector the new parameter implies, and a drop
 * with no velocity starts circular at the drop radius.
 */

import { MS_PER_DAY } from './time';
import { AU_PER_DAY_TO_KM_PER_S } from './orbit';
import { length, scale, unit } from './ephemeris';
import { primaryOf } from './distortion';
import {
	DEFAULT_MASS_KG,
	muFor,
	relativeOrbitState
} from './sandbox-orbit';
import type { BodyId, SandboxOrbit, SessionState, Vec3 } from './types';
import type { SandboxParameter } from './sandbox-orbit';

function absolute(vector: Vec3): number {
	return length(vector);
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


/**
 * Escape tracking: whether an edited body has left its primary for good, and
 * the future track the renderer draws so the departure is visible.
 */

import { MS_PER_DAY } from './time';
import { AU_PER_DAY_TO_KM_PER_S, positionAtElapsed } from './orbit';
import { add, length } from './ephemeris';
import { primaryOf } from './distortion';
import {
	bodyPositionAu,
	massOf,
	relativeOrbitState,
	storedOrbit
} from './sandbox-orbit';
import type { BodyId, SessionState, Vec3 } from './types';
import type { BodyParameters } from './sandbox-orbit';

/** How long "never comes back" is checked for when marking a body escaped. */
export const ESCAPE_HORIZON_DAYS = 3650;

function absolute(vector: Vec3): number {
	return length(vector);
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


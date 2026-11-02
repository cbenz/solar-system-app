/**
 * The Sun in the sandbox: the only light source, and the one body the child may
 * drag (ADR-0004 rule 2). The lighting follows it; inside an activity it is
 * fixed.
 */

import { subtract, unit } from './ephemeris';
import { bodyPositionAu } from './sandbox-orbit';
import type { SessionState, Vec3 } from './types';

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


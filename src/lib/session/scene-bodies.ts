/**
 * Scene bodies, one contributor per body.
 *
 * Add a body by adding a contributor to `BODY_CONTRIBUTORS` in its own file and
 * extending `BodyId`; no other ticket's contributor needs to change. A
 * contributor returns `null` when the body is outside the subsystem, which is
 * exactly the invariant "making the subsystem smaller never moves a body that
 * is still present": positions never read the subsystem.
 */

import { earthHeliocentricPositionAu, moonHeliocentricPositionAu } from './ephemeris';
import { bodyScale } from './scale';
import type { BodyId, SessionState, Vec3 } from './types';

export type BodyContributor = (state: SessionState) => {
	id: BodyId;
	position: Vec3;
	distanceFactor: number;
	radiusFactor: number;
} | null;

/**
 * Positions stay true in the snapshot; the two scale factors ride along and the
 * renderer multiplies by them. Nothing is distorted here, so turning a scale
 * switch cannot move a body in the snapshot — it only changes a factor
 * (ADR-0003, `scale.ts`).
 */
function drawnBody(state: SessionState, id: BodyId, position: Vec3) {
	const { distanceFactor, radiusFactor } = bodyScale(state.trueDistance, state.trueSize, id);
	return { id, position, distanceFactor, radiusFactor };
}

function inSubsystem(state: SessionState, id: BodyId): boolean {
	return state.subsystem.includes(id);
}

export const BODY_CONTRIBUTORS: readonly BodyContributor[] = [
	(state) =>
		inSubsystem(state, 'sun') ? drawnBody(state, 'sun', { x: 0, y: 0, z: 0 }) : null,
	(state) =>
		inSubsystem(state, 'earth')
			? drawnBody(state, 'earth', earthHeliocentricPositionAu(state.instant))
			: null,
	(state) =>
		inSubsystem(state, 'moon')
			? drawnBody(state, 'moon', moonHeliocentricPositionAu(state.instant))
			: null
];

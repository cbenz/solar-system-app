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
import type { BodyId, SessionState, Vec3 } from './types';

export type BodyContributor = (state: SessionState) => { id: BodyId; position: Vec3 } | null;

function inSubsystem(state: SessionState, id: BodyId): boolean {
	return state.subsystem.includes(id);
}

export const BODY_CONTRIBUTORS: readonly BodyContributor[] = [
	(state) => (inSubsystem(state, 'sun') ? { id: 'sun', position: { x: 0, y: 0, z: 0 } } : null),
	(state) =>
		inSubsystem(state, 'earth')
			? { id: 'earth', position: earthHeliocentricPositionAu(state.instant) }
			: null,
	(state) =>
		inSubsystem(state, 'moon')
			? { id: 'moon', position: moonHeliocentricPositionAu(state.instant) }
			: null
];

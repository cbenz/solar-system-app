/**
 * Scene bodies, one contributor per body.
 *
 * Add a body by adding a contributor to `BODY_CONTRIBUTORS` in its own file and
 * extending `BodyId`; no other ticket's contributor needs to change. A
 * contributor returns `null` when the body is outside the subsystem, which is
 * exactly the invariant "making the subsystem smaller never moves a body that
 * is still present": positions never read the subsystem.
 *
 * In the sandbox a body's position comes from the workbench (`sandbox.ts`), so
 * an edited orbit is drawn; outside it the ephemeris is the only source, which
 * is why an activity never sees an edit. The `escaped` flag and its track are
 * sandbox-only for the same reason.
 */

import {
	earthHeliocentricPositionAu,
	moonHeliocentricPositionAu
} from './ephemeris';
import {
	bodyPositionAu,
	escapedTrack,
	hasEscaped
} from './sandbox';
import { bodyScale } from './scale';
import type { BodyId, SessionState, Vec3 } from './types';

export type BodyContributor = (state: SessionState) => {
	id: BodyId;
	position: Vec3;
	distanceFactor: number;
	radiusFactor: number;
	escaped: boolean;
	track: Vec3[];
} | null;

/**
 * Positions stay true in the snapshot; the two scale factors ride along and the
 * renderer multiplies by them. Nothing is distorted here, so turning a scale
 * switch cannot move a body in the snapshot — it only changes a factor
 * (ADR-0003, `scale.ts`).
 */
function drawnBody(state: SessionState, id: BodyId, position: Vec3) {
	const { distanceFactor, radiusFactor } = bodyScale(state.trueDistance, state.trueSize, id);
	const sandbox = state.mode === 'sandbox';

	return {
		id,
		position,
		distanceFactor,
		radiusFactor,
		escaped: sandbox ? hasEscaped(state, id) : false,
		track: sandbox ? escapedTrack(state, id) : []
	};
}

function inSubsystem(state: SessionState, id: BodyId): boolean {
	return state.subsystem.includes(id);
}

function sandboxPosition(state: SessionState, id: BodyId): Vec3 {
	return bodyPositionAu(state, id, state.instant);
}

export const BODY_CONTRIBUTORS: readonly BodyContributor[] = [
	(state) =>
		inSubsystem(state, 'sun')
			? drawnBody(
					state,
					'sun',
					state.mode === 'sandbox' ? sandboxPosition(state, 'sun') : { x: 0, y: 0, z: 0 }
				)
			: null,
	(state) =>
		inSubsystem(state, 'earth')
			? drawnBody(
					state,
					'earth',
					state.mode === 'sandbox'
						? sandboxPosition(state, 'earth')
						: earthHeliocentricPositionAu(state.instant)
				)
			: null,
	(state) =>
		inSubsystem(state, 'moon')
			? drawnBody(
					state,
					'moon',
					state.mode === 'sandbox'
						? sandboxPosition(state, 'moon')
						: moonHeliocentricPositionAu(state.instant)
				)
			: null
];

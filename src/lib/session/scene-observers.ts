/**
 * Scene observers, one contributor per concern.
 *
 * Sun elevation and daylight come from the same dot product the globe mesh is
 * shaded with (ASTRONOMY.md §4), so the POV panel and the terminator cannot
 * disagree. Ticket 16 (night sky) appends its own contributor — a magnitude and
 * visibility-limit pass that narrows `visibleBodies` — without editing this one.
 */

import {
	bodyCenterAu,
	elevationOfPointDeg,
	isDaylight,
	observerNormal,
	sunAzimuthDeg,
	sunElevationDeg
} from './observers';
import type { BodyId, SceneObserver, SessionState } from './types';

export type ObserverContributor = (state: SessionState) => SceneObserver[];

/** Bodies above the observer's horizon, excluding the body they stand on. */
function visibleBodies(state: SessionState, observer: SceneObserver['observer']): BodyId[] {
	return state.subsystem.filter((id) => {
		if (id === observer.bodyId) return false;
		const elevation = elevationOfPointDeg(observer, bodyCenterAu(id, state.instant), state.instant);
		return elevation > 0;
	});
}

export const OBSERVER_CONTRIBUTORS: readonly ObserverContributor[] = [
	(state) =>
		state.observers.map((observer) => ({
			observer,
			sunElevationDeg:
				observer.bodyId === 'earth' ? sunElevationDeg(observer, state.instant) : 0,
			sunAzimuthDeg: observer.bodyId === 'earth' ? sunAzimuthDeg(observer, state.instant) : 0,
			daylight: observer.bodyId === 'earth' ? isDaylight(observer, state.instant) : false,
			surfaceNormal: observerNormal(observer, state.instant),
			visibleBodies: visibleBodies(state, observer)
		}))
];

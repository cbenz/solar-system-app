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
import { currentActivity } from './camera';
import { tiltDegFromSettings } from './seasons';
import { MAX_SHADOW_LENGTH_FACTOR, shadowGeometry } from './shadow';
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
	(state) => {
		// The activity's tilt reaches the same geometry the terminator uses. With
		// no `tilt` setting this is the model's obliquity, so nothing changes.
		const tiltDeg = tiltDegFromSettings(state.settings);
		const gnomon = currentActivity(state)?.gnomon === true;

		return state.observers.map((observer) => ({
			observer,
			sunElevationDeg:
				observer.bodyId === 'earth' ? sunElevationDeg(observer, state.instant, tiltDeg) : 0,
			sunAzimuthDeg:
				observer.bodyId === 'earth' ? sunAzimuthDeg(observer, state.instant, tiltDeg) : 0,
			daylight:
				observer.bodyId === 'earth' ? isDaylight(observer, state.instant, tiltDeg) : false,
			surfaceNormal: observerNormal(observer, state.instant, tiltDeg),
			visibleBodies: visibleBodies(state, observer),
			// Filled by the night-sky pass in `scene.ts` (ticket 16).
			visibilityLimit: false,
			moon: null,
			// Filled by the eclipse pass in `scene.ts` (ticket 14).
			eclipse: { kind: 'none', darkening: 0 },
			gnomon,
			// The gnomon (ticket 12). Only the Earth has a ground in the model; a
			// body with no ground casts no shadow, which the null azimuth says.
			shadow:
				observer.bodyId === 'earth'
					? shadowGeometry(observer.latitudeDeg, state.instant, tiltDeg)
					: {
							sunElevationDeg: 0,
							shadowLengthFactor: MAX_SHADOW_LENGTH_FACTOR,
							shadowAzimuthDeg: null
						}
		}));
	}
];

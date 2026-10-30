/**
 * State → scene. The snapshot is derived, never stored: positions are a pure
 * function of the instant, which is what makes scrubbing reversible.
 */

import { sceneMission } from './missions';
import { withNightSky } from './night-sky';
import { BODY_CONTRIBUTORS } from './scene-bodies';
import { OBSERVER_CONTRIBUTORS } from './scene-observers';
import { markersFor } from './scene-markers';
import { circlesFor } from './circles';
import type { SceneSnapshot, SessionState } from './types';

export function buildScene(state: SessionState): SceneSnapshot {
	const bodies = BODY_CONTRIBUTORS.flatMap((contributor) => {
		const body = contributor(state);
		return body === null ? [] : [body];
	});

	// The night-sky pass owns the visibility limit and the Moon per POV (ticket 16).
	const observers = OBSERVER_CONTRIBUTORS.flatMap((contributor) => contributor(state)).map(
		(entry) => withNightSky(entry, state)
	);

	return {
		bodies,
		observers,
		markers: markersFor(state),
		circles: circlesFor(state),
		camera: state.camera,
		mission: sceneMission(state)
	};
}

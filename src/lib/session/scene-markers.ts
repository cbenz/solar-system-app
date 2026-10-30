/**
 * Activity markers in the scene snapshot.
 *
 * A marker belongs to a body of its activity's subsystem. Markers are part of
 * the sandbox only: once an activity is open, its own toolbar is the chrome and
 * the markers would cover the phenomenon.
 */

import type { SceneMarker, SessionState } from './types';

export function markersFor(state: SessionState): SceneMarker[] {
	if (state.mode === 'activity') return [];

	const present = new Set(state.subsystem);
	return state.activities.flatMap((activity) =>
		activity.subsystem
			.filter((bodyId) => present.has(bodyId))
			.map((bodyId) => ({ activityId: activity.id, bodyId }))
	);
}

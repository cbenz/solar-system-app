/**
 * The latitude circles a snapshot draws on the Earth.
 *
 * The Equator is drawn in every mode (ticket 06). An activity adds the circles
 * its phenomenon needs by declaring `latitudeCircles` (ticket 11): the session
 * resolves the open activity here, so the renderer never has to know which
 * activity is running. Leaving the activity drops the extra circles with it.
 */

import { currentActivity } from './camera';
import type { SceneCircle, SessionState } from './types';

export const EQUATOR_CIRCLE_ID = 'equator';

export function circlesFor(state: SessionState): SceneCircle[] {
	const circles: SceneCircle[] = [
		{ id: EQUATOR_CIRCLE_ID, latitudeDeg: 0, kind: 'equator' }
	];

	const activity = currentActivity(state);
	for (const declared of activity?.latitudeCircles ?? []) {
		circles.push({
			id: declared.id,
			latitudeDeg: declared.latitudeDeg,
			kind: 'activity'
		});
	}

	return circles;
}

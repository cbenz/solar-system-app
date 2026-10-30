/**
 * `set-camera` and `select-camera-preset`.
 *
 * A gesture sends the camera it would like; the session answers with the camera
 * the child is allowed to have (`clampCamera`). The toolbar sends a preset id;
 * the session looks up the activity's declaration rather than trusting the
 * component with a distance.
 */

import { cameraForPreset, clampCamera, currentActivity } from '../camera';
import type { SessionEvent, SessionState } from '../types';

function sameCamera(a: SessionState['camera'], b: SessionState['camera']): boolean {
	return a.distance === b.distance && a.pitch === b.pitch;
}

export function handleCamera(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type === 'set-camera') {
		const camera = clampCamera(state, event.camera);
		if (sameCamera(camera, state.camera)) return state;
		return { ...state, camera };
	}

	if (event.type === 'select-camera-preset') {
		const activity = currentActivity(state);
		if (activity === undefined) return state;

		const preset = activity.cameraPresets.find((candidate) => candidate.id === event.presetId);
		if (preset === undefined) return state;

		const camera = cameraForPreset(preset);
		if (sameCamera(camera, state.camera)) return state;
		return { ...state, camera };
	}

	return null;
}

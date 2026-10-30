/**
 * Camera state and the zoom clamp.
 *
 * The renderer never decides how far the camera may go: it asks `clampCamera`
 * for a camera and uses the answer. In the sandbox the zoom is free inside the
 * physical range; inside an activity it is clamped to the interval spanned by
 * the activity's declared camera presets, so the child cannot leave the views
 * the activity chose.
 *
 * The physical bounds live in `$lib/scene/view` and are pure numbers with no
 * Three.js import.
 */

import { MAX_CAMERA_DISTANCE, MAX_PITCH, MIN_CAMERA_DISTANCE, clampPitch } from '$lib/scene/view';
import type { Activity } from '../../activities/types';
import type { CameraState, SessionState } from './types';

export const DEFAULT_CAMERA: CameraState = { distance: 3.2, pitch: 0.1 };

/** The activity currently open, if any, resolved from the state's catalogue. */
export function currentActivity(state: SessionState): Activity | undefined {
	if (state.activityId === null) return undefined;
	return state.activities.find((activity) => activity.id === state.activityId);
}

function finiteOr(value: number, fallback: number): number {
	return Number.isFinite(value) ? value : fallback;
}

function physicalCamera(requested: CameraState): CameraState {
	return {
		distance: Math.min(
			MAX_CAMERA_DISTANCE,
			Math.max(MIN_CAMERA_DISTANCE, finiteOr(requested.distance, DEFAULT_CAMERA.distance))
		),
		pitch: clampPitch(finiteOr(requested.pitch, DEFAULT_CAMERA.pitch))
	};
}

/**
 * The pure zoom clamp.
 *
 * In an activity the allowed distances are the closed interval between the
 * nearest and furthest declared preset. Asking for a distance outside that
 * interval is refused: the camera stays at the boundary, which is a declared
 * preset. In the sandbox only the physical bounds apply, so a distance that the
 * activity would refuse is free.
 */
export function clampCamera(state: Pick<SessionState, 'mode' | 'activityId' | 'activities'>, requested: CameraState): CameraState {
	const physical = physicalCamera(requested);
	if (state.mode !== 'activity') return physical;

	const activity = state.activities.find((candidate) => candidate.id === state.activityId);
	if (activity === undefined || activity.cameraPresets.length === 0) return physical;

	const distances = activity.cameraPresets.map((preset) => preset.distance);
	const nearest = Math.min(...distances);
	const furthest = Math.max(...distances);
	const low = Math.max(MIN_CAMERA_DISTANCE, nearest);
	const high = Math.min(MAX_CAMERA_DISTANCE, furthest);

	if (low > high) return { ...physical, distance: low };

	return { ...physical, distance: Math.min(high, Math.max(low, physical.distance)) };
}

/** The camera a preset declares, already clamped to the physical range. */
export function cameraForPreset(preset: { distance: number; pitch: number }): CameraState {
	return physicalCamera({ distance: preset.distance, pitch: preset.pitch });
}

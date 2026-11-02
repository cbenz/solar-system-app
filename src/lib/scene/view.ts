/**
 * Pure limits for the camera that watches the solar system from the Earth.
 *
 * Distances are multiples of the Earth's radius. The lower bound keeps the
 * camera outside the globe; the upper bound is far enough that a pinch out
 * reaches the whole drawn system (the outermost planet is about 9 drawn Earth
 * radii from the Earth with the default distance distortion).
 */

export const MIN_CAMERA_DISTANCE = 1.6;
export const MAX_CAMERA_DISTANCE = 30;

/** Just short of the pole, so the Earth never flips over. */
export const MAX_PITCH = (80 * Math.PI) / 180;

export function clampCameraDistance(distance: number): number {
	return Math.min(MAX_CAMERA_DISTANCE, Math.max(MIN_CAMERA_DISTANCE, distance));
}

export function clampPitch(pitch: number): number {
	return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

/**
 * Pure limits for the camera that watches the Earth.
 *
 * Distances are multiples of the Earth's radius. The lower bound keeps the
 * camera outside the globe; the upper bound keeps the Earth large enough to
 * read as a planet rather than a dot.
 */

export const MIN_CAMERA_DISTANCE = 1.6;
export const MAX_CAMERA_DISTANCE = 8;

/** Just short of the pole, so the Earth never flips over. */
export const MAX_PITCH = (80 * Math.PI) / 180;

export function clampCameraDistance(distance: number): number {
	return Math.min(MAX_CAMERA_DISTANCE, Math.max(MIN_CAMERA_DISTANCE, distance));
}

export function clampPitch(pitch: number): number {
	return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

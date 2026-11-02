import { describe, expect, it } from 'vitest';
import {
	MAX_CAMERA_DISTANCE,
	MAX_PITCH,
	MIN_CAMERA_DISTANCE,
	clampCameraDistance,
	clampPitch
} from './view';
import { DRAWN_EARTH_RADIUS_AU, compressedDistanceAu } from '$lib/session/distortion';

describe('camera distance', () => {
	it('leaves a distance inside the allowed range alone', () => {
		const inside = (MIN_CAMERA_DISTANCE + MAX_CAMERA_DISTANCE) / 2;

		expect(clampCameraDistance(inside)).toBe(inside);
	});

	it('stops the child from flying through the Earth', () => {
		expect(clampCameraDistance(0)).toBe(MIN_CAMERA_DISTANCE);
		expect(clampCameraDistance(MIN_CAMERA_DISTANCE / 2)).toBe(MIN_CAMERA_DISTANCE);
	});

	it('stops the child from losing the Earth in the distance', () => {
		expect(clampCameraDistance(1000)).toBe(MAX_CAMERA_DISTANCE);
	});

	it('pinches out far enough to find the whole drawn solar system', () => {
		// Neptune at 30 AU is drawn about 9 Earth radii from the Earth by the
		// distance compression; the camera bound leaves room around it.
		const drawnNeptune = compressedDistanceAu(30) / DRAWN_EARTH_RADIUS_AU;
		expect(MAX_CAMERA_DISTANCE).toBeGreaterThan(drawnNeptune * 2);
	});
});

describe('pitch', () => {
	it('leaves a tilt inside the allowed range alone', () => {
		expect(clampPitch(0.4)).toBeCloseTo(0.4);
	});

	it('never lets the Earth flip over the poles', () => {
		expect(clampPitch(Math.PI)).toBe(MAX_PITCH);
		expect(clampPitch(-Math.PI)).toBe(-MAX_PITCH);
	});
});

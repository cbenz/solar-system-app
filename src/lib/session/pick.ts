/**
 * Picking a latitude off the globe.
 *
 * A pointer tap becomes a ray; this module turns the ray into the latitude of a
 * point on a sphere. It is pure, headless and lives in the session module so the
 * rule can be tested without a browser or a renderer (ADR-0005: Three.js is a
 * presentation detail).
 *
 * ## Frame
 *
 * The ray and the body centre are expressed in the body's **equatorial frame**:
 * `+z` toward the north pole, the `x`/`y` plane is the equator, right-handed.
 * The latitude of a surface point is its angle above that plane, so it is
 * `asin(hit.z / radius)`.
 *
 * The renderer converts its own camera frame into this one before calling — the
 * conversion is a rotation, so both the ray origin and its direction take it.
 *
 * ## Back side
 *
 * A ray can cross a sphere twice. Only the near crossing is visible: a tap on
 * the far side of the globe must place nothing. The near crossing is the one
 * closer to the camera than the sphere's centre, measured along the ray. A ray
 * that starts inside the sphere (the camera is closer to the centre than the
 * surface) therefore always reports the back side and is rejected.
 */

import { dot, subtract, unit } from './ephemeris';
import type { Vec3 } from './types';

const RAD = 180 / Math.PI;

export type LatitudePick = {
	/** The ray, in the body's equatorial frame. `+z` is the north pole. */
	rayOrigin: Vec3;
	/** Need not be normalised. */
	rayDirection: Vec3;
	bodyCenter: Vec3;
	bodyRadius: number;
};

export type PickedLatitude = {
	latitudeDeg: number;
};

/**
 * The latitude of the visible surface point under the ray, or `null` when the
 * ray misses the sphere, hits its back side, or is degenerate.
 */
export function pickLatitude({
	rayOrigin,
	rayDirection,
	bodyCenter,
	bodyRadius
}: LatitudePick): PickedLatitude | null {
	if (!Number.isFinite(bodyRadius) || bodyRadius <= 0) return null;

	const directionLength = Math.hypot(rayDirection.x, rayDirection.y, rayDirection.z);
	if (!Number.isFinite(directionLength) || directionLength === 0) return null;

	const direction = unit(rayDirection);
	const offset = subtract(rayOrigin, bodyCenter);

	// |offset + t·direction|² = radius², with a unit direction.
	const halfLinear = dot(offset, direction);
	const constant = dot(offset, offset) - bodyRadius * bodyRadius;
	const discriminant = halfLinear * halfLinear - constant;
	if (discriminant < 0) return null;

	const root = Math.sqrt(discriminant);
	const near = -halfLinear - root;
	const far = -halfLinear + root;

	// Distances along the ray from the camera to the sphere's centre and to the
	// near crossing. The crossing is on the far side when it lies beyond the
	// centre — which is exactly the tap-on-the-far-side case.
	const centerDistance = -halfLinear;
	const hitDistance = near >= 0 ? near : far >= 0 ? far : null;
	if (hitDistance === null) return null;
	if (hitDistance > centerDistance) return null;

	const height = dot(offset, { x: 0, y: 0, z: 1 }) + hitDistance * direction.z;
	const sine = Math.min(Math.max(height / bodyRadius, -1), 1);

	return { latitudeDeg: Math.asin(sine) * RAD };
}

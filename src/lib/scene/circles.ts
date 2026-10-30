/**
 * Latitude circles the renderer draws on the globe.
 *
 * Only the Equator is drawn today. Ticket 11 adds the Tropics and the Polar
 * Circles by passing more `CircleSpec`s in — this module is the seam, and it
 * already knows how to build the points for any latitude.
 *
 * The frame is the renderer's surface frame: `+y` toward the north pole, the
 * globe centred at the origin with radius 1. `latitudeDeg` is the usual
 * geographic latitude, so 0 is the Equator and 66.56 is the Arctic Circle under
 * the model's obliquity.
 */

export type CircleSpec = {
	id: string;
	latitudeDeg: number;
	/** Three.js colour, as a number, like every other renderer colour. */
	colour: number;
	opacity: number;
};

export type CirclePoint = { x: number; y: number; z: number };

/**
 * The Equator, drawn at all times in every mode, including the sandbox.
 * Slightly outside the sphere so it does not z-fight with the surface.
 */
export const EQUATOR: CircleSpec = {
	id: 'equator',
	latitudeDeg: 0,
	colour: 0xffffff,
	opacity: 0.55
};

export const DEFAULT_CIRCLES: readonly CircleSpec[] = [EQUATOR];

/** The globe's drawn radius, multiplied by this to sit just clear of the surface. */
export const CIRCLE_RADIUS_FACTOR = 1.002;

/**
 * The points of a latitude circle on a sphere, `+y` up, closed by the caller
 * with `LineLoop`. Returned as plain data: no Three.js in this module.
 */
export function circlePoints(
	latitudeDeg: number,
	radius: number,
	segments = 128
): CirclePoint[] {
	const latitude = (latitudeDeg * Math.PI) / 180;
	const y = Math.sin(latitude) * radius;
	const ringRadius = Math.cos(latitude) * radius;
	const points: CirclePoint[] = [];

	for (let index = 0; index < segments; index += 1) {
		const angle = (index / segments) * Math.PI * 2;
		points.push({ x: Math.cos(angle) * ringRadius, y, z: Math.sin(angle) * ringRadius });
	}

	return points;
}

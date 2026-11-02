import { describe, expect, it } from 'vitest';
import { parallelSunRays, sunlightDirection, surfaceRaySpacingAu } from '$lib/session';
import { EARTH_RADIUS_AU, dot, length, subtract } from '$lib/session/ephemeris';
import type { Vec3 } from '$lib/session';

const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);

function cross(a: Vec3, b: Vec3): Vec3 {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x
	};
}

describe('sunlight arrives as parallel rays', () => {
	const bundle = parallelSunRays(JUNE_SOLSTICE);
	const expected = sunlightDirection(JUNE_SOLSTICE);

	it('uses one direction for every ray, the Sun-to-Earth direction', () => {
		expect(bundle.rays).toHaveLength(7);
		expect(length(expected)).toBeCloseTo(1, 12);

		for (const ray of bundle.rays) {
			expect(length(ray.direction)).toBeCloseTo(1, 12);
			expect(dot(ray.direction, expected)).toBeCloseTo(1, 12);
			// Parallel to machine precision: the cross product is the zero vector.
			const perpendicular = cross(ray.direction, ray.direction);
			expect(Math.abs(perpendicular.x) + Math.abs(perpendicular.y) + Math.abs(perpendicular.z)).toBeLessThan(1e-12);
		}
	});

	it('offsets the rays across the bundle, never along it', () => {
		const first = bundle.rays[0]!;
		for (const ray of bundle.rays.slice(1)) {
			const offset = subtract(ray.origin, first.origin);
			expect(Math.abs(dot(offset, expected))).toBeLessThan(1e-12);
			// The offsets are all parallel to each other: one line of rays.
			const perpendicular = cross(offset, subtract(bundle.rays[1]!.origin, first.origin));
			expect(Math.abs(perpendicular.x) + Math.abs(perpendicular.y) + Math.abs(perpendicular.z)).toBeLessThan(1e-12);
		}
	});

	it('spaces adjacent rays evenly by the declared spacing', () => {
		for (let index = 1; index < bundle.rays.length; index += 1) {
			const gap = length(subtract(bundle.rays[index]!.origin, bundle.rays[index - 1]!.origin));
			expect(gap).toBeCloseTo(bundle.spacingAu, 12);
		}
	});
});

describe('the spacing on the ground follows the incidence angle', () => {
	it('is the bundle spacing at a zenith Sun and 1/sin(h) times it otherwise', () => {
		const spacing = 0.001;

		expect(surfaceRaySpacingAu(spacing, 90)).toBeCloseTo(spacing, 12);
		expect(surfaceRaySpacingAu(spacing, 30)).toBeCloseTo(2 * spacing, 12);
		expect(surfaceRaySpacingAu(spacing, 10)).toBeCloseTo(spacing / Math.sin((10 * Math.PI) / 180), 12);
	});

	it('spreads the rays as the Sun gets lower', () => {
		const spacing = 0.001;
		const high = surfaceRaySpacingAu(spacing, 60);
		const low = surfaceRaySpacingAu(spacing, 20);

		// A low Sun is the same bundle over a larger patch of ground: concentrated
		// versus spread out, as a number.
		expect(low).toBeGreaterThan(high * 2.5);
	});

	it('never returns a negative or infinite spacing above the horizon', () => {
		for (const elevation of [0.001, 1, 45, 89.999]) {
			expect(surfaceRaySpacingAu(0.001, elevation)).toBeGreaterThan(0);
			expect(Number.isFinite(surfaceRaySpacingAu(0.001, elevation))).toBe(true);
		}
	});
});

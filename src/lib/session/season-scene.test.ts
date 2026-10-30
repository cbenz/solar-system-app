import { describe, expect, it } from 'vitest';
import {
	DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED,
	DRAWN_ORBIT_MAX_ECCENTRICITY,
	drawnOrbitEccentricity,
	drawnOrbitPoints
} from '$lib/session';

const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);
const JANUARY = Date.UTC(2025, 0, 4, 13, 28);

/** The eccentricity of a closed curve, read back from its radial extremes. */
function measureEccentricity(points: { x: number; y: number; z: number }[]): number {
	const radii = points.map((point) => Math.hypot(point.x, point.y, point.z));
	const min = Math.min(...radii);
	const max = Math.max(...radii);
	return (max - min) / (max + min);
}

describe('the drawn orbit while the seasons are explained', () => {
	it('is a circle by default, under the stated 0.02 threshold', () => {
		expect(drawnOrbitEccentricity(false)).toBe(0);
		expect(drawnOrbitEccentricity(false)).toBeLessThanOrEqual(DRAWN_ORBIT_MAX_ECCENTRICITY);
	});

	it('draws a circle whose points all sit at the same radius', () => {
		const points = drawnOrbitPoints(JUNE_SOLSTICE, 0, 180);

		expect(points).toHaveLength(180);
		expect(measureEccentricity(points)).toBeLessThan(1e-9);
	});

	it('draws a visibly eccentric orbit only at the child\'s request', () => {
		const points = drawnOrbitPoints(JUNE_SOLSTICE, DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED, 360);

		expect(DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED).toBeGreaterThan(0.3);
		// The drawn curve really has the eccentricity the setting declares.
		expect(measureEccentricity(points)).toBeCloseTo(DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED, 2);
	});

	it('keeps the ellipse in the ecliptic plane and closed', () => {
		const points = drawnOrbitPoints(JANUARY, DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED, 360);
		const first = points[0]!;
		const last = points[points.length - 1]!;

		for (const point of points) expect(Math.abs(point.z)).toBeLessThan(1e-12);
		expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThan(0.05);
	});
});

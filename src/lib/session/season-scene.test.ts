import { describe, expect, it } from 'vitest';
import {
	DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED,
	DRAWN_ORBIT_MAX_ECCENTRICITY,
	applyEvent,
	buildScene,
	createInitialState,
	drawnOrbitEccentricity,
	drawnOrbitPoints
} from '$lib/session';
import seasonsActivity from '../../activities/seasons.activity';

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


describe('the daylight remainder at zero tilt', () => {
	it('keeps a small June/December difference visible at both POVs', () => {
		const opened = applyEvent(
			createInitialState({ activities: [seasonsActivity], instant: JUNE_SOLSTICE }),
			{ type: 'open-activity', activityId: 'seasons' }
		).state;
		const noTilt = applyEvent(opened, { type: 'set-setting', key: 'tilt', value: 0 }).state;
		const season = buildScene(noTilt).season;

		expect(season).not.toBeNull();
		expect(season?.daylight).toHaveLength(2);

		for (const entry of season!.daylight) {
			// At zero tilt the day length is 12 h everywhere, so what survives is
			// the distance's 1/r² remainder — small, but not zero.
			expect(Math.abs(entry.differenceMinutes)).toBeGreaterThan(5);
			expect(Math.abs(entry.differenceMinutes)).toBeLessThan(120);
			expect(entry.juneMinutes).not.toBe(entry.decemberMinutes);
		}
	});
});

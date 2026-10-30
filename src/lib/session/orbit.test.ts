import { describe, expect, it } from 'vitest';
import {
	MU_SUN_AU3_PER_DAY2,
	orbitFromStateVector,
	positionAtElapsed,
	speedAtRadius
} from './orbit';

const AU = 1;
const CIRCULAR_SPEED = Math.sqrt(MU_SUN_AU3_PER_DAY2 / AU);
const ESCAPE_SPEED = Math.sqrt((2 * MU_SUN_AU3_PER_DAY2) / AU);

function circularState(speed = CIRCULAR_SPEED) {
	return {
		position: { x: AU, y: 0, z: 0 },
		velocity: { x: 0, y: speed, z: 0 },
		mu: MU_SUN_AU3_PER_DAY2
	};
}

describe('orbitFromStateVector', () => {
	it('round-trips a circular orbit at 1 AU to a = 1 AU and e ≈ 0', () => {
		const orbit = orbitFromStateVector(circularState());

		expect(orbit.kind).toBe('ellipse');
		expect(orbit.semiMajorAxisAu).toBeCloseTo(1, 9);
		expect(orbit.eccentricity).toBeLessThan(1e-9);
		// The sidereal year is 365.256 d; this is the independent published value.
		expect(orbit.periodDays).toBeCloseTo(365.256, 1);
		expect(orbit.periapsisAu).toBeCloseTo(1, 9);
		expect(orbit.apoapsisAu).toBeCloseTo(1, 9);
	});

	it('reproduces the input position at the epoch it was derived from', () => {
		const state = circularState();
		const orbit = orbitFromStateVector(state);
		const position = positionAtElapsed(orbit, MU_SUN_AU3_PER_DAY2, 0);

		expect(position.x).toBeCloseTo(state.position.x, 12);
		expect(position.y).toBeCloseTo(state.position.y, 12);
		expect(position.z).toBeCloseTo(state.position.z, 12);
	});

	it('gives e ≈ 1 for a state vector at exactly escape velocity', () => {
		const orbit = orbitFromStateVector(circularState(ESCAPE_SPEED));

		expect(orbit.eccentricity).toBeCloseTo(1, 6);
		expect(orbit.kind).toBe('parabola');
		expect(orbit.periodDays).toBeNull();
		expect(orbit.apoapsisAu).toBeNull();
	});

	it('escapes at 1.1× escape velocity, with e > 1 and no period', () => {
		const orbit = orbitFromStateVector(circularState(1.1 * ESCAPE_SPEED));

		expect(orbit.kind).toBe('hyperbola');
		expect(orbit.eccentricity).toBeGreaterThan(1);
		expect(orbit.semiMajorAxisAu).toBeLessThan(0);
		expect(orbit.periodDays).toBeNull();
		expect(orbit.apoapsisAu).toBeNull();
	});

	it('recedes monotonically over a long span once above escape velocity', () => {
		const orbit = orbitFromStateVector(circularState(1.1 * ESCAPE_SPEED));
		let previous = 0;

		for (let day = 0; day <= 3650; day += 10) {
			const position = positionAtElapsed(orbit, MU_SUN_AU3_PER_DAY2, day);
			const distance = Math.hypot(position.x, position.y, position.z);
			expect(distance).toBeGreaterThan(previous);
			previous = distance;
		}
	});

	it('agrees with vis-viva for the speed at a radius', () => {
		const orbit = orbitFromStateVector(circularState());
		expect(speedAtRadius(orbit, MU_SUN_AU3_PER_DAY2, 1)).toBeCloseTo(CIRCULAR_SPEED, 12);
		expect(speedAtRadius(orbit, MU_SUN_AU3_PER_DAY2, 2)).toBeLessThan(CIRCULAR_SPEED);
	});
});

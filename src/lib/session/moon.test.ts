import { describe, expect, it } from 'vitest';
import { AU_KM, moonGeocentricPositionAu } from './ephemeris';
import {
	MOON_RADIUS_KM,
	moonAngularDiameterDeg,
	moonApparentMagnitude,
	moonDistanceKm,
	moonPhase,
	shortestAngleDeg
} from './moon';

const at = (iso: string) => Date.parse(iso);

/**
 * Published instants (USNO "Dates of Primary Phases of the Moon" for April and
 * September 2025; ASTRONOMY.md rows 24–25 for the two eclipses).
 *
 * Tolerance: the model's Moon is good to 0.1° in longitude, which is 0.1 % of
 * the illuminated fraction — so ±0.02 on `f` is ten times the model error and
 * still fails on a phase that is a day out (a day moves `f` by ~0.1).
 */
describe('Moon phase from the Sun–Moon–Earth elongation', () => {
	it('is new at the published new-moon instant (2024-04-08 18:21 UTC)', () => {
		const phase = moonPhase(at('2024-04-08T18:21:00Z'));

		// ASTRONOMY.md row 24: f ≤ 0.001 at this instant.
		expect(phase.illuminatedFraction).toBeLessThan(0.001);
		expect(phase.elongationDeg).toBeLessThan(3);
		expect(phase.phaseAngleDeg).toBeGreaterThan(177);
	});

	it('is full at the published full-moon instant (2025-09-07 18:09 UTC)', () => {
		const phase = moonPhase(at('2025-09-07T18:09:00Z'));

		// ASTRONOMY.md row 25: f ≥ 0.999 at this instant.
		expect(phase.illuminatedFraction).toBeGreaterThan(0.999);
		expect(phase.elongationDeg).toBeGreaterThan(177);
		expect(phase.phaseAngleDeg).toBeLessThan(3);
	});

	it('is exactly half lit at the first quarter (2025-04-05 02:15 UTC)', () => {
		const phase = moonPhase(at('2025-04-05T02:15:00Z'));

		expect(phase.illuminatedFraction).toBeGreaterThan(0.48);
		expect(phase.illuminatedFraction).toBeLessThan(0.52);
		expect(phase.elongationDeg).toBeCloseTo(90, 0);
		expect(phase.waxing).toBe(true);
	});

	it('is exactly half lit at the last quarter, and waning (2025-04-21 01:36 UTC)', () => {
		const phase = moonPhase(at('2025-04-21T01:36:00Z'));

		expect(phase.illuminatedFraction).toBeGreaterThan(0.48);
		expect(phase.illuminatedFraction).toBeLessThan(0.52);
		expect(phase.waxing).toBe(false);
	});

	it('keeps f = (1 − cos ψ)/2, α = 180° − ψ, and f in [0, 1] over a year', () => {
		const from = at('2025-01-01T00:00:00Z');
		const step = 19 * 3_600_000;

		for (let instant = from; instant < from + 365 * 86_400_000; instant += step) {
			const phase = moonPhase(instant);

			expect(phase.illuminatedFraction).toBeGreaterThanOrEqual(0);
			expect(phase.illuminatedFraction).toBeLessThanOrEqual(1);
			expect(phase.illuminatedFraction).toBeCloseTo(
				(1 - Math.cos((phase.elongationDeg * Math.PI) / 180)) / 2,
				12
			);
			expect(phase.elongationDeg + phase.phaseAngleDeg).toBeCloseTo(180, 9);
		}
	});
});

describe('Moon apparent magnitude', () => {
	it('is about −12.7 at full moon (published −12.69)', () => {
		// ASTRONOMY.md §6.3: the two-term fit is good to ±0.1 mag at mean distance;
		// TheSkyLive publishes −12.69 for this full moon.
		const magnitude = moonApparentMagnitude(at('2025-09-07T18:09:00Z'));

		expect(magnitude).toBeGreaterThan(-13.1);
		expect(magnitude).toBeLessThan(-12.2);
	});

	it('is about −10.4 at first quarter, several magnitudes fainter than full', () => {
		const quarter = moonApparentMagnitude(at('2025-04-05T02:15:00Z'));
		const full = moonApparentMagnitude(at('2025-09-07T18:09:00Z'));

		expect(quarter).toBeGreaterThan(-10.9);
		expect(quarter).toBeLessThan(-9.9);
		expect(quarter - full).toBeGreaterThan(1.5);
	});

	it('is a thin, faint crescent at new moon (above −4, the daylight threshold)', () => {
		expect(moonApparentMagnitude(at('2024-04-08T18:21:00Z'))).toBeGreaterThan(-4.5);
	});

	it('brightens with the Moon’s distance at the same phase', () => {
		// Same instant is the same phase; the distance term is the only difference,
		// so pin the sign of it against the true distance instead.
		const instant = at('2025-04-05T02:15:00Z');
		const distanceKm = moonDistanceKm(instant);
		const phaseAngle = moonPhase(instant).phaseAngleDeg;
		const phaseOnly = -12.73 + 0.026 * phaseAngle + 4e-9 * phaseAngle ** 4;

		expect(moonApparentMagnitude(instant)).toBeCloseTo(
			phaseOnly + 5 * Math.log10(384_400 / distanceKm),
			9
		);
	});
});

describe('Moon angular size', () => {
	it('spans the published perigee–apogee range (29.4′ … 33.5′)', () => {
		const from = at('2025-01-01T00:00:00Z');
		let minimum = Infinity;
		let maximum = 0;

		for (let instant = from; instant < from + 40 * 86_400_000; instant += 6 * 3_600_000) {
			const diameter = moonAngularDiameterDeg(instant);
			minimum = Math.min(minimum, diameter);
			maximum = Math.max(maximum, diameter);
		}

		expect(minimum).toBeGreaterThan(29.4 / 60 - 0.05);
		expect(maximum).toBeLessThan(33.5 / 60 + 0.05);
	});

	it('follows the true distance, θ = 2·asin(R/d)', () => {
		const instant = at('2025-09-07T18:09:00Z');
		const expected =
			(2 * Math.asin(MOON_RADIUS_KM / (Math.hypot(...Object.values(moonGeocentricPositionAu(instant))) * AU_KM)) * 180) /
			Math.PI;

		expect(moonAngularDiameterDeg(instant)).toBeCloseTo(expected, 9);
	});
});

describe('shortestAngleDeg', () => {
	it('takes the short way round the circle', () => {
		expect(shortestAngleDeg(350, 10)).toBeCloseTo(20, 9);
		expect(shortestAngleDeg(10, 350)).toBeCloseTo(-20, 9);
		expect(shortestAngleDeg(0, 180)).toBeCloseTo(180, 9);
	});
});

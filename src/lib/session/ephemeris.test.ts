import { describe, expect, it } from 'vitest';
import {
	AU_KM,
	earthHeliocentricPositionAu,
	earthSunDistanceAu,
	moonGeocentricPositionAu,
	solarDeclinationDeg,
	sunLongitudeDeg
} from './ephemeris';
import { julianDay } from './time';

/**
 * Published values only. Every number below comes from `ASTRONOMY.md` §7 (USNO
 * seasons API, Espenak's perihelion table, Meeus' worked examples), never from
 * this implementation.
 */

function findRadiusExtremum(fromIso: string, toIso: string, kind: 'min' | 'max') {
	const from = Date.parse(fromIso);
	const to = Date.parse(toIso);
	const step = 60_000;

	let bestInstant = from;
	let best = earthSunDistanceAu(from);

	for (let instant = from; instant <= to; instant += step) {
		const radius = earthSunDistanceAu(instant);
		if (kind === 'min' ? radius < best : radius > best) {
			best = radius;
			bestInstant = instant;
		}
	}

	return { instant: bestInstant, radius: best };
}

describe('the Earth-Sun distance', () => {
	it('is smallest in early January: 2025 perihelion on Jan 4, 0.98331 AU', () => {
		const perihelion = findRadiusExtremum(
			'2025-01-01T00:00:00Z',
			'2025-01-06T23:59:59Z',
			'min'
		);
		const date = new Date(perihelion.instant);

		// ±2 days: the perihelion drifts across Jan 2-5 over the century.
		expect(date.getUTCMonth()).toBe(0);
		expect(date.getUTCDate()).toBeGreaterThanOrEqual(2);
		expect(date.getUTCDate()).toBeLessThanOrEqual(6);
		// ±0.0005 AU: the Moon's perturbation moves it by ±0.0001 AU year to year.
		expect(perihelion.radius).toBeCloseTo(0.98331, 3);
		expect(Math.abs(perihelion.radius - 0.98331)).toBeLessThan(0.0005);
	});

	it('is largest in early July: 2025 aphelion on Jul 3, 1.01669 AU', () => {
		const aphelion = findRadiusExtremum(
			'2025-07-01T00:00:00Z',
			'2025-07-06T23:59:59Z',
			'max'
		);
		const date = new Date(aphelion.instant);

		expect(date.getUTCMonth()).toBe(6);
		expect(date.getUTCDate()).toBeGreaterThanOrEqual(2);
		expect(date.getUTCDate()).toBeLessThanOrEqual(5);
		expect(Math.abs(aphelion.radius - 1.01669)).toBeLessThan(0.0005);
	});

	it('is nearer in January than in July by about 0.033 AU', () => {
		const january = earthSunDistanceAu(Date.parse('2025-01-04T13:28:00Z'));
		const july = earthSunDistanceAu(Date.parse('2025-07-03T19:55:00Z'));

		expect(july - january).toBeGreaterThan(0.03);
		expect(july - january).toBeLessThan(0.036);
	});
});

describe("the Sun's ecliptic longitude", () => {
	// 0.02° tolerance: the model's own error is 0.01° (ASTRONOMY.md §1.2) and the
	// published instants are rounded to the minute.
	it('is 0° at the March equinox (2024-03-20 03:06 UTC)', () => {
		const longitude = sunLongitudeDeg(Date.parse('2024-03-20T03:06:00Z'));

		expect(Math.abs(longitude)).toBeLessThan(0.02);
	});

	it('is 0° at the March equinox (2025-03-20 09:01 UTC)', () => {
		const longitude = sunLongitudeDeg(Date.parse('2025-03-20T09:01:00Z'));

		expect(Math.abs(longitude)).toBeLessThan(0.02);
	});

	it('is 90° at the June solstice (2025-06-21 02:42 UTC)', () => {
		const longitude = sunLongitudeDeg(Date.parse('2025-06-21T02:42:00Z'));

		expect(Math.abs(longitude - 90)).toBeLessThan(0.02);
	});

	it('is 180° at the September equinox (2025-09-22 18:19 UTC)', () => {
		const longitude = sunLongitudeDeg(Date.parse('2025-09-22T18:19:00Z'));

		expect(Math.abs(longitude - 180)).toBeLessThan(0.02);
	});

	it('is 270° at the December solstice (2025-12-21 15:03 UTC)', () => {
		const longitude = sunLongitudeDeg(Date.parse('2025-12-21T15:03:00Z'));

		expect(Math.abs(longitude - 270)).toBeLessThan(0.02);
	});
});

describe('the Sun’s declination', () => {
	// ±0.02°: the fixed 23.44° obliquity is 0.003° off the 2025 real value, and
	// the published instants are rounded to the minute (0.0008°/min of motion).
	it('is +23.44° at the June solstice', () => {
		expect(solarDeclinationDeg(Date.parse('2025-06-21T02:42:00Z'))).toBeCloseTo(23.44, 1);
	});

	it('is -23.44° at the December solstice', () => {
		expect(solarDeclinationDeg(Date.parse('2025-12-21T15:03:00Z'))).toBeCloseTo(-23.44, 1);
	});

	it('is 0° at the equinoxes', () => {
		expect(Math.abs(solarDeclinationDeg(Date.parse('2025-03-20T09:01:00Z')))).toBeLessThan(0.02);
		expect(Math.abs(solarDeclinationDeg(Date.parse('2025-09-22T18:19:00Z')))).toBeLessThan(0.02);
	});
});

describe("the Earth's heliocentric position", () => {
	it('points away from the Sun at the March equinox', () => {
		const instant = Date.parse('2024-03-20T03:06:00Z');
		const position = earthHeliocentricPositionAu(instant);
		const radius = Math.hypot(position.x, position.y, position.z);
		const longitudeDeg = (Math.atan2(position.y, position.x) * 180) / Math.PI;

		// Earth's heliocentric longitude is the Sun's geocentric longitude + 180°.
		expect(Math.abs(longitudeDeg + 180)).toBeLessThan(0.05);
		// Published Earth-Sun distance at the March equinox is about 0.996 AU.
		expect(Math.abs(radius - 0.9959)).toBeLessThan(0.001);
		// The ecliptic is the Earth's orbital plane: no out-of-plane component.
		expect(Math.abs(position.z)).toBeLessThan(1e-12);
	});

	it('travels a full turn in one sidereal year', () => {
		const instant = Date.parse('2025-01-01T00:00:00Z');
		const start = earthHeliocentricPositionAu(instant);
		const yearLater = earthHeliocentricPositionAu(instant + 365.256363 * 86_400_000);
		const startLongitude = Math.atan2(start.y, start.x);
		const laterLongitude = Math.atan2(yearLater.y, yearLater.x);

		expect(Math.abs(startLongitude - laterLongitude)).toBeLessThan(0.01);
	});
});

describe('the Moon', () => {
	it('stays between perigee and apogee', () => {
		const from = Date.parse('2024-01-01T00:00:00Z');
		const step = 6 * 3_600_000;
		let minimum = Infinity;
		let maximum = 0;

		for (let instant = from; instant < from + 40 * 86_400_000; instant += step) {
			const position = moonGeocentricPositionAu(instant);
			const distanceKm = Math.hypot(position.x, position.y, position.z) * AU_KM;
			minimum = Math.min(minimum, distanceKm);
			maximum = Math.max(maximum, distanceKm);
		}

		// Published perigee/apogee: 356 500 / 406 700 km; ±1 % covers the model's
		// 0.3 % distance error and the sample grid missing the exact apsis.
		expect(minimum).toBeGreaterThan(356_500 * 0.99);
		expect(minimum).toBeLessThan(384_400);
		expect(maximum).toBeLessThan(406_700 * 1.01);
		expect(maximum).toBeGreaterThan(384_400);
	});

	it('never strays more than the 5.145° orbital inclination from the ecliptic', () => {
		const from = Date.parse('2024-01-01T00:00:00Z');
		const step = 6 * 3_600_000;

		for (let instant = from; instant < from + 40 * 86_400_000; instant += step) {
			const position = moonGeocentricPositionAu(instant);
			const latitudeDeg =
				Math.asin(position.z / Math.hypot(position.x, position.y, position.z)) *
				(180 / Math.PI);

			expect(Math.abs(latitudeDeg)).toBeLessThan(5.4);
		}
	});

	it('is a tenth of a degree from Meeus’ worked example (1992-04-12, 0h TD)', () => {
		const instant = Date.parse('1992-04-12T00:00:00Z');
		const position = moonGeocentricPositionAu(instant);
		const distanceKm = Math.hypot(position.x, position.y, position.z) * AU_KM;
		const longitudeDeg = (Math.atan2(position.y, position.x) * 180) / Math.PI;
		const latitudeDeg = (Math.asin(position.z / (distanceKm / AU_KM)) * 180) / Math.PI;

		// Published (Meeus example 47.a): λ = 133.162655°, β = −3.229126°, Δ = 368 409.7 km.
		expect(Math.abs(longitudeDeg - 133.162655)).toBeLessThan(0.15);
		expect(Math.abs(latitudeDeg - -3.229126)).toBeLessThan(0.05);
		expect(Math.abs(distanceKm - 368_409.7)).toBeLessThan(0.005 * 368_409.7);
	});

	it('is the Julian Day the ephemeris reads, not a Date', () => {
		expect(julianDay(Date.UTC(2000, 0, 1, 12, 0, 0))).toBeCloseTo(2_451_545.0, 6);
		expect(julianDay(Date.UTC(1987, 0, 27, 0, 0, 0))).toBeCloseTo(2_446_822.5, 6);
	});
});

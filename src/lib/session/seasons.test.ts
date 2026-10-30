import { describe, expect, it } from 'vitest';
import {
	OBLIQUITY_DEG,
	aphelionInstant,
	dayLengthHoursForTilt,
	daylightMinutesForTilt,
	distanceInsolationRatio,
	distanceToSunAu,
	earthSunDistanceAu,
	insolationContrast,
	perihelionInstant
} from '$lib/session';
import type { Observer, TimeSpan } from '$lib/session';

const DAY = 86_400_000;
const PARIS = 48.8566;
const SYDNEY = -33.8688;
const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);
const DECEMBER_SOLSTICE = Date.UTC(2025, 11, 21, 15, 3);
const SPAN: TimeSpan = { fromInstant: Date.UTC(2025, 0, 1), toInstant: Date.UTC(2026, 0, 1) };

function observer(latitudeDeg: number): Observer {
	return { id: 'probe', bodyId: 'earth', latitudeDeg, colour: '#ffffff' };
}

describe('Paris and Sydney at the same instant', () => {
	it('gives Paris a longer June day than Sydney, from the same body', () => {
		const paris = dayLengthHoursForTilt(PARIS, JUNE_SOLSTICE, OBLIQUITY_DEG);
		const sydney = dayLengthHoursForTilt(SYDNEY, JUNE_SOLSTICE, OBLIQUITY_DEG);

		// ASTRONOMY.md §3.7: Paris 15 h 58 m. Sydney is at −33.9°, so its June
		// day is the southern winter's 9 h 44 m — the shorter half of the pair.
		expect(paris).toBeCloseTo(15.97, 1);
		expect(sydney).toBeCloseTo(9.74, 1);
		expect(paris - sydney).toBeGreaterThan(6);
	});

	it("puts both observers at the same distance from the Sun, because it is one body", () => {
		const paris = distanceToSunAu(observer(PARIS), JUNE_SOLSTICE);
		const sydney = distanceToSunAu(observer(SYDNEY), JUNE_SOLSTICE);

		// The distance is a property of the Earth, not of where on it you stand.
		expect(paris).toBe(sydney);
		expect(paris).toBe(earthSunDistanceAu(JUNE_SOLSTICE));
	});
});

describe('the distance explanation, measured instead of assumed', () => {
	it('puts perihelion in the first week of January, at 0.9833 AU', () => {
		const perihelion = perihelionInstant(SPAN.fromInstant, SPAN.toInstant);
		const iso = new Date(perihelion).toISOString();

		expect(iso.slice(0, 10)).toMatch(/^2025-01-0[1-6]$/);
		expect(Math.abs(perihelion - Date.UTC(2025, 0, 3))).toBeLessThan(3 * DAY);
		expect(earthSunDistanceAu(perihelion)).toBeCloseTo(0.9833, 4);
	});

	it('puts aphelion in early July, and northern summer near it', () => {
		const aphelion = aphelionInstant(SPAN.fromInstant, SPAN.toInstant);

		expect(new Date(aphelion).toISOString().slice(0, 10)).toMatch(/^2025-07-0[1-7]$/);
		expect(earthSunDistanceAu(aphelion)).toBeCloseTo(1.0167, 4);

		// The northern summer solstice sits a fortnight from aphelion: the summer
		// hemisphere is the FAR one.
		expect(Math.abs(aphelion - JUNE_SOLSTICE)).toBeLessThan(20 * DAY);
		expect(earthSunDistanceAu(JUNE_SOLSTICE)).toBeGreaterThan(1.015);
	});

	it('has the Earth nearer in January than in June, so the belief is refuted by data', () => {
		const perihelion = perihelionInstant(SPAN.fromInstant, SPAN.toInstant);

		expect(earthSunDistanceAu(perihelion)).toBeLessThan(earthSunDistanceAu(JUNE_SOLSTICE));
		expect(earthSunDistanceAu(perihelion)).toBeLessThan(earthSunDistanceAu(DECEMBER_SOLSTICE));
	});
});

describe('a tilt slider that reaches zero', () => {
	const juneAt = (tilt: number) => daylightMinutesForTilt(PARIS, JUNE_SOLSTICE, tilt);
	const decemberAt = (tilt: number) => daylightMinutesForTilt(PARIS, DECEMBER_SOLSTICE, tilt);

	it('shrinks the June–December contrast by more than an order of magnitude', () => {
		const full = juneAt(OBLIQUITY_DEG) - decemberAt(OBLIQUITY_DEG);
		const zero = juneAt(0) - decemberAt(0);

		expect(full).toBeGreaterThan(600);
		expect(Math.abs(zero)).toBeLessThan(Math.abs(full) / 10);
	});

	it('keeps a strictly positive remainder at zero tilt, and it is the distance term', () => {
		const zero = juneAt(0) - decemberAt(0);

		// Distance's contribution: June is near aphelion, December near perihelion,
		// so at zero tilt the northern winter actually gets MORE sunlight. The
		// signed difference is negative; its magnitude is the remainder.
		expect(zero).toBeLessThan(0);
		expect(Math.abs(zero)).toBeGreaterThan(0);

		// The geometric day length itself is exactly 12 h at both solstices at
		// zero tilt (h0 = 0, declination 0), so the remainder is the Sun's
		// intensity, not the length of the day.
		expect(dayLengthHoursForTilt(PARIS, JUNE_SOLSTICE, 0)).toBeCloseTo(12, 9);
		expect(dayLengthHoursForTilt(PARIS, DECEMBER_SOLSTICE, 0)).toBeCloseTo(12, 9);
	});
});

describe('an exaggerated orbit cannot produce opposite seasons', () => {
	const exaggerated = 0.5;

	it('makes the eccentric distance ratio large, ninefold at e = 0.5', () => {
		// ((1+e)/(1−e))²: the ratio of flux at perihelion to flux at aphelion.
		expect(distanceInsolationRatio(exaggerated)).toBeCloseTo(9, 6);
	});

	it('gives both hemispheres the SAME distance term at one instant', () => {
		const paris = insolationContrast(PARIS, JUNE_SOLSTICE, DECEMBER_SOLSTICE, OBLIQUITY_DEG);
		const sydney = insolationContrast(SYDNEY, JUNE_SOLSTICE, DECEMBER_SOLSTICE, OBLIQUITY_DEG);

		// One Earth, one distance: the term cannot be positive for one hemisphere
		// and negative for the other, whatever the eccentricity.
		expect(paris.distanceFactor).toBe(sydney.distanceFactor);
	});

	it('separates the hemispheres by the obliquity term, which changes sign', () => {
		const paris = insolationContrast(PARIS, JUNE_SOLSTICE, DECEMBER_SOLSTICE, OBLIQUITY_DEG);
		const sydney = insolationContrast(SYDNEY, JUNE_SOLSTICE, DECEMBER_SOLSTICE, OBLIQUITY_DEG);

		expect(paris.obliquityFactor).toBeGreaterThan(0);
		expect(sydney.obliquityFactor).toBeLessThan(0);
		// The obliquity term dominates, because that is what makes opposite seasons.
		expect(paris.combined).toBeGreaterThan(0);
		expect(sydney.combined).toBeLessThan(0);
	});

	it('leaves both hemispheres on the same side when the tilt is zero', () => {
		const paris = insolationContrast(PARIS, JUNE_SOLSTICE, DECEMBER_SOLSTICE, 0);
		const sydney = insolationContrast(SYDNEY, JUNE_SOLSTICE, DECEMBER_SOLSTICE, 0);

		expect(paris.obliquityFactor).toBeCloseTo(0, 9);
		expect(sydney.obliquityFactor).toBeCloseTo(0, 9);
		// Only the distance term is left, and it points the same way for both.
		expect(paris.combined).toBeLessThan(0);
		expect(sydney.combined).toBeLessThan(0);
	});
});

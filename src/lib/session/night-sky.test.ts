import { describe, expect, it } from 'vitest';
import { bodyCenterAu } from './observers';
import {
	NIGHT_SKY_STAR_COUNT,
	buildScene,
	createInitialState,
	moonAngularDiameterDeg,
	moonApparentMagnitude,
	moonPhase,
	pointAltitudeAzimuthDeg,
	shortestAngleDeg,
	starField,
	type Observer,
	type SessionState
} from './index';

const at = (iso: string) => Date.parse(iso);

const PARIS: Observer = {
	id: 'paris',
	bodyId: 'earth',
	latitudeDeg: 48.8566,
	colour: '#e69f00'
};

function entryAt(instant: number) {
	const state: SessionState = { ...createInitialState(), instant, observers: [PARIS] };
	const entry = buildScene(state).observers[0];
	if (entry === undefined) throw new Error('missing observer entry');
	return entry;
}

describe('the decorative star field', () => {
	it('returns exactly the same stars for the same seed', () => {
		expect(starField(0x5c1e57a2)).toEqual(starField(0x5c1e57a2));
	});

	it('does not shimmer between two identical scene builds', () => {
		const state = createInitialState();
		const first = starField(0x5c1e57a2);
		buildScene(state);
		const second = starField(0x5c1e57a2);

		expect(second).toEqual(first);
	});

	it('differs for a different seed, so the seed is really the input', () => {
		expect(starField(1)).not.toEqual(starField(2));
	});

	it('places every star above the horizon, on the whole circle', () => {
		const stars = starField(0x5c1e57a2);

		expect(stars).toHaveLength(NIGHT_SKY_STAR_COUNT);
		for (const star of stars) {
			expect(star.altitudeDeg).toBeGreaterThanOrEqual(0);
			expect(star.altitudeDeg).toBeLessThan(90);
			expect(star.azimuthDeg).toBeGreaterThanOrEqual(0);
			expect(star.azimuthDeg).toBeLessThan(360);
			expect(star.brightness).toBeGreaterThanOrEqual(0);
			expect(star.brightness).toBeLessThan(1);
		}
		// Both halves of the sky are populated.
		expect(new Set(stars.map((star) => Math.sign(star.azimuthDeg - 180))).size).toBe(2);
	});
});

describe('the Moon in one POV', () => {
	// 2025-01-04 17:30 UTC, Paris: the Moon is up, the Sun is down.
	const instant = at('2025-01-04T17:30:00Z');

	it('is where the observer geometry puts it', () => {
		const moon = entryAt(instant).moon;
		if (moon === null) throw new Error('missing Moon');

		const expected = pointAltitudeAzimuthDeg(PARIS, bodyCenterAu('moon', instant), instant);

		expect(moon.altitudeDeg).toBeCloseTo(expected.altitudeDeg, 9);
		expect(moon.azimuthDeg).toBeCloseTo(expected.azimuthDeg, 9);
		expect(moon.altitudeDeg).toBeGreaterThan(0);
	});

	it('carries the phase, the size and the brightness the model gives', () => {
		const moon = entryAt(instant).moon;
		if (moon === null) throw new Error('missing Moon');

		expect(moon.illuminatedFraction).toBeCloseTo(moonPhase(instant).illuminatedFraction, 12);
		expect(moon.angularDiameterDeg).toBeCloseTo(moonAngularDiameterDeg(instant), 12);
		expect(moon.apparentMagnitude).toBeCloseTo(moonApparentMagnitude(instant), 12);
	});

	it('points its lit limb at the Sun on the panel', () => {
		const entry = entryAt(instant);
		const moon = entry.moon;
		if (moon === null) throw new Error('missing Moon');

		const towardSun = Math.atan2(
			entry.sunElevationDeg - moon.altitudeDeg,
			shortestAngleDeg(moon.azimuthDeg, entry.sunAzimuthDeg)
		);

		expect(moon.litLimbAngleDeg).toBeCloseTo((towardSun * 180) / Math.PI, 9);
	});

	it('is not drawn for an observer standing on the Moon', () => {
		const onTheMoon: Observer = { ...PARIS, bodyId: 'moon' };
		const state: SessionState = { ...createInitialState(), instant, observers: [onTheMoon] };

		expect(buildScene(state).observers[0]?.moon).toBeNull();
	});

	it('is deterministic: the same state draws the same sky', () => {
		expect(entryAt(instant)).toEqual(entryAt(instant));
	});
});

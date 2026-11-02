import { describe, expect, it } from 'vitest';
import { applyEvent, createInitialState } from './index';
import { bodyDistortion, distortionNotice, DRAWN_EARTH_RADIUS_AU, MOON_ORBIT_DRAWN_AU, MOON_ORBIT_DRAWN_RADII, trueRadiusAu } from './distortion';
import type { BodyId, SessionState } from './types';

const BODIES: readonly BodyId[] = ['sun', 'earth', 'moon'];

function scaleOf(state: SessionState, body: BodyId) {
	return bodyDistortion(state.trueDistance, state.trueSize, body);
}

function withToggles(trueDistance: boolean, trueSize: boolean): SessionState {
	return { ...createInitialState(), trueDistance, trueSize };
}

describe('the scale module', () => {
	it('compresses distances and enlarges radii when both switches are off', () => {
		const earth = bodyDistortion(false, false, 'earth');

		// The Earth sits at 1 AU. Log compression with a 0.01 AU floor draws it
		// at 0.056 AU: about 5.6 drawn Earth radii.
		expect(earth.distanceFactor).toBeCloseTo(0.0560517, 6);
		expect(earth.distanceFactor).toBeLessThan(1);
		expect(earth.radiusFactor).toBeGreaterThan(1);
		expect(trueRadiusAu('earth') * earth.radiusFactor).toBeCloseTo(DRAWN_EARTH_RADIUS_AU, 12);
	});

	it('draws real distances and keeps the radii enlarged when true distance is on', () => {
		const compressed = bodyDistortion(false, false, 'earth');
		const realDistances = bodyDistortion(true, false, 'earth');

		expect(realDistances.distanceFactor).toBe(1);
		// Turning distances real must not shrink the bodies to their real size.
		expect(realDistances.radiusFactor).toBe(compressed.radiusFactor);
		expect(realDistances.radiusFactor).toBeGreaterThan(1);
	});

	it('draws real radii and keeps the distances compressed when true size is on', () => {
		const compressed = bodyDistortion(false, false, 'earth');
		const realSizes = bodyDistortion(false, true, 'earth');

		expect(realSizes.radiusFactor).toBe(1);
		expect(realSizes.distanceFactor).toBe(compressed.distanceFactor);
		expect(realSizes.distanceFactor).toBeLessThan(1);
	});

	it('gives exactly one to both factors when both switches are on', () => {
		for (const body of BODIES) {
			const factors = bodyDistortion(true, true, body);

			expect(factors.distanceFactor, body).toBe(1);
			expect(factors.radiusFactor, body).toBe(1);
		}
	});

	it('never lets a real-scale factor leave the readable range', () => {
		for (const body of BODIES) {
			const readable = bodyDistortion(false, false, body);

			expect(readable.distanceFactor, body).toBeGreaterThan(0);
			// Every body but the Moon is only ever compressed. The Moon's orbit is
			// *stretched* to a readable radius, because its true one is inside the
			// enlarged globe (ticket 14; see the module header).
			if (body !== 'moon') expect(readable.distanceFactor, body).toBeLessThanOrEqual(1);
			expect(readable.radiusFactor, body).toBeGreaterThan(1);
		}
	});

	it('compresses far distances more than near ones, monotonically', () => {
		const earth = bodyDistortion(false, false, 'earth');
		const moon = bodyDistortion(false, false, 'moon');

		// The Earth is compressed; the Moon's orbit is drawn at a readable radius
		// instead of its true one, which is inside the enlarged Earth.
		expect(moon.distanceFactor).toBeGreaterThan(1);
		expect(earth.distanceFactor).toBeLessThan(moon.distanceFactor);
		// The Sun is the origin: there is no distance to compress.
		expect(bodyDistortion(false, false, 'sun').distanceFactor).toBe(1);
	});

	it('draws the Moon\'s orbit outside the globe, and true when true distance is on', () => {
		const readable = bodyDistortion(false, false, 'moon');
		// Mean lunar distance, 384 400 km, drawn at 2.5 Earth radii.
		const drawnAu = (384_400 / 149_597_870.7) * readable.distanceFactor;
		expect(drawnAu).toBeCloseTo(MOON_ORBIT_DRAWN_AU, 12);
		expect(drawnAu / DRAWN_EARTH_RADIUS_AU).toBeCloseTo(MOON_ORBIT_DRAWN_RADII, 12);

		// True distance is honest, even when it hides the Moon inside the globe.
		expect(bodyDistortion(true, false, 'moon').distanceFactor).toBe(1);
	});

	it('keeps the Earth and the Moon in proportion, and caps the Sun', () => {
		const earth = bodyDistortion(false, false, 'earth');
		const moon = bodyDistortion(false, false, 'moon');
		const sun = bodyDistortion(false, false, 'sun');

		// One enlargement for every small body, so their relative sizes stay true.
		expect(moon.radiusFactor).toBeCloseTo(earth.radiusFactor, 12);

		// The Sun gets the same enlargement but is capped at twice the drawn
		// Earth radius: 109 Earth radii would swallow the compressed orbit.
		const drawnSunAu = trueRadiusAu('sun') * sun.radiusFactor;
		expect(drawnSunAu).toBeCloseTo(2 * DRAWN_EARTH_RADIUS_AU, 12);
		expect(sun.radiusFactor).toBeGreaterThan(1);
	});
});

describe('the distortion notice', () => {
	it('names both distortions when both switches are off', () => {
		expect(distortionNotice(withToggles(false, false))).toEqual([
			'distortion.distancesNotToScale',
			'distortion.sizesNotToScale'
		]);
	});

	it('names only the sizes when distances are true', () => {
		expect(distortionNotice(withToggles(true, false))).toEqual(['distortion.sizesNotToScale']);
	});

	it('names only the distances when sizes are true', () => {
		expect(distortionNotice(withToggles(false, true))).toEqual(['distortion.distancesNotToScale']);
	});

	it('says nothing only when both switches are on', () => {
		expect(distortionNotice(withToggles(true, true))).toEqual([]);

		for (const trueDistance of [false, true]) {
			for (const trueSize of [false, true]) {
				const notice = distortionNotice(withToggles(trueDistance, trueSize));
				if (trueDistance && trueSize) expect(notice).toHaveLength(0);
				else expect(notice.length).toBeGreaterThan(0);
			}
		}
	});
});

describe('the scale toggle events', () => {
	it('starts with both switches off, so the readable default is what a first visit sees', () => {
		const state = createInitialState();

		expect(state.trueDistance).toBe(false);
		expect(state.trueSize).toBe(false);
		expect(distortionNotice(state)).toHaveLength(2);
	});

	it('flips one switch and leaves the rest of the state alone', () => {
		const state = createInitialState();

		const distanceOn = applyEvent(state, { type: 'toggle-true-distance' }).state;
		expect(distanceOn.trueDistance).toBe(true);
		expect(distanceOn.trueSize).toBe(state.trueSize);
		expect({ ...distanceOn, trueDistance: false }).toEqual(state);

		const sizeOn = applyEvent(state, { type: 'toggle-true-size' }).state;
		expect(sizeOn.trueSize).toBe(true);
		expect(sizeOn.trueDistance).toBe(state.trueDistance);
		expect({ ...sizeOn, trueSize: false }).toEqual(state);
	});

	it('comes back to the same state after a double dispatch', () => {
		const state = createInitialState();

		const twiceDistance = applyEvent(
			applyEvent(state, { type: 'toggle-true-distance' }).state,
			{ type: 'toggle-true-distance' }
		).state;
		const twiceSize = applyEvent(
			applyEvent(state, { type: 'toggle-true-size' }).state,
			{ type: 'toggle-true-size' }
		).state;

		expect(twiceDistance).toEqual(state);
		expect(twiceSize).toEqual(state);
	});

	it('keeps the two switches independent', () => {
		const state = createInitialState();
		const both = applyEvent(
			applyEvent(state, { type: 'toggle-true-distance' }).state,
			{ type: 'toggle-true-size' }
		).state;

		expect(both.trueDistance).toBe(true);
		expect(both.trueSize).toBe(true);
		expect(distortionNotice(both)).toEqual([]);

		const one = applyEvent(both, { type: 'toggle-true-distance' }).state;
		expect(one.trueDistance).toBe(false);
		expect(one.trueSize).toBe(true);
	});

	it('re-derives the scene so the renderer never keeps a stale factor', () => {
		const state = createInitialState();
		const result = applyEvent(state, { type: 'toggle-true-distance' });

		expect(result.scene.bodies.map((body) => body.id).sort()).toEqual([...state.subsystem].sort());
		// The same instant, so the positions are untouched; the factors moved.
		expect(result.scene.bodies.map((body) => body.position)).toEqual(
			applyEvent(state, { type: 'scrub-to', instant: state.instant }).scene.bodies.map(
				(body) => body.position
			)
		);
	});
});

describe('the factors reach the scene snapshot', () => {
	it('carries one pair of factors per drawn body', () => {
		const state = withToggles(true, false);
		const { scene } = applyEvent(state, { type: 'scrub-to', instant: state.instant });

		for (const body of scene.bodies) {
			expect(body.distanceFactor, body.id).toBe(scaleOf(state, body.id).distanceFactor);
			expect(body.radiusFactor, body.id).toBe(scaleOf(state, body.id).radiusFactor);
		}
	});
});

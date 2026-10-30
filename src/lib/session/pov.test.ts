import { describe, expect, it } from 'vitest';
import {
	HORIZON_FRACTION,
	applyEvent,
	buildScene,
	createInitialState,
	isDaylight,
	skyToScreen,
	sunAzimuthDeg,
	sunElevationDeg,
	type Observer,
	type SessionState
} from './index';

const DAY = 86_400_000;

function observer(id: string, latitudeDeg: number, colour = '#e69f00'): Observer {
	return { id, bodyId: 'earth', latitudeDeg, colour };
}

function maxElevationOnDay(observerToUse: Observer, dayStart: number) {
	let best = -Infinity;
	let bestInstant = dayStart;

	for (let minute = 0; minute < 24 * 60; minute += 1) {
		const instant = dayStart + minute * 60_000;
		const elevation = sunElevationDeg(observerToUse, instant);
		if (elevation > best) {
			best = elevation;
			bestInstant = instant;
		}
	}

	return { elevation: best, instant: bestInstant };
}

describe('the Sun above an observer horizon', () => {
	it('stands at the published Paris noon altitude at the June solstice', () => {
		const paris = observer('paris', 48.8566);
		const { elevation } = maxElevationOnDay(paris, Date.parse('2025-06-21T00:00:00Z'));

		// Published 64.6° (IMCCE / Harth / Giesen); ASTRONOMY.md row 1.
		expect(elevation).toBeGreaterThan(64.4);
		expect(elevation).toBeLessThan(64.8);
	});

	it('is 90° minus the latitude at the equinox noon', () => {
		const paris = observer('paris', 48.8566);
		const { elevation } = maxElevationOnDay(paris, Date.parse('2025-03-20T00:00:00Z'));

		expect(elevation).toBeCloseTo(90 - 48.8566, 0);
	});

	it('stays up all day at a polar latitude, whatever the clock says', () => {
		// Longyearbyen, 03:00 UTC on the June solstice: a clock calls this night,
		// the geometric Sun does not. Daylight must not read the clock.
		const svalbard = observer('svalbard', 78.22);
		const instant = Date.parse('2025-06-21T03:00:00Z');

		expect(sunElevationDeg(svalbard, instant)).toBeGreaterThan(0);
		expect(isDaylight(svalbard, instant)).toBe(true);

		// The same latitude six months later is in polar night at local noon.
		expect(isDaylight(svalbard, Date.parse('2025-12-21T12:00:00Z'))).toBe(false);
	});

	it('reports an azimuth of due south at Paris solar noon in June', () => {
		const paris = observer('paris', 48.8566);
		const { instant } = maxElevationOnDay(paris, Date.parse('2025-06-21T00:00:00Z'));

		expect(sunAzimuthDeg(paris, instant)).toBeCloseTo(180, 0);
	});
});

describe('daylight is the sign of the elevation, never a clock', () => {
	it('agrees with elevation > 0 at 200 instants and three latitudes', () => {
		const latitudes = [-33.8688, 0, 78.22];
		const from = Date.parse('2025-01-01T00:00:00Z');
		const to = Date.parse('2026-01-01T00:00:00Z');
		let seed = 0x5eed;

		const random = () => {
			seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
			return seed / 0x1_0000_0000;
		};

		for (const latitude of latitudes) {
			const place = observer(`lat-${latitude}`, latitude);
			for (let sample = 0; sample < 200; sample += 1) {
				const instant = from + random() * (to - from);
				expect(isDaylight(place, instant)).toBe(sunElevationDeg(place, instant) > 0);
			}
		}
	});

	it('flips exactly when the dot crosses the terminator, and nowhere else within a second', () => {
		const paris = observer('paris', 48.8566);
		const dayStart = Date.parse('2025-03-20T00:00:00Z');
		const step = 5 * 60_000;
		let previous = sunElevationDeg(paris, dayStart);
		let crossings = 0;

		for (let at = dayStart + step; at < dayStart + DAY; at += step) {
			const current = sunElevationDeg(paris, at);

			if (Math.sign(previous) !== Math.sign(current)) {
				// Bisect the continuous elevation to the crossing instant.
				let low = at - step;
				let high = at;
				for (let iteration = 0; iteration < 60; iteration += 1) {
					const middle = (low + high) / 2;
					if (Math.sign(sunElevationDeg(paris, middle)) === Math.sign(previous)) low = middle;
					else high = middle;
				}
				const crossing = (low + high) / 2;

				expect(Math.abs(sunElevationDeg(paris, crossing))).toBeLessThan(1e-6);
				// One sign change in the whole ±1 s window around the crossing.
				let changes = 0;
				let before = isDaylight(paris, crossing - 1000);
				for (let offset = -990; offset <= 1000; offset += 10) {
					const after = isDaylight(paris, crossing + offset);
					if (after !== before) changes += 1;
					before = after;
				}
				expect(changes).toBe(1);
				expect(isDaylight(paris, crossing - 1000)).not.toBe(isDaylight(paris, crossing + 1000));
				crossings += 1;
			}

			previous = current;
		}

		expect(crossings).toBe(2);
	});
});

describe('observer identity and colour', () => {
	function place(state: SessionState, povId: string, latitudeDeg: number): SessionState {
		return applyEvent(state, { type: 'place-observer', povId, latitudeDeg }).state;
	}

	it('gives three observers three distinct colours that survive time', () => {
		let state: SessionState = { ...createInitialState(), observers: [] };

		state = place(state, 'pov-1', 48.8566);
		state = place(state, 'pov-2', 0);
		state = place(state, 'pov-3', 78.22);

		const colours = state.observers.map((placed) => placed.colour);
		expect(colours).toHaveLength(3);
		expect(new Set(colours).size).toBe(3);

		const later = applyEvent(state, {
			type: 'scrub-to',
			instant: Date.parse('2025-09-01T00:00:00Z')
		}).state;

		expect(later.observers.map((placed) => placed.id)).toEqual(['pov-1', 'pov-2', 'pov-3']);
		expect(later.observers.map((placed) => placed.colour)).toEqual(colours);
	});

	it('keeps the colour of an observer moved along its meridian', () => {
		let state: SessionState = { ...createInitialState(), observers: [] };
		state = place(state, 'pov-1', 10);
		const colour = state.observers[0]?.colour;

		const moved = place(state, 'pov-1', 40);

		expect(moved.observers).toHaveLength(1);
		expect(moved.observers[0]?.latitudeDeg).toBe(40);
		expect(moved.observers[0]?.colour).toBe(colour);
	});

	it('draws the observer as a dot whose surface normal is part of the snapshot', () => {
		const paris = observer('paris', 48.8566);
		const scene = buildScene({ ...createInitialState(), observers: [paris] });
		const entry = scene.observers[0];
		if (entry === undefined) throw new Error('missing observer entry');

		expect(entry.observer.id).toBe('paris');
		expect(
			entry.surfaceNormal.x ** 2 + entry.surfaceNormal.y ** 2 + entry.surfaceNormal.z ** 2
		).toBeCloseTo(1, 12);
	});
});

describe('skyToScreen, the pure altitude/azimuth mapper', () => {
	const viewport = { width: 300, height: 200 };
	const horizon = viewport.height * HORIZON_FRACTION;

	it('puts altitude 0 on the horizon line', () => {
		expect(skyToScreen(0, 180, viewport).y).toBeCloseTo(horizon, 12);
	});

	it('puts altitude 90 at the top of the panel', () => {
		expect(skyToScreen(90, 180, viewport).y).toBeCloseTo(0, 12);
	});

	it('keeps every altitude above 0 in the sky and every altitude below it in the ground', () => {
		for (const altitude of [1, 12, 45, 89]) {
			expect(skyToScreen(altitude, 180, viewport).y).toBeLessThan(horizon);
		}
		for (const altitude of [-1, -12, -45, -89]) {
			expect(skyToScreen(altitude, 180, viewport).y).toBeGreaterThan(horizon);
		}
	});

	it('clamps a Sun under the ground at the bottom of the panel', () => {
		expect(skyToScreen(-90, 180, viewport).y).toBeCloseTo(viewport.height, 12);
		expect(skyToScreen(-180, 180, viewport).y).toBeCloseTo(viewport.height, 12);
	});

	it('maps azimuth clockwise from north, with south in the middle', () => {
		expect(skyToScreen(45, 0, viewport).x).toBeCloseTo(0, 12);
		expect(skyToScreen(45, 90, viewport).x).toBeCloseTo(viewport.width / 4, 12);
		expect(skyToScreen(45, 180, viewport).x).toBeCloseTo(viewport.width / 2, 12);
		expect(skyToScreen(45, 270, viewport).x).toBeCloseTo((3 * viewport.width) / 4, 12);
		expect(skyToScreen(45, 360, viewport).x).toBeCloseTo(0, 12);
	});
});

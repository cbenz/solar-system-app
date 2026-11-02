import { describe, expect, it } from 'vitest';
import { AU_KM, earthSunDistanceAu } from './ephemeris';
import { UnhandledSessionEventError, applyEvent, buildScene, createInitialState } from './index';
import type { BodyId, Observer, SceneSnapshot, SessionState } from './types';

const DAY = 86_400_000;

function scrub(state: SessionState, instant: number) {
	return applyEvent(state, { type: 'scrub-to', instant });
}

function bodyPosition(scene: SceneSnapshot, id: BodyId) {
	const body = scene.bodies.find((candidate) => candidate.id === id);
	if (body === undefined) throw new Error(`missing body ${id}`);
	return body.position;
}

/** A deterministic pseudo-random sequence, so a failure is reproducible. */
function lcg(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) >>> 0;
		return state / 0x1_0000_0000;
	};
}

describe('the session module', () => {
	it('answers a scrub-to with the new state and a scene snapshot', () => {
		const state = createInitialState();
		const instant = Date.parse('2025-07-01T00:00:00Z');
		const result = scrub(state, instant);

		expect(result.state.instant).toBe(instant);
		expect(result.state.mode).toBe('sandbox');
		expect(result.scene.bodies.map((body) => body.id)).toEqual([
			'sun',
			'earth',
			'moon',
			'mercury',
			'venus',
			'mars',
			'jupiter',
			'saturn',
			'uranus',
			'neptune'
		]);
		// Ticket 05 seeds one observer so a POV is visible before placement exists.
		expect(result.scene.observers).toHaveLength(1);
		expect(result.scene.observers[0]?.observer.id).toBe('pov-1');
	});

	it('draws the whole solar system in the sandbox map', () => {
		const scene = buildScene(createInitialState());

		expect(scene.bodies.map((body) => body.id)).toEqual([
			'sun',
			'earth',
			'moon',
			'mercury',
			'venus',
			'mars',
			'jupiter',
			'saturn',
			'uranus',
			'neptune'
		]);
		// A planet is a body in the map, not an activity: it carries no marker.
		const planetIds = new Set(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
		expect(scene.markers.every((marker) => !planetIds.has(marker.bodyId))).toBe(true);
	});

	it('leaves the state untouched when the instant does not move', () => {
		const state = createInitialState();
		const result = scrub(state, state.instant);

		expect(result.state).toBe(state);
	});

	it('clamps a scrub outside the declared span', () => {
		const state = createInitialState();
		const before = scrub(state, state.timeSpan.fromInstant - 10 * DAY);
		const after = scrub(state, state.timeSpan.toInstant + 10 * DAY);

		expect(before.state.instant).toBe(state.timeSpan.fromInstant);
		expect(after.state.instant).toBe(state.timeSpan.toInstant);
	});

	it('rejects an event no ticket has implemented yet, naming it', () => {
		const state = createInitialState();

		expect(() => applyEvent(state, { type: 'switch-subsystem', subsystem: ['sun'] })).toThrow(
			/switch-subsystem/
		);
		// `set-setting` is implemented (tickets 07 and 16), so the unimplemented
		// example has to be one that still is. Nothing implements
		// `switch-subsystem` yet.
		expect(() => applyEvent(state, { type: 'switch-subsystem', subsystem: ['sun'] })).toThrow(
			UnhandledSessionEventError
		);
	});

	it('switches the interface language without touching anything else', () => {
		const state = createInitialState({ locale: 'en' });

		const after = applyEvent(state, { type: 'set-locale', locale: 'fr' });

		expect(after.state.locale).toBe('fr');
		expect(after.state.instant).toBe(state.instant);
		expect(after.state.observers).toEqual(state.observers);
		expect(after.scene).toEqual(applyEvent(state, { type: 'set-locale', locale: 'fr' }).scene);
		// Asking again for the language already active is a no-op, not a new state.
		expect(applyEvent(after.state, { type: 'set-locale', locale: 'fr' }).state).toBe(after.state);
	});

	it('places the Earth one AU from the Sun, on the ecliptic', () => {
		const scene = buildScene(createInitialState());
		const sun = bodyPosition(scene, 'sun');
		const earth = bodyPosition(scene, 'earth');
		const distance = Math.hypot(earth.x - sun.x, earth.y - sun.y, earth.z - sun.z);

		expect(sun).toEqual({ x: 0, y: 0, z: 0 });
		expect(distance).toBeGreaterThan(0.98);
		expect(distance).toBeLessThan(1.02);
		expect(Math.abs(earth.z)).toBeLessThan(1e-9);
	});

	it('puts the Moon close to the Earth, within its real perigee and apogee', () => {
		const scene = buildScene(createInitialState());
		const earth = bodyPosition(scene, 'earth');
		const moon = bodyPosition(scene, 'moon');
		const distanceKm = Math.hypot(moon.x - earth.x, moon.y - earth.y, moon.z - earth.z) * AU_KM;

		expect(distanceKm).toBeGreaterThan(356_000);
		expect(distanceKm).toBeLessThan(407_000);
	});
});

describe('scrubbing is exactly reversible', () => {
	it('returns the same state and scene after a round trip through many instants', () => {
		const start = createInitialState({ instant: Date.parse('2025-01-15T00:00:00Z') });
		const forward: number[] = [];

		let state = start;
		for (let step = 1; step <= 24; step += 1) {
			const instant = start.instant + step * 14 * DAY;
			forward.push(instant);
			state = scrub(state, instant).state;
		}

		const atEnd = scrub(state, start.instant + 24 * 14 * DAY);

		let back = atEnd.state;
		for (const instant of forward.slice(0, -1).reverse()) {
			back = scrub(back, instant).state;
		}

		const roundTripped = scrub(back, start.instant);

		expect(roundTripped.state).toEqual(start);
		expect(roundTripped.scene).toEqual(buildScene(start));
	});

	it('gives bit-for-bit identical positions for the same instant, whatever the path', () => {
		const state = createInitialState();
		const target = Date.parse('2025-09-01T00:00:00Z');

		const direct = scrub(state, target);
		const wandering = scrub(
			scrub(scrub(state, Date.parse('2025-12-01T00:00:00Z')).state, Date.parse('2025-02-01T00:00:00Z')).state,
			target
		);

		expect(wandering.state.instant).toBe(direct.state.instant);
		expect(wandering.scene).toEqual(direct.scene);
	});
});

describe('properties that must hold at every instant', () => {
	it('keeps the Earth between 0.98 and 1.02 AU from the Sun over 200 random instants', () => {
		const random = lcg(0x5eed);
		const from = Date.parse('2024-01-01T00:00:00Z');
		const to = Date.parse('2026-12-31T00:00:00Z');

		for (let sample = 0; sample < 200; sample += 1) {
			const instant = from + random() * (to - from);
			const distance = earthSunDistanceAu(instant);

			expect(distance).toBeGreaterThan(0.98);
			expect(distance).toBeLessThan(1.02);
		}
	});

	it('is deterministic: the same instant yields the same Earth position', () => {
		const random = lcg(0xc0ffee);
		const from = Date.parse('2024-01-01T00:00:00Z');
		const to = Date.parse('2026-12-31T00:00:00Z');

		for (let sample = 0; sample < 200; sample += 1) {
			const instant = from + random() * (to - from);
			const first = earthSunDistanceAu(instant);
			const second = earthSunDistanceAu(instant);

			expect(second).toBe(first);
		}
	});

	it('never moves a body that stays present when the subsystem shrinks', () => {
		const state = createInitialState();
		const full = buildScene(state);
		const narrowed = buildScene({ ...state, subsystem: ['sun', 'earth'] });

		expect(narrowed.bodies.map((body) => body.id)).toEqual(['sun', 'earth']);
		expect(bodyPosition(narrowed, 'sun')).toEqual(bodyPosition(full, 'sun'));
		expect(bodyPosition(narrowed, 'earth')).toEqual(bodyPosition(full, 'earth'));
	});
});

describe('observers in the scene snapshot', () => {
	const equator: Observer = {
		id: 'pov-1',
		bodyId: 'earth',
		latitudeDeg: 0,
		colour: '#e69f00'
	};

	function withObserver(instant: number): SceneSnapshot {
		return buildScene({ ...createInitialState(), observers: [equator], instant });
	}

	it('reports the Sun high overhead at noon and below the horizon at midnight', () => {
		// GMST ≈ 0 at 12:00 UTC on the March equinox: longitude 0 faces the Sun.
		const noon = withObserver(Date.parse('2025-03-20T12:00:00Z'));
		const midnight = withObserver(Date.parse('2025-03-21T00:00:00Z'));

		const noonObserver = noon.observers[0];
		const midnightObserver = midnight.observers[0];

		expect(noonObserver?.sunElevationDeg).toBeGreaterThan(85);
		expect(noonObserver?.daylight).toBe(true);
		expect(midnightObserver?.sunElevationDeg).toBeLessThan(-85);
		expect(midnightObserver?.daylight).toBe(false);
	});

	it('agrees with the published Paris noon elevation at the June solstice', () => {
		const paris: Observer = {
			id: 'pov-paris',
			bodyId: 'earth',
			latitudeDeg: 48.8566,
			colour: '#e69f00'
		};

		// Find local solar noon on the solstice day: the elevation peaks there.
		const dayStart = Date.parse('2025-06-21T00:00:00Z');
		const scene = buildScene({ ...createInitialState(), observers: [paris], instant: dayStart });

		let best = -Infinity;
		for (let minute = 0; minute < 24 * 60; minute += 1) {
			const instant = dayStart + minute * 60_000;
			const snapshot = buildScene({ ...createInitialState(), observers: [paris], instant });
			best = Math.max(best, snapshot.observers[0]?.sunElevationDeg ?? -Infinity);
		}

		// Published 64.6° (IMCCE / Harth / Giesen); ±0.2° swallows the obliquity
		// approximation and the minute-by-minute sampling.
		expect(best).toBeGreaterThan(64.4);
		expect(best).toBeLessThan(64.8);
		expect(scene.observers[0]?.observer).toEqual(paris);
	});
});

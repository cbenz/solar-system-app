import { describe, expect, it } from 'vitest';
import {
	LIMITING_MAGNITUDE,
	MIN_VISIBLE_ANGULAR_DIAMETER_DEG,
	applyEvent,
	buildScene,
	createInitialState,
	isAboveVisibilityLimit,
	moonApparentMagnitude,
	moonPhase,
	sunElevationDeg,
	visibilityLimitEnabled,
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

function stateAt(instant: number, settings: Record<string, number | boolean> = {}): SessionState {
	// The sandbox span already contains these 2025 instants; a zero-length span
	// would be rejected and reset the instant.
	return createInitialState({ instant, settings });
}

function entryFor(state: SessionState) {
	const entry = buildScene(state).observers[0];
	if (entry === undefined) throw new Error('missing observer entry');
	return entry;
}

/** Toggling is a session event, never a component's own flag. */
function withLimit(state: SessionState, on: boolean): SessionState {
	return applyEvent(state, { type: 'set-setting', key: 'visibilityLimit', value: on }).state;
}

describe('the visibility limit rule', () => {
	const night = { elevationDeg: 40, sunElevationDeg: -20 };

	it('rejects a body below the horizon whatever its magnitude', () => {
		expect(
			isAboveVisibilityLimit({
				elevationDeg: -1,
				sunElevationDeg: -20,
				apparentMagnitude: -12,
				angularDiameterDeg: 0.5
			})
		).toBe(false);
	});

	it('keeps a bright body above the limiting magnitude', () => {
		expect(
			isAboveVisibilityLimit({ ...night, apparentMagnitude: 5.5, angularDiameterDeg: 0.5 })
		).toBe(true);
	});

	it('hides a body fainter than the limiting magnitude', () => {
		expect(
			isAboveVisibilityLimit({ ...night, apparentMagnitude: 7, angularDiameterDeg: 0.5 })
		).toBe(false);
	});

	it('adds extinction near the horizon, where the air is thickest', () => {
		const nearHorizon = { elevationDeg: 2, sunElevationDeg: -20, apparentMagnitude: 5.9, angularDiameterDeg: 0.5 };
		const high = { ...nearHorizon, elevationDeg: 60 };

		expect(isAboveVisibilityLimit(nearHorizon)).toBe(false);
		expect(isAboveVisibilityLimit(high)).toBe(true);
	});

	it('hides a body the eye could not resolve, however bright it is', () => {
		expect(
			isAboveVisibilityLimit({
				...night,
				apparentMagnitude: -10,
				angularDiameterDeg: MIN_VISIBLE_ANGULAR_DIAMETER_DEG / 2
			})
		).toBe(false);
	});

	it('hides a body lost in daylight unless it beats −4, as the half Moon does', () => {
		const daylight = { elevationDeg: 40, sunElevationDeg: 30 };

		// A half Moon at −10 is plainly visible at 10 a.m. (ASTRONOMY.md §6.3).
		expect(
			isAboveVisibilityLimit({ ...daylight, apparentMagnitude: -10, angularDiameterDeg: 0.5 })
		).toBe(true);
		// A thin crescent at −3.8 is not.
		expect(
			isAboveVisibilityLimit({ ...daylight, apparentMagnitude: -3.8, angularDiameterDeg: 0.5 })
		).toBe(false);
	});

	it('names the naked-eye limit in one constant', () => {
		expect(LIMITING_MAGNITUDE).toBe(6.0);
	});
});

describe('visibleBodies, limit on and off at the same instant', () => {
	// 2025-03-29 10:00 UTC, Paris: the Moon is 37.7° up and the Sun is 37.5° up,
	// a thin crescent (m ≈ −3.8). Above the horizon, lost in daylight.
	const daylightCrescent = at('2025-03-29T10:00:00Z');

	it('lists the Moon when the limit is off and drops it when the limit is on', () => {
		const off = entryFor(stateAt(daylightCrescent));
		const on = entryFor(withLimit(stateAt(daylightCrescent), true));

		// The preconditions of the case, so the test cannot silently go stale.
		expect(off.moon?.altitudeDeg).toBeGreaterThan(0);
		expect(off.sunElevationDeg).toBeGreaterThan(0);
		expect(moonApparentMagnitude(daylightCrescent)).toBeGreaterThan(-4);

		expect(off.visibleBodies).toContain('moon');
		expect(off.visibleBodies).toContain('sun');
		expect(on.visibleBodies).not.toContain('moon');
		expect(on.visibleBodies).toContain('sun');

		// Turning it off again shows the body again: same instant, same state.
		const backOff = entryFor(withLimit(withLimit(stateAt(daylightCrescent), true), false));
		expect(backOff.visibleBodies).toEqual(off.visibleBodies);
	});

	it('never lists a body below the horizon, limit or not', () => {
		// 2025-01-04 17:30 UTC, Paris: Moon 30° up, Sun 11° below.
		const night = at('2025-01-04T17:30:00Z');
		const off = entryFor(stateAt(night));
		const on = entryFor(withLimit(stateAt(night), true));

		expect(sunElevationDeg(PARIS, night)).toBeLessThan(0);
		expect(off.moon?.altitudeDeg).toBeGreaterThan(0);

		expect(off.visibleBodies).toEqual(['moon']);
		expect(on.visibleBodies).toEqual(['moon']);
		expect(off.visibilityLimit).toBe(false);
		expect(on.visibilityLimit).toBe(true);
		expect(on.moon?.illuminatedFraction).toBeCloseTo(moonPhase(night).illuminatedFraction, 12);
	});
});

describe('the setting itself', () => {
	it('defaults to off and flips through set-setting', () => {
		const state = createInitialState();
		expect(visibilityLimitEnabled(state)).toBe(false);

		const on = withLimit(state, true);
		expect(on.settings.visibilityLimit).toBe(true);
		expect(visibilityLimitEnabled(on)).toBe(true);

		// Asking for the value already stored is a no-op, not a new state.
		expect(withLimit(on, true)).toBe(on);
	});

	it('leaves every other setting and field alone', () => {
		const state = createInitialState();
		const on = withLimit(state, true);

		expect(on.instant).toBe(state.instant);
		expect(on.observers).toEqual(state.observers);
		expect(on.settings.playbackSpeed).toBe(state.settings.playbackSpeed);
	});
});

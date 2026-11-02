import { describe, expect, it } from 'vitest';
import { fixtureActivity } from '../../activities/__fixtures__/fixture.activity';
import {
	applyEvent,
	bodyParameters,
	createInitialState,
	earthHeliocentricPositionAu,
	escapeSpeedKmPerS,
	hasEscaped,
	sunDirectionFromEarth,
	type BodyId,
	type SceneSnapshot,
	type SessionState,
	type Vec3
} from './index';

const DAY = 86_400_000;
const activities = [fixtureActivity];

function sandbox(): SessionState {
	return createInitialState({
		activities,
		instant: Date.UTC(2025, 2, 20, 12, 0, 0)
	});
}

/** A twenty-year window, so an escape can be followed past the default year. */
function wideSandbox(): SessionState {
	const from = Date.UTC(2025, 0, 1);
	return createInitialState({
		activities,
		instant: Date.UTC(2025, 2, 20, 12, 0, 0),
		timeSpan: { fromInstant: from, toInstant: from + 4000 * DAY }
	});
}

function body(scene: SceneSnapshot, id: BodyId) {
	const found = scene.bodies.find((candidate) => candidate.id === id);
	if (found === undefined) throw new Error(`missing body ${id}`);
	return found;
}

function distance(scene: SceneSnapshot, id: BodyId): number {
	const { x, y, z } = body(scene, id).position;
	return Math.hypot(x, y, z);
}

function relativeDistance(scene: SceneSnapshot, id: BodyId, primary: BodyId): number {
	const a = body(scene, id).position;
	const b = body(scene, primary).position;
	return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function openCard(state: SessionState, bodyId: BodyId): SessionState {
	return applyEvent(state, { type: 'select-body', bodyId }).state;
}

/** Select, press the pencil, then one parameter change. */
function edit(state: SessionState, bodyId: BodyId, parameter: 'mass' | 'distance' | 'speed', value: number) {
	let next = openCard(state, bodyId);
	next = applyEvent(next, { type: 'begin-body-edit', bodyId }).state;
	return applyEvent(next, { type: 'set-body-parameter', bodyId, parameter, value });
}

function scrub(state: SessionState, instant: number) {
	return applyEvent(state, { type: 'scrub-to', instant }).state;
}

describe('the properties card', () => {
	it('shows the published Earth mass, distance and speed before any edit', () => {
		const state = sandbox();
		const parameters = bodyParameters(state, 'earth');

		expect(parameters.massKg).toBeCloseTo(5.9722e24, -20);
		expect(parameters.distanceAu).toBeCloseTo(1, 2);
		// Earth's published mean orbital speed is 29.78 km/s; the instantaneous
		// value moves with the orbit, so the check is a band, not a constant.
		expect(parameters.speedKmPerS).toBeGreaterThan(29.3);
		expect(parameters.speedKmPerS).toBeLessThan(30.5);
		expect(parameters.periodDays).toBeCloseTo(365.25, 0);
		expect(parameters.escaped).toBe(false);
	});

	it('refuses a parameter change until the pencil is pressed', () => {
		const state = openCard(sandbox(), 'earth');
		const after = applyEvent(state, {
			type: 'set-body-parameter',
			bodyId: 'earth',
			parameter: 'distance',
			value: 2
		}).state;

		expect(after).toBe(state);
	});

	it('refuses values that are not positive finite numbers', () => {
		const opened = openCard(sandbox(), 'earth');
		const editing = applyEvent(opened, { type: 'begin-body-edit', bodyId: 'earth' }).state;

		for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			const after = applyEvent(editing, {
				type: 'set-body-parameter',
				bodyId: 'earth',
				parameter: 'distance',
				value
			}).state;
			expect(after, `value ${value}`).toBe(editing);
		}
	});

	it('restores the committed values when the edit is cancelled', () => {
		const opened = openCard(sandbox(), 'earth');
		const before = applyEvent(opened, { type: 'begin-body-edit', bodyId: 'earth' });
		const edited = applyEvent(before.state, {
			type: 'set-body-parameter',
			bodyId: 'earth',
			parameter: 'distance',
			value: 2
		});
		expect(bodyParameters(edited.state, 'earth').distanceAu).toBeCloseTo(2, 6);

		const cancelled = applyEvent(edited.state, { type: 'cancel-body-edit' });

		expect(bodyParameters(cancelled.state, 'earth').distanceAu).toBeCloseTo(
			bodyParameters(opened, 'earth').distanceAu ?? 0,
			12
		);
		expect(cancelled.scene).toEqual(buildSceneOf(opened));
		expect(cancelled.state.sandbox.orbits.earth).toBeUndefined();
	});

	it('keeps the edit when it is confirmed', () => {
		const edited = edit(sandbox(), 'earth', 'distance', 2);
		const confirmed = applyEvent(edited.state, { type: 'confirm-body-edit' }).state;

		expect(confirmed.sandbox.editBaseline).toBeNull();
		expect(bodyParameters(confirmed, 'earth').distanceAu).toBeCloseTo(2, 6);
	});

	function buildSceneOf(state: SessionState) {
		return applyEvent(state, { type: 'set-locale', locale: state.locale }).scene;
	}
});

describe('editing a parameter', () => {
	it('keeps the position continuous at the edit instant', () => {
		const state = sandbox();
		const before = body(applyEvent(state, { type: 'scrub-to', instant: state.instant }).scene, 'earth')
			.position;

		const edited = edit(state, 'earth', 'distance', 2);
		const after = body(edited.scene, 'earth').position;

		expect(after.x).toBeCloseTo(before.x, 9);
		expect(after.y).toBeCloseTo(before.y, 9);
		expect(after.z).toBeCloseTo(before.z, 9);
	});

	it('gives a greater mean distance and a longer period when the semi-major axis grows', () => {
		const state = sandbox();
		const edited = edit(state, 'earth', 'distance', 2);
		const parameters = bodyParameters(edited.state, 'earth');

		expect(parameters.distanceAu).toBeCloseTo(2, 6);
		// Kepler's third law at 2 AU: 2^1.5 sidereal years ≈ 1033 d.
		expect(parameters.periodDays).toBeCloseTo(1033, 0);

		const later = applyEvent(edited.state, {
			type: 'scrub-to',
			instant: state.instant + 30 * DAY
		});
		expect(distance(later.scene, 'earth')).toBeGreaterThan(
			distance(edited.scene, 'earth')
		);
	});

	it('falls inward when the semi-major axis shrinks', () => {
		const state = sandbox();
		const edited = edit(state, 'earth', 'distance', 0.6);

		expect(bodyParameters(edited.state, 'earth').periodDays).toBeLessThan(365);
		const later = applyEvent(edited.state, {
			type: 'scrub-to',
			instant: state.instant + 5 * DAY
		});
		expect(distance(later.scene, 'earth')).toBeLessThan(
			distance(edited.scene, 'earth')
		);
	});

	it('refuses a semi-major axis that the current radius cannot support', () => {
		const state = sandbox();
		const edited = edit(state, 'earth', 'distance', 2);
		const refused = applyEvent(edited.state, {
			type: 'set-body-parameter',
			bodyId: 'earth',
			parameter: 'distance',
			value: 0.01
		}).state;

		expect(refused).toBe(edited.state);
	});

	it('changes the planets\' orbits when the Sun\'s mass changes', () => {
		const state = sandbox();
		const before = bodyParameters(state, 'earth');

		let editing = openCard(state, 'sun');
		editing = applyEvent(editing, { type: 'begin-body-edit', bodyId: 'sun' }).state;
		const after = applyEvent(editing, {
			type: 'set-body-parameter',
			bodyId: 'sun',
			parameter: 'mass',
			value: 4e30
		}).state;

		expect(bodyParameters(after, 'sun').massKg).toBeCloseTo(4e30, -26);
		// A heavier Sun means a shorter year at the same semi-major axis.
		expect(bodyParameters(after, 'earth').periodDays).toBeLessThan(
			before.periodDays ?? Number.POSITIVE_INFINITY
		);
	});

	it('changes the orbit when the mass changes', () => {
		const state = sandbox();
		const before = bodyParameters(state, 'earth');
		const edited = edit(state, 'earth', 'mass', 1e30);
		const after = bodyParameters(edited.state, 'earth');

		expect(after.massKg).toBeCloseTo(1e30, -25);
		expect(after.periodDays).not.toBeCloseTo(before.periodDays ?? 0, 1);
	});
});

describe('scrubbing after an edit', () => {
	it('is exactly reversible', () => {
		const state = sandbox();
		const edited = edit(state, 'earth', 'distance', 2);
		const atEdit = edited.scene;

		const later = applyEvent(edited.state, {
			type: 'scrub-to',
			instant: state.instant + 30 * DAY
		});
		const back = applyEvent(later.state, { type: 'scrub-to', instant: state.instant });

		expect(back.scene).toEqual(atEdit);
	});
});

describe('dropping a body', () => {
	it('drops at rest into a circular orbit, at two different radii', () => {
		const cases = [0.5, 2];

		for (const radius of cases) {
			const dropped = applyEvent(sandbox(), {
				type: 'drop-body',
				bodyId: 'earth',
				position: { x: radius, y: 0, z: 0 },
				velocity: null
			});

			const parameters = bodyParameters(dropped.state, 'earth');
			expect(parameters.distanceAu, `radius ${radius}`).toBeCloseTo(radius, 9);
			// Kepler's third law: P² = a³ in years.
			expect(parameters.periodDays, `radius ${radius}`).toBeCloseTo(
				365.256363 * Math.sqrt(radius ** 3),
				0
			);

			// Circular means the distance stays put, from the next instant onward.
			const later = applyEvent(dropped.state, {
				type: 'scrub-to',
				instant: sandbox().instant + 30 * DAY
			});
			expect(relativeDistance(later.scene, 'earth', 'sun')).toBeCloseTo(radius, 6);
		}
	});

	it('is deterministic: the same drop gives the same orbit twice', () => {
		const drop = (state: SessionState) =>
			applyEvent(state, {
				type: 'drop-body',
				bodyId: 'earth',
				position: { x: 1.5, y: 0.2, z: 0 },
				velocity: null
			}).state;

		expect(bodyParameters(drop(sandbox()), 'earth')).toEqual(
			bodyParameters(drop(sandbox()), 'earth')
		);
	});

	it('derives the new conic from an explicit velocity', () => {
		const state = sandbox();
		const escape = escapeSpeedKmPerS(state, 'earth');
		const speedAuPerDay = (escape * 1.1) / (149_597_870.7 / 86_400);

		const dropped = applyEvent(state, {
			type: 'drop-body',
			bodyId: 'earth',
			position: { x: 1, y: 0, z: 0 },
			velocity: { x: 0, y: speedAuPerDay, z: 0 }
		});

		expect(hasEscaped(dropped.state, 'earth')).toBe(true);
	});
});

describe('escape', () => {
	function launchMoon(multiple: number): SessionState {
		const state = wideSandbox();
		const escape = escapeSpeedKmPerS(state, 'moon');
		return edit(state, 'moon', 'speed', escape * multiple).state;
	}

	it('leaves and never comes back when launched past escape velocity', () => {
		for (const multiple of [1.01, 1.1]) {
			const launched = launchMoon(multiple);
			expect(hasEscaped(launched, 'moon'), `×${multiple}`).toBe(true);

			const scene = applyEvent(launched, {
				type: 'scrub-to',
				instant: launched.instant
			}).scene;
			let previous = relativeDistance(scene, 'moon', 'earth');

			for (let day = 30; day <= 3650; day += 30) {
				const later = applyEvent(launched, {
					type: 'scrub-to',
					instant: launched.instant + day * DAY
				});
				const current = relativeDistance(later.scene, 'moon', 'earth');
				expect(current, `×${multiple}, day ${day}`).toBeGreaterThan(previous);
				previous = current;
			}
		}
	});

	it('shows an escaped body with a track that leaves the orbit', () => {
		const launched = launchMoon(1.1);
		const moon = body(
			applyEvent(launched, { type: 'scrub-to', instant: launched.instant }).scene,
			'moon'
		);

		expect(moon.escaped).toBe(true);
		expect(moon.track.length).toBeGreaterThan(0);
		expect(hasEscaped(sandbox(), 'moon')).toBe(false);
	});
});

describe('the Sun', () => {
	it('is draggable in the sandbox, and the lighting follows it', () => {
		const state = sandbox();
		const before = sunDirectionFromEarth(state);

		const moved = applyEvent(state, {
			type: 'move-body',
			bodyId: 'sun',
			position: { x: 0.3, y: 0.2, z: 0 }
		});

		expect(moved.state.sandbox.sunPositionAu).toEqual({ x: 0.3, y: 0.2, z: 0 });
		expect(body(moved.scene, 'sun').position).toEqual({ x: 0.3, y: 0.2, z: 0 });

		const after = sunDirectionFromEarth(moved.state);
		expect(after.x).not.toBeCloseTo(before.x, 6);
		expect(after.y).not.toBeCloseTo(before.y, 6);
	});

	it('is refused inside an activity', () => {
		const opened = applyEvent(sandbox(), {
			type: 'open-activity',
			activityId: 'fixture'
		}).state;
		expect(opened.mode).toBe('activity');

		const after = applyEvent(opened, {
			type: 'move-body',
			bodyId: 'sun',
			position: { x: 0.3, y: 0.2, z: 0 }
		});

		expect(after.state).toBe(opened);
		expect(after.scene.bodies.find((entry) => entry.id === 'sun')?.position).toEqual({
			x: 0,
			y: 0,
			z: 0
		});
	});

	it('is not moved by an activity: an edited orbit is invisible inside one', () => {
		const edited = edit(sandbox(), 'earth', 'distance', 2);
		const instant = edited.state.instant;
		const opened = applyEvent(edited.state, { type: 'open-activity', activityId: 'fixture' }).state;
		const earth = body(
			applyEvent(opened, { type: 'scrub-to', instant: opened.instant }).scene,
			'earth'
		);

		expect(earth.position).toEqual(earthHeliocentricPositionAu(opened.instant));
		expect(opened.instant).not.toBe(instant);
	});
});

describe('the sandbox workbench', () => {
	it('does not change the default scene', () => {
		const state = sandbox();
		const scene = applyEvent(state, { type: 'set-locale', locale: state.locale }).scene;
		const sun = body(scene, 'sun');
		const earth = body(scene, 'earth');

		expect(sun.position).toEqual({ x: 0, y: 0, z: 0 });
		expect(earth.position).toEqual(earthHeliocentricPositionAu(state.instant));
		expect(sun.escaped).toBe(false);
		expect(sun.track).toEqual([]);
	});
});

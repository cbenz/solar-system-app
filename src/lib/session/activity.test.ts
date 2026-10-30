import { describe, expect, it } from 'vitest';
import { fixtureActivity } from '../../activities/__fixtures__/fixture.activity';
import {
	applyEvent,
	buildScene,
	clampCamera,
	createInitialState,
	type SessionState
} from './index';

const activities = [fixtureActivity];

function sandbox(): SessionState {
	return createInitialState({
		activities,
		instant: Date.UTC(2025, 0, 1, 12, 0, 0)
	});
}

function open(): SessionState {
	return applyEvent(sandbox(), { type: 'open-activity', activityId: 'fixture' }).state;
}

describe('opening an activity', () => {
	it('takes the activity mode, its subsystem, span, POV set and settings defaults', () => {
		const opened = open();

		expect(opened.mode).toBe('activity');
		expect(opened.activityId).toBe('fixture');
		// An activity opens in its sandbox state: no guide step, no mission.
		expect(opened.phase).toBe('sandbox');
		expect(opened.guideStep).toBeNull();
		expect(opened.subsystem).toEqual(['sun', 'earth']);
		expect(opened.timeSpan).toEqual({
			fromInstant: fixtureActivity.timeSpan.from,
			toInstant: fixtureActivity.timeSpan.to
		});
		expect(opened.observers.map((observer) => observer.id)).toEqual(['fixture-pov']);
		expect(opened.settings).toMatchObject({ exposure: 0.5, grid: false });
		expect(opened.camera).toEqual({ distance: 2, pitch: 0.1 });
		expect(opened.sandboxView).not.toBeNull();
	});

	it('rejects an activity id that is not in the catalogue', () => {
		const state = sandbox();
		const result = applyEvent(state, { type: 'open-activity', activityId: 'missing' });

		expect(result.state).toBe(state);
	});

	it('puts a marker on every body of the subsystem, and hides them inside the activity', () => {
		const markers = buildScene(sandbox()).markers;

		expect(markers).toEqual([
			{ activityId: 'fixture', bodyId: 'sun' },
			{ activityId: 'fixture', bodyId: 'earth' }
		]);
		expect(buildScene(open()).markers).toEqual([]);
	});
});

describe('leaving an activity', () => {
	it('restores the sandbox instant, camera, mode, full body set and span exactly', () => {
		const before = applyEvent(sandbox(), {
			type: 'set-camera',
			camera: { distance: 7.5, pitch: 0.4 }
		}).state;
		const opened = applyEvent(before, { type: 'open-activity', activityId: 'fixture' }).state;

		// Move time and camera while inside, so a lazy restore cannot pass.
		const moved = applyEvent(
			applyEvent(opened, { type: 'scrub-to', instant: opened.timeSpan.fromInstant + 1000 }).state,
			{ type: 'set-camera', camera: { distance: 3, pitch: 0.9 } }
		).state;

		const left = applyEvent(moved, { type: 'leave-activity' }).state;

		expect(left.mode).toBe('sandbox');
		expect(left.activityId).toBeNull();
		expect(left.phase).toBe('sandbox');
		expect(left.instant).toBe(before.instant);
		expect(left.camera).toEqual(before.camera);
		expect(left.timeSpan).toEqual(before.timeSpan);
		expect(left.observers).toEqual(before.observers);
		expect(left.settings).toEqual(before.settings);
		expect(left.subsystem).toEqual(['sun', 'earth', 'moon']);
		expect(left.sandboxView).toBeNull();
	});
});

describe('the zoom clamp', () => {
	it('is free in the sandbox', () => {
		const state = sandbox();

		// 7.5 is inside the physical range but outside the fixture's preset set.
		expect(clampCamera(state, { distance: 7.5, pitch: 0 }).distance).toBe(7.5);
		expect(
			applyEvent(state, { type: 'set-camera', camera: { distance: 7.5, pitch: 0 } }).state.camera
				.distance
		).toBe(7.5);
	});

	it('refuses a zoom outside the activity preset set', () => {
		const state = open();

		expect(clampCamera(state, { distance: 7.5, pitch: 0 }).distance).toBe(6);
		expect(clampCamera(state, { distance: 1, pitch: 0 }).distance).toBe(2);
		expect(clampCamera(state, { distance: 3, pitch: 0 }).distance).toBe(3);

		const tooFar = applyEvent(state, {
			type: 'set-camera',
			camera: { distance: 7.5, pitch: 0 }
		}).state;
		expect(tooFar.camera.distance).toBe(6);
	});

	it('selects a declared preset by id, from the activity data', () => {
		const state = open();
		const chosen = applyEvent(state, { type: 'select-camera-preset', presetId: 'near' }).state;

		expect(chosen.camera).toEqual({ distance: 6, pitch: 0.3 });
		expect(
			applyEvent(state, { type: 'select-camera-preset', presetId: 'not-declared' }).state
		).toBe(state);
	});
});

describe('settings', () => {
	it('applies a valid value declared by the activity', () => {
		const state = open();
		const result = applyEvent(state, { type: 'set-setting', key: 'exposure', value: 0.9 });

		expect(result.state.settings.exposure).toBe(0.9);
		expect(result.state.settings.grid).toBe(false);
	});

	it('rejects an out-of-range number without changing the state', () => {
		const state = open();

		expect(applyEvent(state, { type: 'set-setting', key: 'exposure', value: 2 }).state).toBe(state);
		expect(applyEvent(state, { type: 'set-setting', key: 'exposure', value: -1 }).state).toBe(state);
	});

	it('rejects a value of the wrong kind or an unknown key', () => {
		const state = open();

		expect(applyEvent(state, { type: 'set-setting', key: 'grid', value: 1 }).state).toBe(state);
		expect(applyEvent(state, { type: 'set-setting', key: 'missing', value: true }).state).toBe(state);
	});

	it('does not invent sandbox settings', () => {
		const state = sandbox();

		expect(applyEvent(state, { type: 'set-setting', key: 'exposure', value: 0.9 }).state).toBe(
			state
		);
	});
});

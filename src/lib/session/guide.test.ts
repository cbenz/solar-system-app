import { describe, expect, it } from 'vitest';
import { fixtureActivity } from '../../activities/__fixtures__/fixture.activity';
import { guideActivity } from '../../activities/__fixtures__/guide.activity';
import { applyEvent, buildScene, createInitialState, type SessionState } from './index';

const DAY = 86_400_000;
const from = guideActivity.timeSpan.from;

const activities = [guideActivity, fixtureActivity];

function sandbox(): SessionState {
	return createInitialState({
		activities,
		instant: Date.UTC(2025, 0, 1, 12, 0, 0)
	});
}

function open(activityId = 'guide-fixture'): SessionState {
	return applyEvent(sandbox(), { type: 'open-activity', activityId }).state;
}

function next(state: SessionState): SessionState {
	return applyEvent(state, { type: 'next-guide-step' }).state;
}

describe('starting the guide', () => {
	it('opens an activity in the sandbox phase, with no guide step', () => {
		const opened = open();

		expect(opened.phase).toBe('sandbox');
		expect(opened.guideStep).toBeNull();
	});

	it('applies the first step on the first next, and enters the guide phase', () => {
		const started = next(open());

		expect(started.phase).toBe('guide');
		expect(started.guideStep).toBe(0);
		expect(started.camera).toEqual({ distance: 4, pitch: 0.2 });
		expect(started.instant).toBe(from + DAY);
	});

	it('does nothing in the sandbox, or for an activity with no guide', () => {
		const state = sandbox();
		expect(next(state)).toBe(state);

		const unguided = open('fixture');
		expect(next(unguided)).toBe(unguided);
	});
});

describe('advancing the guide', () => {
	it('applies every step in the scripted order', () => {
		const first = next(open());
		const second = next(first);
		const third = next(second);

		expect([first.guideStep, second.guideStep, third.guideStep]).toEqual([0, 1, 2]);

		expect(first.camera).toEqual({ distance: 4, pitch: 0.2 });
		expect(first.instant).toBe(from + DAY);

		// A step without an instant leaves the clock where the last step put it.
		expect(second.camera).toEqual({ distance: 6, pitch: 0.3 });
		expect(second.instant).toBe(from + DAY);
		expect(second.settings.tilt).toBe(12);

		expect(third.instant).toBe(from + 2 * DAY);
		expect(third.observers.map((observer) => observer.id)).toEqual(['pov-b', 'pov-c']);
	});

	it('stays on the last step when there is no next one', () => {
		const atEnd = next(next(next(open())));

		expect(next(atEnd)).toBe(atEnd);
	});

	it('never auto-advances because time passed', () => {
		const waiting = next(open());

		// Time running, the timeline scrubbing or the scene being rebuilt is not a
		// next press: the step stays put until the child dispatches one.
		let scrubbed = waiting;
		for (const step of [1, 2, 3]) {
			scrubbed = applyEvent(scrubbed, { type: 'scrub-to', instant: from + step * DAY }).state;
			buildScene(scrubbed);
		}

		expect(scrubbed.guideStep).toBe(0);
		expect(scrubbed.phase).toBe('guide');
		// Scrubbing still moves the clock; only the step index is frozen.
		expect(scrubbed.instant).toBe(from + 3 * DAY);
	});
});

describe('a tilt the activity does not declare', () => {
	it('is ignored rather than written into the settings', () => {
		// `fixtureActivity` has no `tilt` setting; a step that asked for one would
		// otherwise invent a setting the activity never declared.
		const withTiltStep = {
			...guideActivity,
			id: 'tilt-fixture',
			settings: [],
			guide: [
				{
					narration: 'term.guide' as const,
					apply: { tilt: 12 },
					waitForChild: false
				}
			]
		};

		const state = createInitialState({
			activities: [withTiltStep],
			instant: Date.UTC(2025, 5, 1)
		});
		const started = next(applyEvent(state, { type: 'open-activity', activityId: 'tilt-fixture' }).state);

		expect(started.settings.tilt).toBeUndefined();
	});
});

describe('leaving midway', () => {
	it('keeps the instant, camera, settings and POV set the last step applied', () => {
		const guided = next(next(next(open())));

		expect(guided.settings.tilt).toBe(12);
		expect(guided.camera).toEqual({ distance: 6, pitch: 0.3 });

		const left = applyEvent(guided, { type: 'leave-activity' }).state;

		expect(left.mode).toBe('sandbox');
		expect(left.activityId).toBeNull();
		expect(left.phase).toBe('sandbox');
		expect(left.guideStep).toBeNull();
		expect(left.instant).toBe(from + 2 * DAY);
		expect(left.camera).toEqual({ distance: 6, pitch: 0.3 });
		expect(left.settings.tilt).toBe(12);
		expect(left.observers.map((observer) => observer.id)).toEqual(['pov-b', 'pov-c']);
	});

	it('keeps the first step when the child leaves after one press', () => {
		const left = applyEvent(next(open()), { type: 'leave-activity' }).state;

		expect(left.instant).toBe(from + DAY);
		expect(left.camera).toEqual({ distance: 4, pitch: 0.2 });
	});
});

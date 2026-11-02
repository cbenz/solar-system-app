import { describe, expect, it } from 'vitest';
import { NOON, missionActivity } from '../../activities/__fixtures__/mission.activity';
import {
	applyEvent,
	createInitialState,
	graded,
	sceneMission,
	type SessionState
} from './index';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const activities = [missionActivity];

const MORNING = Date.UTC(2025, 2, 20, 9, 0, 0);

function sandbox(): SessionState {
	return createInitialState({ activities, instant: MORNING });
}

function open(): SessionState {
	return applyEvent(sandbox(), { type: 'open-activity', activityId: 'mission-fixture' }).state;
}

function started(missionId = 'noon'): SessionState {
	return applyEvent(open(), { type: 'start-mission', missionId }).state;
}

function scrubTo(state: SessionState, instant: number): SessionState {
	return applyEvent(state, { type: 'scrub-to', instant }).state;
}

/** The mission in its manipulate phase, with the child's claim on record. */
function committed(instant = MORNING, missionId = 'noon'): SessionState {
	return applyEvent(scrubTo(started(missionId), instant), { type: 'record-prediction' }).state;
}

function atPhase(phase: 'predict' | 'manipulate' | 'observe' | 'explain'): SessionState {
	if (phase === 'predict') return started();

	const manipulated = committed();
	if (phase === 'manipulate') return manipulated;

	const revealed = applyEvent(scrubTo(manipulated, NOON), { type: 'reveal-mission' }).state;
	if (phase === 'observe') return revealed;

	return applyEvent(revealed, { type: 'explain-mission' }).state;
}

describe('the prediction', () => {
	it('is recorded before the reveal and kept, even when it is wrong', () => {
		const predicted = committed();

		expect(predicted.phase).toBe('mission');
		expect(predicted.mission?.phase).toBe('manipulate');
		expect(predicted.mission?.prediction).toEqual({
			missionId: 'noon',
			propositionId: 'morning',
			statement: 'fixture.mission.noon.claim.morning',
			instant: MORNING,
			settings: predicted.settings
		});

		// The child said morning; the mission is about noon. Moving time during
		// the manipulation must not rewrite the claim, nor its instant.
		const moved = scrubTo(predicted, NOON);
		expect(moved.mission?.prediction).toEqual(predicted.mission?.prediction);

		const revealed = applyEvent(moved, { type: 'reveal-mission' }).state;
		expect(revealed.instant).toBe(NOON);
		expect(revealed.mission?.phase).toBe('observe');
		expect(revealed.mission?.prediction).toEqual(predicted.mission?.prediction);
		expect(revealed.mission?.prediction?.propositionId).toBe('morning');
		// The panel still plays the claim back in the child's words.
		expect(sceneMission(revealed)?.prediction?.statement).toBe(
			'fixture.mission.noon.claim.morning'
		);
	});

	it('reads the scene frozen when the mission started, not the live one', () => {
		// Start in the morning, then move to noon before committing. The frozen
		// starting view still says morning: stating a belief never needs a prior
		// manipulation (ADR-0004 rule 4).
		const moved = scrubTo(started(), NOON);
		const predicted = applyEvent(moved, { type: 'record-prediction' }).state;

		expect(predicted.mission?.prediction?.propositionId).toBe('morning');
		expect(predicted.mission?.prediction?.instant).toBe(MORNING);
		expect(predicted.mission?.predictionScene.instant).toBe(MORNING);
	});

	it('is recorded once: a second commit does not overwrite it', () => {
		const predicted = committed();

		expect(applyEvent(predicted, { type: 'record-prediction' }).state).toBe(predicted);
	});

	it('refuses to reveal before a prediction is on record', () => {
		const state = scrubTo(started(), NOON);

		expect(applyEvent(state, { type: 'reveal-mission' }).state).toBe(state);
	});
});

describe('the answer', () => {
	it('is the scene, so the reveal is refused until the phenomenon is there', () => {
		const predicted = committed();

		const close = scrubTo(predicted, NOON + 30 * MINUTE);
		expect(applyEvent(close, { type: 'reveal-mission' }).state).toBe(close);

		const far = scrubTo(predicted, NOON + 3 * HOUR);
		expect(applyEvent(far, { type: 'reveal-mission' }).state).toBe(far);

		const right = scrubTo(predicted, NOON);
		const revealed = applyEvent(right, { type: 'reveal-mission' }).state;
		expect(revealed.mission?.phase).toBe('observe');
		expect(sceneMission(revealed)?.prompt).toBe('fixture.mission.noon.observe');
	});

	it('grades a continuous attempt far / close / right, with the tolerance band asserted', () => {
		const predicted = committed();
		const outcomeAt = (instant: number) => sceneMission(scrubTo(predicted, instant))?.outcome;

		// The fixture declares tolerance 5 min and closeTolerance 60 min.
		expect(outcomeAt(NOON)).toEqual({ state: 'right', measure: 0 });
		expect(outcomeAt(NOON + 5 * MINUTE)).toEqual({ state: 'right', measure: 5 * MINUTE });
		expect(outcomeAt(NOON - 5 * MINUTE)).toEqual({ state: 'right', measure: 5 * MINUTE });

		// One millisecond outside the right band is the close band.
		expect(outcomeAt(NOON + 5 * MINUTE + 1)).toEqual({
			state: 'close',
			measure: 5 * MINUTE + 1
		});
		expect(outcomeAt(NOON - HOUR)).toEqual({ state: 'close', measure: HOUR });

		// And one millisecond outside the close band is far.
		expect(outcomeAt(NOON + HOUR + 1)).toEqual({ state: 'far', measure: HOUR + 1 });
		expect(outcomeAt(NOON + 3 * HOUR)).toEqual({ state: 'far', measure: 3 * HOUR });
	});

	it('shows "almost" only in the close band, in words rather than a number', () => {
		const predicted = committed();

		expect(sceneMission(scrubTo(predicted, NOON + 30 * MINUTE))?.feedback).toBe(
			'fixture.mission.noon.almost'
		);
		expect(sceneMission(scrubTo(predicted, NOON + 3 * HOUR))?.feedback).toBeNull();
		expect(sceneMission(scrubTo(predicted, NOON))?.feedback).toBeNull();
	});

	it('answers a discrete mission with right or far', () => {
		const predicted = committed(MORNING, 'near');

		expect(sceneMission(predicted)?.outcome).toEqual({ state: 'far', measure: 1 });

		const near = applyEvent(predicted, { type: 'select-camera-preset', presetId: 'near' }).state;
		expect(sceneMission(near)?.outcome).toEqual({ state: 'right', measure: 0 });

		const revealed = applyEvent(near, { type: 'reveal-mission' }).state;
		expect(revealed.mission?.phase).toBe('observe');
	});

	it('treats a non-finite measure as a miss, never a false success', () => {
		expect(graded(Number.NaN, 1, 10).state).toBe('far');
		expect(graded(Number.POSITIVE_INFINITY, 1, 10).state).toBe('far');
	});
});

describe('the phases', () => {
	it('walks predict → manipulate → observe → explain, one step at a time', () => {
		expect(started().mission?.phase).toBe('predict');

		const manipulated = committed();
		expect(manipulated.mission?.phase).toBe('manipulate');

		// Out-of-order transitions are refused, not queued.
		expect(applyEvent(manipulated, { type: 'explain-mission' }).state).toBe(manipulated);
		expect(applyEvent(manipulated, { type: 'finish-mission' }).state).toBe(manipulated);

		const observed = applyEvent(scrubTo(manipulated, NOON), { type: 'reveal-mission' }).state;
		expect(observed.mission?.phase).toBe('observe');

		const explained = applyEvent(observed, { type: 'explain-mission' }).state;
		expect(explained.mission?.phase).toBe('explain');

		const finished = applyEvent(explained, { type: 'finish-mission' }).state;
		expect(finished.phase).toBe('sandbox');
		expect(finished.mission).toBeNull();
		// Finishing in the activity's sandbox keeps the scene where the child left it.
		expect(finished.instant).toBe(explained.instant);
		expect(finished.camera).toEqual(explained.camera);
	});

	it('starts a mission only from the activity sandbox, and only once', () => {
		expect(applyEvent(sandbox(), { type: 'start-mission', missionId: 'noon' }).state).toEqual(
			sandbox()
		);

		const running = started();
		expect(applyEvent(running, { type: 'start-mission', missionId: 'near' }).state).toBe(running);

		const opened = open();
		expect(applyEvent(opened, { type: 'start-mission', missionId: 'missing' }).state).toBe(opened);
	});
});

describe('abandoning', () => {
	it.each(['predict', 'manipulate', 'observe', 'explain'] as const)(
		'loses nothing from the %s phase',
		(phase) => {
			const before = atPhase(phase);
			// Move the camera and the instant while the mission runs, so a lazy
			// restore cannot pass.
			const moved = applyEvent(scrubTo(before, NOON + 2 * HOUR), {
				type: 'set-camera',
				camera: { distance: 4, pitch: 0.2 }
			}).state;

			const left = applyEvent(moved, { type: 'abandon-mission' }).state;

			expect(left.mode).toBe('activity');
			expect(left.activityId).toBe('mission-fixture');
			expect(left.phase).toBe('sandbox');
			expect(left.mission).toBeNull();
			// The camera and the instant are where the child left them.
			expect(left.instant).toBe(NOON + 2 * HOUR);
			expect(left.camera).toEqual({ distance: 4, pitch: 0.2 });
			expect(left.observers).toEqual(moved.observers);
			expect(left.settings).toEqual(moved.settings);
			// The way home out of the activity is untouched.
			expect(left.sandboxView).toEqual(moved.sandboxView);
		}
	);

	it('is a no-op when no mission is running', () => {
		const opened = open();

		expect(applyEvent(opened, { type: 'abandon-mission' }).state).toBe(opened);
	});

	it('still leaves the whole activity from a mission phase, landing where the child was', () => {
		const before = applyEvent(sandbox(), {
			type: 'set-camera',
			camera: { distance: 7.5, pitch: 0.4 }
		}).state;
		const opened = applyEvent(before, {
			type: 'open-activity',
			activityId: 'mission-fixture'
		}).state;
		const predicted = applyEvent(opened, { type: 'start-mission', missionId: 'noon' }).state;
		const manipulated = applyEvent(predicted, { type: 'record-prediction' }).state;
		const observed = applyEvent(scrubTo(manipulated, NOON), { type: 'reveal-mission' }).state;
		const explained = applyEvent(observed, { type: 'explain-mission' }).state;

		const left = applyEvent(explained, { type: 'leave-activity' }).state;

		expect(left.mode).toBe('sandbox');
		expect(left.phase).toBe('sandbox');
		expect(left.mission).toBeNull();
		expect(left.instant).toBe(before.instant);
		expect(left.camera).toEqual(before.camera);
	});
});

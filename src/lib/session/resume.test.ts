import { describe, expect, it } from 'vitest';
import { fixtureActivity } from '../../activities/__fixtures__/fixture.activity';
import { applyEvent, createInitialState } from './index';
import { resumeOffer } from './resume';

const activities = [fixtureActivity];

describe('the resume offer', () => {
	it('offers the remembered activity on a return visit, from the sandbox', () => {
		const state = createInitialState({ activities });

		expect(resumeOffer(state, 'fixture')).toBe(fixtureActivity);
	});

	it('offers nothing when nothing was remembered', () => {
		const state = createInitialState({ activities });

		expect(resumeOffer(state, null)).toBeNull();
	});

	it('offers nothing for an activity the registry no longer holds', () => {
		const state = createInitialState({ activities });

		expect(resumeOffer(state, 'an-activity-that-was-removed')).toBeNull();
	});

	it('offers nothing while an activity is already open', () => {
		const opened = applyEvent(createInitialState({ activities }), {
			type: 'open-activity',
			activityId: 'fixture'
		}).state;

		expect(resumeOffer(opened, 'fixture')).toBeNull();
	});

	it('opens the offered activity in its sandbox phase when taken', () => {
		const state = createInitialState({ activities });
		const offer = resumeOffer(state, 'fixture');

		expect(offer).not.toBeNull();

		const opened = applyEvent(state, { type: 'open-activity', activityId: offer!.id }).state;

		expect(opened.mode).toBe('activity');
		expect(opened.activityId).toBe('fixture');
		expect(opened.phase).toBe('sandbox');
		expect(opened.guideStep).toBeNull();
		expect(opened.mission).toBeNull();
		// The offer is spent by opening: nothing is offered on top of an activity.
		expect(resumeOffer(opened, 'fixture')).toBeNull();
	});
});

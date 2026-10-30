import { describe, expect, it } from 'vitest';
import { fixtureActivity } from './__fixtures__/fixture.activity';
import { guideActivity } from './__fixtures__/guide.activity';
import { describeGuideGolden, runGuideGolden } from './guide-golden';
import { activities } from './index';

// Every activity in the registry inherits the golden guide test by landing here.
// Tickets 10 to 14 add a module and are covered without editing this file.
describe('the registry’s guides', () => {
	for (const activity of activities) {
		describeGuideGolden(activity);
	}
});

describe('the golden guide helper', () => {
	it('reports an activity with no guide as skipped, not as a silent pass', () => {
		const result = runGuideGolden(fixtureActivity);

		expect(result.skipped).toBe(true);
		expect(result.activityId).toBe('fixture');
		expect(result.steps).toEqual([]);
	});

	it('returns the applied camera presets and instants in order', () => {
		const result = runGuideGolden(guideActivity);

		expect(result.skipped).toBe(false);
		expect(result.steps.map((step) => step.cameraPreset)).toEqual(['middle', 'near', null]);
		expect(result.steps.map((step) => step.instant)).toEqual([
			guideActivity.timeSpan.from + 86_400_000,
			guideActivity.timeSpan.from + 86_400_000,
			guideActivity.timeSpan.from + 2 * 86_400_000
		]);
	});
});

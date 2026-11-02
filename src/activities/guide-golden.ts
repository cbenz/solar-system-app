/**
 * The golden guide test, as one reusable helper.
 *
 * Tickets 10 to 14 add an activity module and inherit this: `guide.test.ts`
 * walks the registry and calls `describeGuideGolden` for every activity, so a
 * new module is covered with no test edit. The helper asserts what the script
 * claims — every declared camera preset and every instant, in order — without
 * asserting the narration wording, which the catalogue test covers separately.
 *
 * An activity whose guide is still empty is reported as **skipped**, never as a
 * silent pass: the activity tickets can see exactly what still has no guide.
 */

import { describe, expect, it } from 'vitest';
import { LOCALES } from '$lib/i18n/locale';
import { catalogues } from '$lib/i18n/messages';
import {
	applyEvent,
	cameraForPreset,
	clampInstant,
	createInitialState,
	type CameraState,
	type Instant
} from '$lib/session';
import type { Activity } from './types';

export type GuideGoldenStep = {
	/** The step's position in the guide. */
	index: number;
	/** The preset id the step declared, or null when it left the camera alone. */
	cameraPreset: string | null;
	/** The camera the state held after the step. */
	camera: CameraState;
	/** The instant the state held after the step. */
	instant: Instant;
};

export type GuideGoldenResult = {
	activityId: string;
	/** True when the activity has no guide yet, so nothing was applied. */
	skipped: boolean;
	steps: GuideGoldenStep[];
};

/**
 * Run an activity's guide from the first step to the last, one `next-guide-step`
 * per step, and assert each resulting camera preset and instant against the
 * script. Returns the ordered list for the test to inspect.
 */
export function runGuideGolden(activity: Activity): GuideGoldenResult {
	if (activity.guide.length === 0) {
		return { activityId: activity.id, skipped: true, steps: [] };
	}

	let state = createInitialState({ activities: [activity], instant: activity.timeSpan.from });
	state = applyEvent(state, { type: 'open-activity', activityId: activity.id }).state;

	// An activity always opens in its sandbox phase; the guide is opt-in.
	expect(state.phase, `${activity.id}: opens in the sandbox phase`).toBe('sandbox');
	expect(state.guideStep, `${activity.id}: opens with no guide step`).toBeNull();

	const steps: GuideGoldenStep[] = [];

	activity.guide.forEach((step, index) => {
		// The child presses next once per step, waiting steps included. Nothing
		// else in the session can move the index, which is what makes the pause
		// real.
		state = applyEvent(state, { type: 'next-guide-step' }).state;

		expect(state.phase, `${activity.id} step ${index}: phase`).toBe('guide');
		expect(state.guideStep, `${activity.id} step ${index}: index`).toBe(index);

		if (step.apply.camera !== undefined) {
			const preset = activity.cameraPresets.find(
				(candidate) => candidate.id === step.apply.camera
			);
			expect(
				preset,
				`${activity.id} step ${index}: preset "${step.apply.camera}" is not declared`
			).toBeDefined();
			expect(state.camera, `${activity.id} step ${index}: camera preset`).toEqual(
				cameraForPreset(preset!)
			);
		}

		if (step.apply.instant !== undefined) {
			// A step may widen the timeline it needs; the instant is checked against
			// the span the state actually has after the step.
			expect(state.instant, `${activity.id} step ${index}: instant`).toBe(
				clampInstant(step.apply.instant, state.timeSpan)
			);
		}

		steps.push({
			index,
			cameraPreset: step.apply.camera ?? null,
			camera: state.camera,
			instant: state.instant
		});
	});

	return { activityId: activity.id, skipped: false, steps };
}

/**
 * Register an activity's golden guide tests. Call it once per activity from the
 * registry test; it is a no-op spread otherwise.
 */
export function describeGuideGolden(activity: Activity): void {
	describe(`guide: ${activity.id}`, () => {
		if (activity.guide.length === 0) {
			it.skip('has no guide yet', () => {
				// The helper reports the skip; an activity ticket removes it by
				// declaring its guide.
			});
			return;
		}

		it('is never empty and resolves every narration key in both catalogues', () => {
			expect(activity.guide.length).toBeGreaterThan(0);

			for (const [index, step] of activity.guide.entries()) {
				for (const locale of LOCALES) {
					const message = catalogues[locale][step.narration];
					expect(
						typeof message === 'string' && message.trim().length > 0,
						`${activity.id} step ${index}: missing ${locale} narration "${step.narration}"`
					).toBe(true);
				}
			}
		});

		it('applies its camera presets and instants in order', () => {
			const result = runGuideGolden(activity);

			expect(result.skipped).toBe(false);
			expect(result.steps).toHaveLength(activity.guide.length);
			expect(result.steps.map((step) => step.index)).toEqual(
				activity.guide.map((_step, index) => index)
			);
		});
	});
}

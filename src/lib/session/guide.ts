/**
 * The guide: turning a scripted list of steps into state.
 *
 * A guide is activity data, never code. Advancing applies the step's `apply`
 * payload — a camera preset, an instant, a tilt where the activity declares one,
 * a POV set — and moves `guideStep`. Nothing here watches a clock: a step that
 * waits for the child only moves when `next-guide-step` arrives, which is what
 * makes the pause real. The first press starts the guide and applies step 0;
 * leaving mid-way keeps whatever the last applied step produced.
 */

import { findSetting } from '../../activities/settings';
import type { Activity, GuideStep } from '../../activities/types';
import { cameraForPreset, currentActivity } from './camera';
import { observersFromPovs } from './povs';
import { clampInstant } from './time';
import type { SessionState } from './types';

/**
 * The setting key a guide step's `tilt` writes to. A step only applies a tilt
 * where the activity declares this setting: an activity without a tilt control
 * cannot have one invented for it.
 */
export const TILT_SETTING_KEY = 'tilt';

/** The steps of the open activity's guide, empty when there is none. */
export function guideFor(state: SessionState): readonly GuideStep[] {
	return currentActivity(state)?.guide ?? [];
}

/** The step the guide is on, or `undefined` before it starts and outside a guide. */
export function currentGuideStep(state: SessionState): GuideStep | undefined {
	if (state.guideStep === null) return undefined;
	return guideFor(state)[state.guideStep];
}

/**
 * Apply one step's payload. Each field is optional and independent: a step that
 * names only an instant leaves the camera alone, and vice versa.
 */
export function applyGuideStep(state: SessionState, step: GuideStep): SessionState {
	const activity = currentActivity(state);
	let next = state;

	const { camera, instant, tilt, povs, timeSpan } = step.apply;

	// A step may declare the span its phenomenon needs. Apply it before the
	// instant, so a December solstice step can live outside the activity's
	// opening window without the instant being clamped away.
	if (
		timeSpan !== undefined &&
		Number.isFinite(timeSpan.fromInstant) &&
		Number.isFinite(timeSpan.toInstant) &&
		timeSpan.toInstant > timeSpan.fromInstant
	) {
		next = {
			...next,
			timeSpan: {
				fromInstant: timeSpan.fromInstant,
				toInstant: timeSpan.toInstant
			}
		};
	}

	if (instant !== undefined) {
		next = { ...next, instant: clampInstant(instant, next.timeSpan) };
	}

	if (camera !== undefined && activity !== undefined) {
		const preset = activity.cameraPresets.find((candidate) => candidate.id === camera);
		if (preset !== undefined) next = { ...next, camera: cameraForPreset(preset) };
	}

	if (tilt !== undefined && activity !== undefined && Number.isFinite(tilt)) {
		const spec = findSetting(activity.settings, TILT_SETTING_KEY);
		if (spec !== undefined && spec.kind === 'number') {
			const value = Math.min(spec.max, Math.max(spec.min, tilt));
			next = { ...next, settings: { ...next.settings, [TILT_SETTING_KEY]: value } };
		}
	}

	if (povs !== undefined) {
		next = { ...next, observers: observersFromPovs(povs) };
	}

	return next;
}

/**
 * `next-guide-step` in state form.
 *
 * The first press from the activity's sandbox phase starts the guide at step 0;
 * later presses advance by one and apply that step. At the end the guide stays
 * on its last step — there is no separate "finished" state to invent, and the
 * activity's own exit is `leave-activity`.
 */
export function nextGuideStep(state: SessionState): SessionState {
	const activity: Activity | undefined = currentActivity(state);
	if (activity === undefined || activity.guide.length === 0) return state;
	if (state.phase === 'mission') return state;

	if (state.phase !== 'guide') {
		const first = activity.guide[0];
		if (first === undefined) return state;
		return applyGuideStep({ ...state, phase: 'guide', guideStep: 0 }, first);
	}

	const nextIndex = (state.guideStep ?? -1) + 1;
	const step = activity.guide[nextIndex];
	if (step === undefined) return state;

	return applyGuideStep({ ...state, guideStep: nextIndex }, step);
}

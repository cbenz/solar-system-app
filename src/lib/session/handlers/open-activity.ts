/**
 * `open-activity` and `leave-activity`: the boundary between the sandbox and an
 * activity.
 *
 * Opening saves the sandbox view, narrows the subsystem (always keeping the
 * Sun), takes the activity's span, POV set and setting defaults, and puts the
 * camera on the first declared preset. Leaving restores the saved sandbox view
 * exactly, so the child lands where they left.
 */

import { settingDefaults } from '../../../activities/settings';
import type { PovSpec } from '../../../activities/types';
import { cameraForPreset, clampCamera, currentActivity } from '../camera';
import { nextObserverColour } from '../observer-colour';
import { DEFAULT_SUBSYSTEM } from '../state';
import { clampInstant, sandboxSpan } from '../time';
import type { Observer, SessionEvent, SessionState } from '../types';

function observersFromPovs(povs: readonly PovSpec[]): Observer[] {
	const used: string[] = [];
	return povs.map((pov) => {
		const colour = nextObserverColour(used);
		used.push(colour);
		return {
			id: pov.id,
			bodyId: pov.bodyId,
			latitudeDeg: pov.latitudeDeg,
			...(pov.longitudeDeg === undefined ? {} : { longitudeDeg: pov.longitudeDeg }),
			colour
		};
	});
}

export function handleOpenActivity(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type === 'open-activity') {
		// An activity is not nested inside another one. A second open is a no-op
		// until the child leaves.
		if (state.mode === 'activity') return state;

		const activity = state.activities.find((candidate) => candidate.id === event.activityId);
		if (activity === undefined) return state;

		const timeSpan = {
			fromInstant: activity.timeSpan.from,
			toInstant: activity.timeSpan.to
		};
		const firstPreset = activity.cameraPresets[0];
		const camera =
			firstPreset === undefined
				? clampCamera({ ...state, mode: 'activity' as const }, state.camera)
				: cameraForPreset(firstPreset);

		return {
			...state,
			mode: 'activity',
			activityId: activity.id,
			// An activity opens in its sandbox state: free exploration, no guide
			// step, no mission running.
			phase: 'sandbox',
			guideStep: null,
			instant: clampInstant(state.instant, timeSpan),
			timeSpan,
			subsystem: [...activity.subsystem],
			observers: observersFromPovs(activity.povs),
			settings: { ...state.settings, ...settingDefaults(activity.settings) },
			camera,
			sandboxView: {
				instant: state.instant,
				camera: state.camera,
				timeSpan: state.timeSpan,
				observers: state.observers,
				settings: state.settings
			}
		};
	}

	if (event.type === 'leave-activity') {
		if (state.mode !== 'activity' && state.sandboxView === null) return state;

		const saved = state.sandboxView;

		if (saved === null) {
			// A state constructed directly in activity mode still has a sane way home.
			const timeSpan = sandboxSpan(2025);
			return {
				...state,
				mode: 'sandbox',
				activityId: null,
				phase: 'sandbox',
				guideStep: null,
				timeSpan,
				subsystem: [...DEFAULT_SUBSYSTEM],
				sandboxView: null
			};
		}

		return {
			...state,
			mode: 'sandbox',
			activityId: null,
			phase: 'sandbox',
			guideStep: null,
			instant: saved.instant,
			camera: saved.camera,
			timeSpan: saved.timeSpan,
			observers: saved.observers,
			settings: saved.settings,
			subsystem: [...DEFAULT_SUBSYSTEM],
			sandboxView: null
		};
	}

	return null;
}

export { currentActivity };

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
import { cameraForPreset, clampCamera, currentActivity } from '../camera';
import { observersFromPovs } from '../povs';
import { DEFAULT_SUBSYSTEM } from '../state';
import { clampInstant, sandboxSpan } from '../time';
import type { SessionEvent, SessionState } from '../types';

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

		// Abandoning a guide mid-way keeps the scene where the last applied step
		// left it: its instant, camera, tilt and POV set survive the way out. Only
		// leaving an activity that never started its guide restores the sandbox
		// view the child left behind.
		if (state.phase === 'guide') {
			return {
				...state,
				mode: 'sandbox',
				activityId: null,
				phase: 'sandbox',
				guideStep: null,
				// The guide's instant may sit outside the sandbox window; keep it
				// where the last step put it unless that window cannot hold it.
				instant: clampInstant(state.instant, saved.timeSpan),
				timeSpan: saved.timeSpan,
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

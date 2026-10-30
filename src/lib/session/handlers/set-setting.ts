/**
 * `set-setting`: apply a value only when it matches the open activity's
 * declaration. A wrong kind, an unknown key or a number outside its range
 * leaves the state untouched — the event is rejected, not partly applied.
 */

import { findSetting, isValidSettingValue } from '../../../activities/settings';
import { currentActivity } from '../camera';
import type { SessionEvent, SessionState } from '../types';

export function handleSetSetting(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'set-setting') return null;

	const activity = currentActivity(state);
	if (activity === undefined) return state;

	const spec = findSetting(activity.settings, event.key);
	if (spec === undefined || !isValidSettingValue(spec, event.value)) return state;

	if (state.settings[event.key] === event.value) return state;

	return {
		...state,
		settings: { ...state.settings, [event.key]: event.value }
	};
}

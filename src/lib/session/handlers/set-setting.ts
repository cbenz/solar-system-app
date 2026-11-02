/**
 * `set-setting`: the one channel for the session's settings.
 *
 * Inside an activity the value is applied only when it matches that activity's
 * declaration — same key, same kind, inside the declared range. A wrong kind, an
 * unknown key or a number out of range leaves the state untouched: the event is
 * rejected, not partly applied. The sandbox has no activity open, so it
 * validates against `SANDBOX_SETTINGS` instead — the same rule, a different
 * declaration — and an unknown key is refused there too.
 *
 * Asking for the value already stored is a no-op — the state comes back by
 * identity — so a redundant press cannot churn the scene.
 */

import { findSetting, isValidSettingValue } from '../../../activities/settings';
import { currentActivity } from '../camera';
import { SANDBOX_SETTINGS } from '../settings';
import type { SessionEvent, SessionState } from '../types';

export function handleSetSetting(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'set-setting') return null;
	if (state.settings[event.key] === event.value) return state;

	const declared = currentActivity(state)?.settings ?? SANDBOX_SETTINGS;
	const spec = findSetting(declared, event.key);
	if (spec === undefined || !isValidSettingValue(spec, event.value)) return state;

	return { ...state, settings: { ...state.settings, [event.key]: event.value } };
}

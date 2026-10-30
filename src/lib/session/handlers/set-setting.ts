/**
 * `set-setting`: the one channel for the session's settings.
 *
 * Settings live in a plain record, so a ticket adds a setting by naming its key
 * and nothing else here changes. Asking for the value already stored is a no-op
 * — the state comes back by identity — so a redundant press cannot churn the
 * scene.
 */

import type { SessionEvent, SessionState } from '../types';

export function handleSetSetting(
	state: SessionState,
	event: SessionEvent
): SessionState | null {
	if (event.type !== 'set-setting') return null;
	if (state.settings[event.key] === event.value) return state;

	return { ...state, settings: { ...state.settings, [event.key]: event.value } };
}

/**
 * `toggle-true-distance` and `toggle-true-size`: the two distortion switches
 * (ADR-0003).
 *
 * They are separate on purpose — one scene can show real distances with
 * enlarged bodies, or the reverse — so each event flips exactly one field and
 * touches nothing else. Flipping twice is a round trip: the state comes back
 * equal to where it started.
 */

import type { SessionEvent, SessionState } from '../types';

export function handleToggleDistortion(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type === 'toggle-true-distance') {
		return { ...state, trueDistance: !state.trueDistance };
	}

	if (event.type === 'toggle-true-size') {
		return { ...state, trueSize: !state.trueSize };
	}

	return null;
}

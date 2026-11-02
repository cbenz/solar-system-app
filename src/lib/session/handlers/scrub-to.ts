/**
 * `scrub-to`: move the instant. The one event ticket 03 handles, and the reason
 * the whole architecture is shaped this way — same instant, same state, bit for
 * bit, whichever direction the child dragged.
 */

import { clampInstant } from '../time';
import type { SessionEvent, SessionState } from '../types';

export function handleScrubTo(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'scrub-to') return null;

	const instant = clampInstant(event.instant, state.timeSpan);
	if (instant === state.instant) return state;

	return { ...state, instant };
}

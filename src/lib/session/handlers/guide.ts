/**
 * `next-guide-step`: the child's one control over the guide.
 *
 * The handler exists so a guide that is not running, or an activity without a
 * guide, answers the event instead of throwing it. All the decisions live in
 * `guide.ts`.
 */

import { nextGuideStep } from '../guide';
import type { SessionEvent, SessionState } from '../types';

export function handleGuide(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'next-guide-step') return null;

	return nextGuideStep(state);
}

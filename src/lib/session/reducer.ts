/**
 * The reducer: one switch that delegates, one handler module per event family.
 *
 * Adding an event family (ticket 05's `place-observer`, ticket 07's
 * `open-activity`, …) means adding `handlers/<family>.ts` exporting
 * `handle(state, event): SessionState | null` and appending it to
 * `SESSION_HANDLERS`. Nothing else in this file changes.
 */

import { handleCamera } from './handlers/camera';
import { handleOpenActivity } from './handlers/open-activity';
import { handlePlaceObserver } from './handlers/place-observer';
import { handleSetSetting } from './handlers/set-setting';
import { handleScrubTo } from './handlers/scrub-to';
import { handleSetLocale } from './handlers/set-locale';
import { handleToggleScale } from './handlers/toggle-scale';
import { buildScene } from './scene';
import { reconcileTimeSpan } from './state';
import type { SessionEvent, SessionResult, SessionState } from './types';

/** A handler returns `null` for events that are not its business. */
export type SessionHandler = (state: SessionState, event: SessionEvent) => SessionState | null;

export const SESSION_HANDLERS: readonly SessionHandler[] = [
	handleOpenActivity,
	handleScrubTo,
	handlePlaceObserver,
	handleSetSetting,
	handleCamera,
	handleSetLocale,
	handleToggleScale
];

/**
 * An event of the union that no ticket has implemented yet. Loud on purpose: a
 * silently ignored event would look like a session bug in five different tickets.
 */
export class UnhandledSessionEventError extends Error {
	constructor(readonly eventType: SessionEvent['type']) {
		super(`Session event not implemented yet: ${eventType}`);
		this.name = 'UnhandledSessionEventError';
	}
}

export function applyEvent(state: SessionState, event: SessionEvent): SessionResult {
	const reconciled = reconcileTimeSpan(state);

	for (const handler of SESSION_HANDLERS) {
		const next = handler(reconciled, event);
		if (next !== null) return { state: next, scene: buildScene(next) };
	}

	throw new UnhandledSessionEventError(event.type);
}

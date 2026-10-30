/**
 * Initial state and the small amount of reconciliation every event runs
 * through. Kept out of the reducer so handlers stay one-concern switches.
 */

import { DEFAULT_LOCALE, type Locale } from '$lib/i18n/locale';
import { FIRST_POV_ID } from './handlers/place-observer';
import { nextObserverColour } from './observer-colour';
import { sandboxSpan } from './time';
import type { BodyId, Instant, SessionState, TimeSpan } from './types';

/** Simulated days per real second: a year of playback in about six minutes. */
export const DEFAULT_PLAYBACK_SPEED = 1;

/**
 * The sandbox shows the Sun, the Earth and the Moon. The Moon earns its place
 * here because tickets 05 and 16 need it; keeping it out would only mean
 * breaking the position of nothing.
 */
export const DEFAULT_SUBSYSTEM: readonly BodyId[] = ['sun', 'earth', 'moon'];

const DEFAULT_INSTANT: Instant = Date.UTC(2025, 2, 20, 12, 0, 0);

export type InitialStateOptions = {
	locale?: Locale;
	instant?: Instant;
	timeSpan?: TimeSpan;
	settings?: Record<string, number | boolean>;
};

export function createInitialState(options: InitialStateOptions = {}): SessionState {
	const timeSpan = options.timeSpan ?? sandboxSpan(2025);

	return {
		locale: options.locale ?? DEFAULT_LOCALE,
		mode: 'sandbox',
		activityId: null,
		phase: 'sandbox',
		guideStep: null,
		instant: options.instant ?? DEFAULT_INSTANT,
		trueDistance: false,
		trueSize: false,
		subsystem: [...DEFAULT_SUBSYSTEM],
		// One observer for ticket 05 so a POV is visible before placement exists
		// (ticket 06). Placement reuses the same id and colour.
		observers: [
			{
				id: FIRST_POV_ID,
				bodyId: 'earth',
				latitudeDeg: 48.8566,
				colour: nextObserverColour([])
			}
		],
		settings: {
			playbackSpeed: DEFAULT_PLAYBACK_SPEED,
			...(options.settings ?? {})
		},
		timeSpan
	};
}

/**
 * Keep the span well-formed and the instant inside it.
 *
 * The span is derived state: an activity declares it (ticket 07), the sandbox
 * defaults to a year. It is never carried by an event, so no event can create an
 * instant outside the timeline that is showing it.
 */
export function reconcileTimeSpan(state: SessionState): SessionState {
	const { fromInstant, toInstant } = state.timeSpan;

	if (!Number.isFinite(fromInstant) || !Number.isFinite(toInstant) || toInstant <= fromInstant) {
		const timeSpan = sandboxSpan(2025);
		return { ...state, timeSpan, instant: DEFAULT_INSTANT };
	}

	if (state.instant >= fromInstant && state.instant <= toInstant) return state;

	return {
		...state,
		instant: Math.min(Math.max(state.instant, fromInstant), toInstant)
	};
}

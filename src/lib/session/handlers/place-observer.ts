/**
 * `place-observer`: put an observer on a body, or move an existing one along its
 * meridian. Latitude is the only control; longitude stays derived. The session
 * owns the colour, so an observer keeps the one it was given.
 */

import { nextObserverColour } from '../observer-colour';
import type { BodyId, SessionEvent, SessionState } from '../types';

/** An activity declares at most three POVs (GLOSSARY: POV). */
export const MAX_OBSERVERS = 3;

/** The first POV, seeded by the sandbox and moved by the first placement. */
export const FIRST_POV_ID = 'pov-1';

/** Observer placement is on the Earth; no other body is interactive yet. */
const PLACEMENT_BODY: BodyId = 'earth';

/**
 * Latitude is clamped to the planet, poles included: −90 and +90 are real
 * places, and only the daylight arithmetic needs a guard against `cos φ = 0`.
 */
function clampLatitude(latitudeDeg: number): number {
	if (!Number.isFinite(latitudeDeg)) return 0;
	return Math.min(Math.max(latitudeDeg, -90), 90);
}

/**
 * Which POV a placement lands on. There is no selection yet (ticket 09 may add
 * one); the first observer is the sandbox's, and a placement with no observer
 * at all creates the first POV under this id.
 */
export function placementTargetId(state: SessionState): string {
	return state.observers[0]?.id ?? FIRST_POV_ID;
}

export function handlePlaceObserver(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'place-observer') return null;

	const latitudeDeg = clampLatitude(event.latitudeDeg);
	const existingIndex = state.observers.findIndex((observer) => observer.id === event.povId);

	if (existingIndex !== -1) {
		const existing = state.observers[existingIndex];
		if (existing === undefined || existing.latitudeDeg === latitudeDeg) return state;

		// Longitude is never stored, so a second placement at the same latitude is
		// the same place: the planet's rotation has swept every longitude.
		const observers = state.observers.map((observer, index) =>
			index === existingIndex ? { ...observer, latitudeDeg } : observer
		);
		return { ...state, observers };
	}

	if (state.observers.length >= MAX_OBSERVERS) return state;

	const observer = {
		id: event.povId,
		bodyId: PLACEMENT_BODY,
		latitudeDeg,
		colour: nextObserverColour(state.observers.map((placed) => placed.colour))
	};

	return { ...state, observers: [...state.observers, observer] };
}

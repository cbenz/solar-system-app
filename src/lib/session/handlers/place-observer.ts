/**
 * `place-observer`: put an observer on a body, or move an existing one along its
 * meridian. Latitude is the only control; longitude stays derived. The session
 * owns the colour, so an observer keeps the one it was given.
 */

import { nextObserverColour } from '../observer-colour';
import type { SessionEvent, SessionState } from '../types';

/** An activity declares at most three POVs (GLOSSARY: POV). */
export const MAX_OBSERVERS = 3;

function clampLatitude(latitudeDeg: number): number {
	if (!Number.isFinite(latitudeDeg)) return 0;
	return Math.min(Math.max(latitudeDeg, -89.999), 89.999);
}

export function handlePlaceObserver(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'place-observer') return null;

	const latitudeDeg = clampLatitude(event.latitudeDeg);
	const existingIndex = state.observers.findIndex((observer) => observer.id === event.povId);

	if (existingIndex !== -1) {
		const existing = state.observers[existingIndex];
		if (existing === undefined || existing.latitudeDeg === latitudeDeg) return state;

		const observers = state.observers.map((observer, index) =>
			index === existingIndex ? { ...observer, latitudeDeg } : observer
		);
		return { ...state, observers };
	}

	if (state.observers.length >= MAX_OBSERVERS) return state;

	const observer = {
		id: event.povId,
		bodyId: 'earth' as const,
		latitudeDeg,
		colour: nextObserverColour(state.observers.map((placed) => placed.colour))
	};

	return { ...state, observers: [...state.observers, observer] };
}

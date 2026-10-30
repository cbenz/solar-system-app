/**
 * The session module's vocabulary.
 *
 * The session module is pure and headless: no Three.js, no DOM, no Svelte.
 * Everything observable about the app is a function of this state, and every
 * state change goes through `applyEvent(state, event)`.
 *
 * Units: **distances are astronomical units (AU)** everywhere in the session
 * module, for the Sun, the Earth and the Moon alike (`AU_KM` in
 * `ephemeris.ts` converts to kilometres). Distances are the true ones; the
 * renderer owns every distortion it needs to stay readable (ADR-0003).
 *
 * Frame: the ecliptic of date, right-handed, `+x` toward the vernal equinox,
 * `+z` toward ecliptic north. Body positions in a `SceneSnapshot` are
 * heliocentric; the Sun sits at the origin.
 */

import type { Locale } from '$lib/i18n/locale';

/**
 * Epoch milliseconds in UTC. A plain number, never a `Date`, and never stored
 * anywhere but in session state: the instant is the only time authority, and
 * positions are a pure function of it (ADR-0007).
 */
export type Instant = number;

export type Vec3 = { x: number; y: number; z: number };

/**
 * A body the session can draw. Later tickets extend this union: planets appear
 * in the map, the Moon in tickets 05 and 16.
 */
export type BodyId = 'sun' | 'earth' | 'moon';

/**
 * Someone standing on a body, whose view fills a POV.
 *
 * Latitude is the only control (the planet's rotation sweeps every longitude).
 * `longitudeDeg` is a convention, not a control: it is 0 unless an activity
 * declares otherwise, and the same rotation function drives the globe mesh and
 * the observer's hour angle.
 */
export type Observer = {
	id: string;
	bodyId: BodyId;
	latitudeDeg: number;
	longitudeDeg: number;
};

/**
 * A window on time, declared by whatever is running (the sandbox declares a
 * year). Derived state: it lives in `SessionState`, never in `SessionEvent`.
 */
export type TimeSpan = {
	fromInstant: Instant;
	toInstant: Instant;
};

export type SessionMode = 'sandbox' | 'activity';
export type SessionPhase = 'sandbox' | 'guide' | 'mission';

export type SessionState = {
	locale: Locale;
	mode: SessionMode;
	activityId: string | null;
	phase: SessionPhase;
	guideStep: number | null;
	instant: Instant;
	trueDistance: boolean;
	trueSize: boolean;
	subsystem: BodyId[];
	observers: Observer[];
	/**
	 * `playbackSpeed` is in **simulated days per real second** (default 1: a year
	 * in about six minutes). Playback speed is a setting, never a timeline control.
	 */
	settings: Record<string, number | boolean>;
	timeSpan: TimeSpan;
};

export type SceneBody = { id: BodyId; position: Vec3 };

export type SceneObserver = {
	observer: Observer;
	sunElevationDeg: number;
	daylight: boolean;
	visibleBodies: BodyId[];
};

export type SceneSnapshot = {
	bodies: SceneBody[];
	observers: SceneObserver[];
};

/**
 * The full event union. Ticket 03 handles `scrub-to` only; every other case is
 * typed here and rejected at runtime by the reducer until its own ticket adds a
 * handler under `handlers/`.
 */
export type SessionEvent =
	| { type: 'open-activity'; activityId: string }
	| { type: 'leave-activity' }
	| { type: 'next-guide-step' }
	| { type: 'scrub-to'; instant: Instant }
	| { type: 'place-observer'; povId: string; latitudeDeg: number }
	| { type: 'switch-subsystem'; subsystem: BodyId[] }
	| { type: 'set-setting'; key: string; value: number | boolean }
	| { type: 'toggle-true-distance' }
	| { type: 'toggle-true-size' }
	| { type: 'set-locale'; locale: Locale };

export type SessionResult = {
	state: SessionState;
	scene: SceneSnapshot;
};

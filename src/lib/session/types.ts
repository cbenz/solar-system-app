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
import type { Activity } from '../../activities/types';

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
 * `longitudeDeg` is an optional convention, not a control: placement leaves it
 * out, and the same rotation function then carries the day. An activity may
 * declare another longitude for a staged observation. `colour` is assigned by
 * the session when the observer is placed, never by a component.
 */
export type Observer = {
	id: string;
	bodyId: BodyId;
	latitudeDeg: number;
	longitudeDeg?: number;
	colour: string;
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

/** The camera's two numbers: distance in drawn Earth radii, pitch in radians. */
export type CameraState = {
	distance: number;
	pitch: number;
};

/**
 * What the sandbox looked like when an activity opened. Leaving restores it
 * exactly, so closing an activity lands the child back where they were.
 */
export type SandboxView = {
	instant: Instant;
	camera: CameraState;
	timeSpan: TimeSpan;
	observers: Observer[];
	settings: Record<string, number | boolean>;
};

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
	/** Where the renderer's camera is; gestures and the activity toolbar both write it. */
	camera: CameraState;
	/** The catalogue the session resolves `activityId` against. */
	activities: readonly Activity[];
	/** Set while an activity is open; `null` in the sandbox. */
	sandboxView: SandboxView | null;
};

/**
 * A body in the scene. `position` is heliocentric and true; the two factors are
 * the scale the renderer applies (`scale.ts`). Distances are distorted by
 * default, so every renderer multiplies rather than deciding for itself.
 */
export type SceneBody = {
	id: BodyId;
	position: Vec3;
	/** Multiplies the body's offset from its primary (see `primaryOf`). */
	distanceFactor: number;
	/** Multiplies the body's true radius when it is drawn. */
	radiusFactor: number;
};

export type SceneObserver = {
	observer: Observer;
	sunElevationDeg: number;
	/** Azimuth measured clockwise from north (0 … 360), for the POV panel. */
	sunAzimuthDeg: number;
	daylight: boolean;
	/** Outward surface normal in the ecliptic frame, for the dot on the globe. */
	surfaceNormal: Vec3;
	visibleBodies: BodyId[];
};

/**
 * Where to draw an activity marker. The marker belongs to a body, not to a
 * coordinate: the renderer puts it around whichever body the snapshot draws.
 */
export type SceneMarker = {
	activityId: string;
	bodyId: BodyId;
};

export type SceneSnapshot = {
	bodies: SceneBody[];
	observers: SceneObserver[];
	markers: SceneMarker[];
	camera: CameraState;
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
	| { type: 'set-camera'; camera: CameraState }
	| { type: 'select-camera-preset'; presetId: string }
	| { type: 'toggle-true-distance' }
	| { type: 'toggle-true-size' }
	| { type: 'set-locale'; locale: Locale };

export type SessionResult = {
	state: SessionState;
	scene: SceneSnapshot;
};

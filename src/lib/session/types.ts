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
import type { MessageKey } from '$lib/i18n/messages';
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

/**
 * The four phases of a mission, in order and forward only (ADR-0004).
 *
 * `predict` records what the child expects, `manipulate` is the child acting on
 * the model, `observe` is the model answering, `explain` is the words after the
 * answer. Abandoning is the only way out that skips ahead, and it leaves the
 * mission for the activity's sandbox.
 */
export type MissionPhase = 'predict' | 'manipulate' | 'observe' | 'explain';

/**
 * What the child claimed, kept verbatim for the rest of the mission.
 *
 * The instant and the settings are copies taken at the moment of the commit, so
 * moving time afterwards cannot rewrite what the child said.
 */
export type RecordedPrediction = {
	missionId: string;
	propositionId: string;
	/** The claim in the child's words; the panel plays it back. */
	statement: MessageKey;
	instant: Instant;
	settings: Record<string, number | boolean>;
};

/** The mission currently running, if any. Never null while `phase` is 'mission'. */
export type MissionProgress = {
	missionId: string;
	phase: MissionPhase;
	prediction: RecordedPrediction | null;
};

/** How close the scene is to the phenomenon, from the mission's own predicate. */
export type SuccessState = 'far' | 'close' | 'right';

/**
 * A graded answer: `measure` is the distance from the target in the mission's
 * units (0 when a discrete task is satisfied). It is for tests and for tuning
 * tolerances, never for display: the child sees words and the scene.
 */
export type SuccessOutcome = {
	state: SuccessState;
	measure: number;
};

/** The camera's two numbers: distance in drawn Earth radii, pitch in radians. */
export type CameraState = {
	distance: number;
	pitch: number;
};

/**
 * A body's orbit in the sandbox, as the state vector it was derived from. The
 * element set is a consequence (`orbit.ts`), never stored: this vector plus the
 * epoch is enough to place the body at any instant, in either direction.
 *
 * `position` and `velocity` are relative to the body's primary (the Sun for the
 * Earth, the Earth for the Moon), in AU and AU/day.
 */
export type SandboxOrbit = {
	position: Vec3;
	velocity: Vec3;
	epochInstant: Instant;
};

/** The pencil's undo: everything an edit may touch, captured when it starts. */
export type SandboxEditBaseline = {
	orbits: Partial<Record<BodyId, SandboxOrbit>>;
	masses: Partial<Record<BodyId, number>>;
	sunPositionAu: Vec3;
};

/**
 * What the sandbox editing workbench holds, and nothing else: an activity never
 * reads it. Empty by default, so the sandbox is the ephemeris until the child
 * changes something.
 */
export type SandboxState = {
	/** Only bodies the child has edited have an entry. */
	orbits: Partial<Record<BodyId, SandboxOrbit>>;
	/** Mass overrides in kilograms; absent means the published mass. */
	masses: Partial<Record<BodyId, number>>;
	/** The Sun is draggable in the sandbox (ADR-0004 rule 2); this is the position light comes from. */
	sunPositionAu: Vec3;
	/** The body whose properties card is open, or `null`. */
	selectedBodyId: BodyId | null;
	/** Non-null while the pencil is pressed; cancel restores it. */
	editBaseline: SandboxEditBaseline | null;
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
	/** Set while a mission runs; `null` in the activity's sandbox or the guide. */
	mission: MissionProgress | null;
	/** The sandbox workbench: edited orbits, masses and the Sun's position. */
	sandbox: SandboxState;
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
	/** True when the sandbox orbit is unbound and never comes back. */
	escaped: boolean;
	/**
	 * Heliocentric samples of an escaped body's future track, oldest first: the
	 * renderer draws them so the departure is visible. Empty for every bound body.
	 */
	track: Vec3[];
};

/**
 * The Moon as one POV sees it: where it is above the horizon, how much of it is
 * lit and which way the lit limb points. The POV panel draws this and nothing
 * else — no phase formulae in a component.
 */
export type SceneMoon = {
	altitudeDeg: number;
	/** Azimuth measured clockwise from north (0 … 360), for the POV panel. */
	azimuthDeg: number;
	illuminatedFraction: number;
	phaseAngleDeg: number;
	waxing: boolean;
	angularDiameterDeg: number;
	apparentMagnitude: number;
	/**
	 * Screen-plane direction from the Moon toward the Sun, in degrees from the
	 * panel's +x (east) axis, counter-clockwise: the lit limb points that way.
	 */
	litLimbAngleDeg: number;
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
	/** True when `visibleBodies` is narrowed by the visibility limit. */
	visibilityLimit: boolean;
	/** The Moon for this POV, or null when it is not drawn (see `night-sky.ts`). */
	moon: SceneMoon | null;
};

/**
 * Where to draw an activity marker. The marker belongs to a body, not to a
 * coordinate: the renderer puts it around whichever body the snapshot draws.
 */
export type SceneMarker = {
	activityId: string;
	bodyId: BodyId;
};

/**
 * The mission as the panel draws it: the phase, the words for this phase, the
 * recorded prediction, the graded answer and the close-attempt feedback. The
 * answer itself is the scene, so nothing here names it.
 */
export type SceneMission = {
	id: string;
	phase: MissionPhase;
	label: MessageKey;
	brief: MessageKey;
	/** The prompt for the current phase (see `promptFor` in `missions.ts`). */
	prompt: MessageKey;
	prediction: RecordedPrediction | null;
	/** Null before the child has committed a prediction. */
	outcome: SuccessOutcome | null;
	/** The close-attempt words, or null when the attempt is not close. */
	feedback: MessageKey | null;
};

export type SceneSnapshot = {
	bodies: SceneBody[];
	observers: SceneObserver[];
	markers: SceneMarker[];
	camera: CameraState;
	mission: SceneMission | null;
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
	| { type: 'set-locale'; locale: Locale }
	| { type: 'start-mission'; missionId: string }
	| { type: 'record-prediction' }
	| { type: 'reveal-mission' }
	| { type: 'explain-mission' }
	| { type: 'finish-mission' }
	| { type: 'abandon-mission' }
	| { type: 'select-body'; bodyId: BodyId | null }
	| { type: 'begin-body-edit'; bodyId: BodyId }
	| {
			type: 'set-body-parameter';
			bodyId: BodyId;
			parameter: 'mass' | 'distance' | 'speed';
			value: number;
		}
	| { type: 'confirm-body-edit' }
	| { type: 'cancel-body-edit' }
	/** Drag a body (never the Sun) to a new position; `velocity` null means dropped at rest. */
	| { type: 'drop-body'; bodyId: BodyId; position: Vec3; velocity: Vec3 | null }
	/** Move the Sun in the sandbox; refused inside an activity (ADR-0004 rule 2). */
	| { type: 'move-body'; bodyId: BodyId; position: Vec3 };

export type SessionResult = {
	state: SessionState;
	scene: SceneSnapshot;
};

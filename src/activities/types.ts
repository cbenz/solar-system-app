/**
 * The activity schema: the real API of this project (ADR-0001).
 *
 * Every activity is a typed data module. It carries its subsystem, its POV
 * count, its time span, its camera presets, its settings, its guide and its
 * missions. Nothing here is code: adding an activity means adding a module, not
 * a branch.
 *
 * Every string a child can see is a `MessageKey`, never a literal (ADR-0006).
 * The schema only declares labels; the catalogues own the words.
 */

import type { MessageKey } from '$lib/i18n/messages';
import { withSun, type Subsystem } from '$lib/session/subsystem';
import type { BodyId, Instant, SessionState } from '$lib/session/types';

/** The id a guide step uses to name a camera preset declared by its activity. */
export type PresetId = string;

/** An activity's difficulty, from 1 to 5. It grades the activity, never the child. */
export type Level = 1 | 2 | 3 | 4 | 5;

/**
 * A named camera position an activity offers in its toolbar.
 *
 * `distance` is in scene units (the drawn Earth radius is 1) and `pitch` is in
 * radians. The activity's zoom is clamped to the interval its presets span.
 */
export type CameraPreset = {
	id: PresetId;
	label: MessageKey;
	distance: number;
	pitch: number;
};

/**
 * An observer the activity stages in a POV. The session assigns the colour; the
 * activity chooses the body and latitude, and may pin a longitude.
 */
export type PovSpec = {
	id: string;
	bodyId: BodyId;
	latitudeDeg: number;
	longitudeDeg?: number;
};

/**
 * One setting an activity declares. `number` settings carry their range; a
 * `boolean` setting is its own two-value range. `set-setting` validates against
 * this spec, so an out-of-range value never reaches the state.
 */
export type SettingSpec = {
	key: string;
	label: MessageKey;
} & (
	| {
			kind: 'number';
			default: number;
			min: number;
			max: number;
			step?: number;
	  }
	| {
			kind: 'boolean';
			default: boolean;
	  }
);

/**
 * A latitude circle an activity draws on the Earth, beyond the Equator that is
 * always drawn. The renderer owns the colour; the activity owns the latitude.
 */
export type LatitudeCircleSpec = {
	id: string;
	latitudeDeg: number;
};

/**
 * An orbit ring an activity asks the space view to draw.
 *
 * The activity names what to draw; the session owns the geometry, exactly as it
 * does for latitude circles. `ecliptic` is the Earth's orbital plane made
 * visible where the Moon's orbit lives — the reference the tilt is read against.
 */
export type OrbitPathSpec = {
	id: string;
	kind: 'moon-orbit' | 'ecliptic' | 'earth-orbit';
};

/** One scripted guide step. Ticket 08 drives the sequence; here it is data. */
export type GuideStep = {
	narration: MessageKey;
	apply: {
		camera?: PresetId;
		instant?: Instant;
		/** Only where the activity declares a tilt setting. */
		tilt?: number;
		povs?: PovSpec[];
	};
	waitForChild: boolean;
};

/**
 * The part of the session state a mission predicate may read.
 *
 * It is the child-manipulable scene: the instant, the camera, the observers and
 * the settings. A predicate that needs the mission's own phase or catalogue is a
 * predicate that will lie, so the type does not offer them.
 */
export type MissionScene = Pick<
	SessionState,
	| 'instant'
	| 'timeSpan'
	| 'camera'
	| 'observers'
	| 'settings'
	| 'trueDistance'
	| 'trueSize'
	| 'subsystem'
>;

/**
 * One claim a child can make about the model, expressed by producing it.
 *
 * There is no option row: the child moves time, moves a body or changes a
 * setting until the scene holds this claim, then commits. `holds` is what makes
 * the scene state the proposition; `statement` is the claim played back in the
 * child's words, before and after the reveal.
 */
export type PredictionProposition = {
	id: string;
	statement: MessageKey;
	holds: (scene: MissionScene) => boolean;
};

/**
 * The predict step: the child states a claim by producing a scene state.
 *
 * The session records the first proposition whose `holds` is true at the moment
 * the child commits. At least one proposition must be expressible in the scene
 * the mission offers, or the mission can never leave the predict phase.
 */
export type PredictionSpec = {
	prompt: MessageKey;
	propositions: readonly PredictionProposition[];
};

/**
 * Has the child produced the phenomenon? Never "did they guess the right words".
 *
 * `discrete` tasks answer yes or no. `continuous` tasks report how far the scene
 * is from the target: `|measure| <= tolerance` is `right`, and everything up to
 * and including `closeTolerance` beyond that is `close`, the band the child can
 * correct from. `closeTolerance` must be at least `tolerance`.
 */
export type SuccessSpec =
	| {
			kind: 'discrete';
			holds: (scene: MissionScene) => boolean;
	  }
	| {
			kind: 'continuous';
			/** Distance from the target in the mission's own units, e.g. milliseconds. */
			measure: (scene: MissionScene) => number;
			tolerance: number;
			closeTolerance: number;
	  };

/**
 * A task the child performs on the model, never in a form (ADR-0004).
 *
 * A mission runs predict → manipulate → observe → explain. The prediction is a
 * scene state the child produces and the session records; the answer is the
 * scene the model shows once the success predicate is satisfied. No field here
 * names an answer to pick, because there is nothing to pick.
 */
export type MissionSpec = {
	id: string;
	/** Short name for the mission's button in the activity toolbar. */
	label: MessageKey;
	/** The standing sentence: what the child is asked to do, in every phase. */
	brief: MessageKey;
	prediction: PredictionSpec;
	success: SuccessSpec;
	/** What to look at once the model answers: the scene, never a verdict. */
	observe: MessageKey;
	/** What the mission was about, once the child has seen the answer. */
	explain: MessageKey;
	/** Words for a close attempt and for the answer, never a score. */
	feedback: {
		close: MessageKey;
		right: MessageKey;
	};
};

export type Activity = {
	id: string;
	level: Level;
	/** The Sun is implied; `Subsystem` makes its absence a type error. */
	subsystem: Subsystem;
	povs: readonly PovSpec[];
	timeSpan: { from: Instant; to: Instant };
	/** Extra latitude circles this activity draws; the Equator is always drawn. */
	latitudeCircles?: readonly LatitudeCircleSpec[];
	/** Orbit rings this activity draws; none are drawn by default. */
	orbitPaths?: readonly OrbitPathSpec[];
	cameraPresets: readonly CameraPreset[];
	settings: readonly SettingSpec[];
	guide: readonly GuideStep[];
	missions: readonly MissionSpec[];
};

/**
 * What an activity module actually writes: the body list may omit the Sun,
 * because the normaliser adds it. The resulting `Activity` still carries a
 * `Subsystem`, so no consumer can forget the Sun.
 */
export type ActivityDeclaration = Omit<Activity, 'subsystem'> & {
	subsystem: readonly BodyId[];
};

/** The only way a module becomes an `Activity`: normalises the subsystem. */
export function defineActivity(declaration: ActivityDeclaration): Activity {
	return { ...declaration, subsystem: withSun(declaration.subsystem) };
}

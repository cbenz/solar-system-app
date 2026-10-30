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
import type { BodyId, Instant } from '$lib/session/types';

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
 * A task the child performs on the model, never in a form (ADR-0004).
 *
 * The target is a state of the model the scene can recognise: an instant, an
 * observer's latitude, or a camera preset. Ticket 09 fills the missions; the
 * type exists now so activity modules can declare them without falling back to
 * `any`.
 */
export type MissionSpec = {
	id: string;
	prompt: MessageKey;
	prediction: MessageKey;
	target:
		| { kind: 'instant'; instant: Instant; toleranceMs: number }
		| { kind: 'observer'; povId: string; latitudeDeg: number; toleranceDeg: number }
		| { kind: 'camera'; preset: PresetId };
	/** Feedback shown for a close attempt and for a right one, never a verdict. */
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

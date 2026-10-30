/**
 * Compile-time proof of the activity schema. This file is checked by
 * `pnpm check` (tsc/svelte-check), not run by vitest: every `@ts-expect-error`
 * below fails the check if the line stops being an error.
 *
 * Verify with `pnpm check`. The runtime counterpart is
 * `src/activities/registry.test.ts`.
 */

import type { Activity } from './types';

const complete = {
	id: 'type-check',
	level: 1,
	subsystem: ['sun', 'earth'],
	povs: [{ id: 'pov-1', bodyId: 'earth', latitudeDeg: 0 }],
	timeSpan: { from: 0, to: 1 },
	cameraPresets: [{ id: 'wide', label: 'term.camera-preset', distance: 3, pitch: 0 }],
	settings: [
		{
			key: 'speed',
			kind: 'number',
			label: 'term.activity',
			default: 1,
			min: 0,
			max: 2
		}
	],
	guide: [],
	missions: []
} satisfies Activity;

export const requiredFields: Activity = complete;

// @ts-expect-error — a subsystem without the Sun is not a Subsystem
export const withoutSun: Activity = { ...complete, subsystem: ['earth'] };

const { guide: omittedGuide, ...guideRemoved } = complete;
void omittedGuide;

// @ts-expect-error — `guide` is required, even when empty
export const missingGuide: Activity = guideRemoved;

const { missions: omittedMissions, ...missionsRemoved } = complete;
void omittedMissions;

// @ts-expect-error — `missions` is required, even when empty
export const missingMissions: Activity = missionsRemoved;

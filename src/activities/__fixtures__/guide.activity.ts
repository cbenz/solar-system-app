/**
 * A guide fixture, deliberately outside the production glob.
 *
 * Ticket 08 tests the guide's behaviour (step application, waiting, midway
 * leaves) against this activity, so the production content stays ticket 10's
 * business. Its narration keys are keys the catalogues already own.
 */

import { defineActivity, type Activity } from '../types';

const DAY = 86_400_000;
const from = Date.UTC(2025, 5, 1, 0, 0, 0);

export const guideActivity = defineActivity({
	id: 'guide-fixture',
	level: 1,
	subsystem: ['earth'],
	povs: [{ id: 'pov-a', bodyId: 'earth', latitudeDeg: 0 }],
	timeSpan: { from, to: from + 3 * DAY },
	cameraPresets: [
		{ id: 'wide', label: 'term.camera-preset', distance: 2, pitch: 0.1 },
		{ id: 'middle', label: 'term.camera-preset', distance: 4, pitch: 0.2 },
		{ id: 'near', label: 'term.camera-preset', distance: 6, pitch: 0.3 }
	],
	settings: [
		{
			key: 'tilt',
			kind: 'number',
			label: 'term.activity',
			default: 23.44,
			min: 0,
			max: 30,
			step: 0.1
		}
	],
	guide: [
		{
			narration: 'term.guide',
			apply: { camera: 'middle', instant: from + DAY },
			waitForChild: true
		},
		{
			narration: 'term.mission',
			apply: { camera: 'near', tilt: 12 },
			waitForChild: true
		},
		{
			narration: 'term.sandbox',
			apply: {
				instant: from + 2 * DAY,
				povs: [
					{ id: 'pov-b', bodyId: 'earth', latitudeDeg: 45 },
					{ id: 'pov-c', bodyId: 'earth', latitudeDeg: -45 }
				]
			},
			waitForChild: false
		}
	],
	missions: []
}) satisfies Activity;

export default guideActivity;

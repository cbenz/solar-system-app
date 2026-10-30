/**
 * A test fixture, deliberately outside the production glob.
 *
 * Tests register it with `createActivityRegistry([fixture])` and hand it to
 * `createInitialState({ activities: [...] })`, which proves that registering an
 * activity is enough to make its markers appear and make it openable.
 */

import { defineActivity, type Activity } from '../types';

const from = Date.UTC(2025, 5, 1, 0, 0, 0);

export const fixtureActivity = defineActivity({
	id: 'fixture',
	level: 2,
	subsystem: ['earth'],
	povs: [{ id: 'fixture-pov', bodyId: 'earth', latitudeDeg: 0 }],
	timeSpan: { from, to: from + 2 * 86_400_000 },
	cameraPresets: [
		{ id: 'wide', label: 'term.camera-preset', distance: 2, pitch: 0.1 },
		{ id: 'middle', label: 'term.camera-preset', distance: 4, pitch: 0.2 },
		{ id: 'near', label: 'term.camera-preset', distance: 6, pitch: 0.3 }
	],
	settings: [
		{
			key: 'exposure',
			kind: 'number',
			label: 'term.activity',
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.1
		},
		{
			key: 'grid',
			kind: 'boolean',
			label: 'term.activity',
			default: false
		}
	],
	guide: [],
	missions: []
}) satisfies Activity;

export default fixtureActivity;

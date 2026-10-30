/**
 * A minimal but valid activity. Ticket 10 replaces its guide and missions with
 * the real day-and-night content; everything the pipeline needs is here now:
 * subsystem, one POV, a span, three camera presets and two settings.
 */

import { defineActivity, type Activity } from './types';

const DAY = 86_400_000;
const from = Date.UTC(2025, 2, 20, 0, 0, 0);

export default defineActivity({
	id: 'day-and-night',
	level: 1,
	// The Sun is implied; this declares the other body in the subsystem.
	subsystem: ['earth'],
	povs: [
		{
			id: 'pov-1',
			bodyId: 'earth',
			latitudeDeg: 48.8566
		}
	],
	timeSpan: { from, to: from + 1.5 * DAY },
	cameraPresets: [
		{
			id: 'overview',
			label: 'activity.day-and-night.camera.overview',
			distance: 4.5,
			pitch: 0.1
		},
		{
			id: 'side',
			label: 'activity.day-and-night.camera.side',
			distance: 3.2,
			pitch: 0.1
		},
		{
			id: 'close',
			label: 'activity.day-and-night.camera.close',
			distance: 2.1,
			pitch: 0.1
		}
	],
	settings: [
		{
			key: 'playbackSpeed',
			kind: 'number',
			label: 'activity.day-and-night.setting.rotation',
			default: 1,
			min: 0.1,
			max: 10,
			step: 0.1
		}
	],
	guide: [],
	missions: []
}) satisfies Activity;

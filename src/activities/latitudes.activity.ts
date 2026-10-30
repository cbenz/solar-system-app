/**
 * Latitudes: three places on the same planet, seen at once over a whole year.
 *
 * The Equator, the Tropic of Cancer and the Arctic Circle are observed side by
 * side. The activity draws the Tropics and the Polar Circles on the globe so the
 * three POVs can be located on the Earth the child is looking at. It does not
 * explain the tilt (ticket 13): the circles are a given, not a slider.
 *
 * Every latitude is derived from the model's obliquity, never written as
 * 23.44 or 66.5 by hand (see `places.ts` for the same derivation).
 */

import { OBLIQUITY_DEG } from '$lib/session/ephemeris';
import { POLAR_CIRCLE_DEG } from '$lib/session/places';
import { defineActivity, type Activity } from './types';

const DAY = 86_400_000;

/** The observed year: two solstices and two equinoxes inside one span. */
const from = Date.UTC(2025, 0, 1, 0, 0, 0);
const to = Date.UTC(2026, 0, 1, 0, 0, 0);

/** Published instants (USNO), not "the 21st": the solstice moves with the year. */
const MARCH_EQUINOX = Date.UTC(2025, 2, 20, 9, 1);
const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);
const DECEMBER_SOLSTICE = Date.UTC(2025, 11, 21, 15, 3);

export default defineActivity({
	id: 'latitudes',
	level: 2,
	subsystem: ['earth'],
	povs: [
		{ id: 'equator', bodyId: 'earth', latitudeDeg: 0 },
		{ id: 'tropic', bodyId: 'earth', latitudeDeg: OBLIQUITY_DEG },
		{ id: 'polar-circle', bodyId: 'earth', latitudeDeg: POLAR_CIRCLE_DEG }
	],
	timeSpan: { from, to },
	/**
	 * Four circles, in pairs: the Tropics mark where the Sun can reach the
	 * zenith, the Polar Circles mark where a day can last 24 hours. Both are
	 * derived from ε, never from a published rounded latitude.
	 */
	latitudeCircles: [
		{ id: 'tropic-of-cancer', latitudeDeg: OBLIQUITY_DEG },
		{ id: 'tropic-of-capricorn', latitudeDeg: -OBLIQUITY_DEG },
		{ id: 'arctic-circle', latitudeDeg: POLAR_CIRCLE_DEG },
		{ id: 'antarctic-circle', latitudeDeg: -POLAR_CIRCLE_DEG }
	],
	cameraPresets: [
		{
			id: 'whole-system',
			label: 'activity.latitudes.camera.overview',
			distance: 5.5,
			pitch: 0.12
		},
		{
			id: 'sunlit-side',
			label: 'activity.latitudes.camera.sunlit',
			distance: 3.2,
			pitch: 0.08
		},
		{
			id: 'above-pole',
			label: 'activity.latitudes.camera.abovePole',
			distance: 3.6,
			pitch: 1.25
		}
	],
	settings: [
		{
			key: 'playbackSpeed',
			kind: 'number',
			label: 'activity.latitudes.setting.playback',
			default: 2,
			min: 0.5,
			max: 10,
			step: 0.5
		}
	],
	guide: [
		{
			narration: 'activity.latitudes.guide.equator',
			apply: { camera: 'whole-system', instant: MARCH_EQUINOX },
			waitForChild: true
		},
		{
			narration: 'activity.latitudes.guide.june',
			apply: { camera: 'sunlit-side', instant: JUNE_SOLSTICE },
			waitForChild: true
		},
		{
			narration: 'activity.latitudes.guide.december',
			apply: { camera: 'sunlit-side', instant: DECEMBER_SOLSTICE },
			waitForChild: true
		},
		{
			narration: 'activity.latitudes.guide.above',
			apply: { camera: 'above-pole', instant: JUNE_SOLSTICE },
			waitForChild: false
		}
	],
	missions: [
		{
			id: 'zenith-day',
			prompt: 'activity.latitudes.mission.zenith.prompt',
			prediction: 'activity.latitudes.mission.zenith.prediction',
			// The one day the Sun stands over the Tropic of Cancer.
			target: { kind: 'instant', instant: JUNE_SOLSTICE, toleranceMs: 2 * DAY },
			feedback: {
				close: 'activity.latitudes.mission.zenith.close',
				right: 'activity.latitudes.mission.zenith.right'
			}
		}
	]
}) satisfies Activity;

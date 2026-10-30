/**
 * Shadows: a stick in the ground, read as a clock, then watched until it stops
 * being a clock and becomes evidence.
 *
 * **The span is a year**, and that choice is forced by the schema. The schema
 * has one `timeSpan` per activity and no event changes it, so an activity that
 * opened on a day could never reach the annual part of the guide: the guide can
 * apply an instant, not a span. Opening on a year lets the child run one day
 * inside it for the mission, then walk into the solstices with the guide
 * without the timeline jumping under them.
 *
 * **The POV sits at 19.43°N**, inside the tropics. That latitude is what makes
 * the annual evidence visible: the noon Sun crosses the zenith there in early
 * summer, so the noon shadow not only changes length across the year but flips
 * from one side of the stick to the other. Farther north the noon shadow always
 * points north and the second discovery is impossible.
 *
 * This activity discovers the tilt. It does not name it and does not explain
 * it: that is ticket 13's activity, and there is deliberately no tilt setting
 * here.
 */

import { shadowExcessAt, shadowGeometry } from '$lib/session/shadow';
import type { MissionScene } from './types';
import { defineActivity, type Activity } from './types';

const FROM = Date.UTC(2025, 0, 1);
const TO = Date.UTC(2026, 0, 1);

const MORNING = Date.UTC(2025, 2, 20, 8, 0, 0);
const AFTERNOON = Date.UTC(2025, 2, 20, 16, 0, 0);
const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 12, 0, 0);
const DECEMBER_SOLSTICE = Date.UTC(2025, 11, 21, 12, 0, 0);

/** The observer's latitude, where the annual flip is visible. */
const LATITUDE_DEG = 19.4326;

/** The instant of a scene, in the mission's own terms. */
function latitudeOf(scene: MissionScene): number | null {
	return scene.observers[0]?.latitudeDeg ?? null;
}

/**
 * Is the shadow pointing west (a morning Sun) or east (an afternoon Sun)?
 * `null` when the Sun is down and there is no shadow to point anywhere.
 */
function shadowPointsWest(scene: MissionScene): boolean | null {
	const latitude = latitudeOf(scene);
	if (latitude === null) return null;
	const shadow = shadowGeometry(latitude, scene.instant).shadowAzimuthDeg;
	if (shadow === null) return null;
	return shadow > 180;
}

export default defineActivity({
	id: 'shadows',
	level: 2,
	// The Sun is implied; the activity needs the Earth and nothing else.
	subsystem: ['earth'],
	povs: [
		{
			id: 'pov-1',
			bodyId: 'earth',
			latitudeDeg: LATITUDE_DEG
		}
	],
	// A year, so the guide can reach the annual evidence without changing span.
	timeSpan: { from: FROM, to: TO },
	cameraPresets: [
		{
			id: 'ground',
			label: 'activity.shadows.camera.ground',
			distance: 1.8,
			pitch: 0.02
		},
		{
			id: 'top',
			label: 'activity.shadows.camera.top',
			distance: 2.4,
			pitch: 1.35
		},
		{
			id: 'wide',
			label: 'activity.shadows.camera.wide',
			distance: 5,
			pitch: 0.35
		}
	],
	settings: [
		{
			key: 'playbackSpeed',
			kind: 'number',
			label: 'activity.shadows.setting.speed',
			default: 1,
			min: 0.1,
			max: 10,
			step: 0.1
		}
	],
	guide: [
		{
			narration: 'activity.shadows.guide.watchTheStick',
			apply: { camera: 'ground', instant: MORNING },
			waitForChild: true
		},
		{
			narration: 'activity.shadows.guide.runTheDay',
			apply: { instant: AFTERNOON },
			waitForChild: true
		},
		{
			narration: 'activity.shadows.guide.aYear',
			apply: { camera: 'top', instant: JUNE_SOLSTICE },
			waitForChild: true
		},
		{
			narration: 'activity.shadows.guide.otherHalf',
			apply: { instant: DECEMBER_SOLSTICE },
			waitForChild: true
		}
	],
	missions: [
		{
			id: 'shortest-shadow',
			label: 'mission.shadows.shortest.label',
			brief: 'mission.shadows.shortest.brief',
			prediction: {
				prompt: 'mission.shadows.shortest.predict',
				propositions: [
					{
						id: 'morning',
						statement: 'mission.shadows.shortest.claim.morning',
						// The child says "before noon" by leaving time in the morning;
						// the shadow's westness is what states the claim in the scene.
						holds: (scene) => shadowPointsWest(scene) === true
					},
					{
						id: 'afternoon',
						statement: 'mission.shadows.shortest.claim.afternoon',
						holds: (scene) => shadowPointsWest(scene) === false
					}
				]
			},
			success: {
				kind: 'continuous',
				// How much longer the shadow is than the day's shortest, relative to
				// it: zero at the shortest shadow, and unbounded when there is none.
				measure: (scene) => {
					const latitude = latitudeOf(scene);
					if (latitude === null) return Number.POSITIVE_INFINITY;
					return shadowExcessAt(latitude, scene.instant);
				},
				tolerance: 0.15,
				closeTolerance: 0.9
			},
			observe: 'mission.shadows.shortest.observe',
			explain: 'mission.shadows.shortest.explain',
			feedback: {
				close: 'mission.shadows.shortest.almost',
				right: 'mission.shadows.shortest.right'
			}
		}
	]
}) satisfies Activity;

/**
 * Seasons: the child's distance explanation, put on the table and measured.
 *
 * Two places on one Earth, one in summer and one in winter at the same instant,
 * at the same distance from the Sun. The activity then lets the child state the
 * distance explanation by placing the timeline in the season they believe is
 * closest, and answers with the measurement: the Earth is nearest the Sun in
 * early January, in the northern winter. The tilt slider is what remains, and
 * at zero it leaves only the small `1/r²` remainder — visible, and far too
 * small to make opposite seasons.
 *
 * ADR-0004 rule 1 is why the drawn orbit is a circle by default: the
 * `exaggeratedOrbit` setting exists only as a hypothesis the child can switch
 * on and the measurement refutes.
 */

// Imported from the owning modules, not the session barrel: the activity is
// loaded while the barrel is still initialising, and a re-export read at module
// evaluation time would be undefined.
import { OBLIQUITY_DEG, solarDeclinationDeg } from '$lib/session/ephemeris';
import { perihelionInstant } from '$lib/session/seasons';
import type { MessageKey } from '$lib/i18n/messages';
import type { MissionScene } from './types';
import { defineActivity, type Activity } from './types';

const DAY = 86_400_000;

/** One year, so both solstices and the January perihelion live inside the span. */
const FROM = Date.UTC(2025, 0, 1);
const TO = Date.UTC(2026, 0, 1);

/** Published USNO instants, not "the 21st". */
const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);
const DECEMBER_SOLSTICE = Date.UTC(2025, 11, 21, 15, 3);

export const PARIS_DEG = 48.8566;
export const SYDNEY_DEG = -33.8688;

/**
 * The two places, as message keys. The schema has no label slot on a POV, so the
 * names sit beside the data here and the POV component can resolve them by id.
 */
export const SEASONS_POV_LABELS = {
	paris: 'activity.seasons.pov.paris',
	sydney: 'activity.seasons.pov.sydney'
} as const satisfies Record<string, MessageKey>;

/** Is the Sun north of the celestial equator — the northern summer half? */
function northernSummer(scene: MissionScene): boolean {
	return solarDeclinationDeg(scene.instant) > 0;
}

export default defineActivity({
	id: 'seasons',
	level: 4,
	title: 'activity.seasons.title',
	subsystem: ['earth'],
	povs: [
		{ id: 'paris', bodyId: 'earth', latitudeDeg: PARIS_DEG },
		{ id: 'sydney', bodyId: 'earth', latitudeDeg: SYDNEY_DEG }
	],
	timeSpan: { from: FROM, to: TO },
	cameraPresets: [
		{
			id: 'year',
			label: 'activity.seasons.camera.year',
			distance: 6.5,
			pitch: 0.35
		},
		{
			id: 'sunlit',
			label: 'activity.seasons.camera.sunlit',
			distance: 4.2,
			pitch: 0.08
		},
		{
			id: 'above-pole',
			label: 'activity.seasons.camera.abovePole',
			distance: 3.6,
			pitch: 1.25
		}
	],
	settings: [
		{
			key: 'tilt',
			kind: 'number',
			label: 'activity.seasons.setting.tilt',
			default: OBLIQUITY_DEG,
			min: 0,
			max: OBLIQUITY_DEG,
			step: 0.1
		},
		{
			key: 'exaggeratedOrbit',
			kind: 'boolean',
			label: 'activity.seasons.setting.exaggeratedOrbit',
			default: false
		},
		{
			key: 'playbackSpeed',
			kind: 'number',
			label: 'activity.seasons.setting.playback',
			default: 2,
			min: 0.5,
			max: 10,
			step: 0.5
		}
	],
	guide: [
		{
			narration: 'activity.seasons.guide.june',
			apply: { camera: 'year', instant: JUNE_SOLSTICE },
			waitForChild: true
		},
		{
			narration: 'activity.seasons.guide.december',
			apply: { camera: 'sunlit', instant: DECEMBER_SOLSTICE },
			waitForChild: true
		},
		{
			narration: 'activity.seasons.guide.noTilt',
			apply: { camera: 'sunlit', instant: JUNE_SOLSTICE, tilt: 0 },
			waitForChild: true
		},
		{
			narration: 'activity.seasons.guide.parallelRays',
			apply: { camera: 'sunlit', instant: JUNE_SOLSTICE, tilt: OBLIQUITY_DEG },
			waitForChild: false
		}
	],
	missions: [
		{
			id: 'closest-day',
			label: 'activity.seasons.mission.closest.label',
			brief: 'activity.seasons.mission.closest.brief',
			prediction: {
				prompt: 'activity.seasons.mission.closest.prediction',
				propositions: [
					{
						id: 'summer',
						statement: 'activity.seasons.mission.closest.claim.summer',
						// The child states "closer in summer" by leaving the timeline in
						// the northern summer half and committing.
						holds: (scene) => northernSummer(scene)
					},
					{
						id: 'winter',
						statement: 'activity.seasons.mission.closest.claim.winter',
						holds: (scene) => !northernSummer(scene)
					}
				]
			},
			success: {
				kind: 'continuous',
				// Distance from the actual perihelion inside a year.
				measure: (scene) =>
					scene.instant -
					perihelionInstant(scene.timeSpan.fromInstant, scene.timeSpan.toInstant),
				tolerance: 2 * DAY,
				closeTolerance: 15 * DAY
			},
			observe: 'activity.seasons.mission.closest.observe',
			explain: 'activity.seasons.mission.closest.explain',
			feedback: {
				close: 'activity.seasons.mission.closest.close',
				right: 'activity.seasons.mission.closest.right'
			}
		}
	]
}) satisfies Activity;

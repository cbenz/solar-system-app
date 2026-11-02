/**
 * A mission fixture, deliberately outside the production glob.
 *
 * Two missions over one day on the Earth:
 *
 * - `noon` asks the child to bring time to noon. It is continuous, so the test
 *   can walk the whole tolerance range: the answer is the shadow the scene
 *   shows at that instant, never a verdict.
 * - `near` asks the child to bring the camera in close. It is discrete, so the
 *   test covers the yes/no branch of the success predicate.
 *
 * The message keys are fixture-only (`fixture.*`) and typed with a cast: the
 * catalogue owns the real words, and a fixture must not add production keys.
 */

import type { MessageKey } from '$lib/i18n/messages';
import { defineActivity, type Activity, type MissionSpec } from '../types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const from = Date.UTC(2025, 2, 20, 0, 0, 0);
/** The instant the `noon` mission is about: local noon on the equinox. */
export const NOON = Date.UTC(2025, 2, 20, 12, 0, 0);

/** Fixture-only message keys, so the production catalogue stays clean. */
function key(name: string): MessageKey {
	return name as MessageKey;
}

export const noonMission: MissionSpec = {
	id: 'noon',
	label: key('fixture.mission.noon.label'),
	brief: key('fixture.mission.noon.brief'),
	prediction: {
		prompt: key('fixture.mission.noon.predict'),
		propositions: [
			{
				id: 'morning',
				statement: key('fixture.mission.noon.claim.morning'),
				// The child says "it happens in the morning" by leaving time there
				// and committing; only the scene state carries the claim.
				holds: (scene) => scene.instant < NOON
			},
			{
				id: 'afternoon',
				statement: key('fixture.mission.noon.claim.afternoon'),
				holds: (scene) => scene.instant >= NOON
			}
		]
	},
	success: {
		kind: 'continuous',
		measure: (scene) => scene.instant - NOON,
		tolerance: 5 * MINUTE,
		closeTolerance: 60 * MINUTE
	},
	observe: key('fixture.mission.noon.observe'),
	explain: key('fixture.mission.noon.explain'),
	feedback: {
		close: key('fixture.mission.noon.almost'),
		right: key('fixture.mission.noon.right')
	}
};

export const nearMission: MissionSpec = {
	id: 'near',
	label: key('fixture.mission.near.label'),
	brief: key('fixture.mission.near.brief'),
	prediction: {
		prompt: key('fixture.mission.near.predict'),
		propositions: [
			{
				id: 'close-up',
				statement: key('fixture.mission.near.claim'),
				// A single proposition that always holds: the child states it by
				// committing wherever they are, which keeps the discrete branch
				// testable without a second kind of prediction.
				holds: () => true
			}
		]
	},
	success: {
		kind: 'discrete',
		holds: (scene) => scene.camera.distance >= 5
	},
	observe: key('fixture.mission.near.observe'),
	explain: key('fixture.mission.near.explain'),
	feedback: {
		close: key('fixture.mission.near.almost'),
		right: key('fixture.mission.near.right')
	}
};

export const missionActivity = defineActivity({
	id: 'mission-fixture',
	level: 1,
	title: 'term.mission',
	subsystem: ['earth'],
	povs: [{ id: 'mission-pov', bodyId: 'earth', latitudeDeg: 48.8566 }],
	timeSpan: { from, to: from + DAY },
	cameraPresets: [
		{ id: 'wide', label: 'term.camera-preset', distance: 2, pitch: 0.1 },
		{ id: 'middle', label: 'term.camera-preset', distance: 4, pitch: 0.2 },
		{ id: 'near', label: 'term.camera-preset', distance: 6, pitch: 0.3 }
	],
	settings: [],
	guide: [],
	missions: [noonMission, nearMission]
}) satisfies Activity;

export default missionActivity;

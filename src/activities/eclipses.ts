/**
 * Eclipses: the Moon is placed on its orbit until the alignment happens, and
 * three people on the same planet see three different things at one instant.
 *
 * **The span is fifteen months, not a calendar year**, and that is the only
 * defensible choice here. The two checkable eclipses of ASTRONOMY.md §5 are a
 * total solar eclipse (2024-04-08) and a total lunar eclipse (2025-03-14), and
 * no calendar year contains both: 2024 has no total lunar eclipse, 2025 has no
 * total solar one. Fifteen months holds both, so the same three POVs can be
 * carried from one phenomenon to the other. The rarity sweep in the tests still
 * runs over exactly twelve months (calendar 2024), where there are exactly two
 * solar eclipse seasons.
 *
 * **The three POVs are one place each, and their longitudes are declared.**
 * Latitude alone would put every observer on the Greenwich meridian, and the
 * 2024-04-08 totality band is a 200 km strip over Texas: the activity therefore
 * pins the longitude of each POV, as ASTRONOMY.md §3.1 allows. The three are
 *   - 32.0°N, 95.0°W — inside the umbra of the 2024-04-08 eclipse (the model's
 *     own band, ~180 km from Dallas: the truncated lunar series runs ~0.2° ahead
 *     of the published conjunction, which is the documented limit of §1.3);
 *   - 34.052°N, 118.244°W — Los Angeles, published partial (48.8 % obscuration);
 *   - 20.0°S, 70.0°W — Chile, plain sunlight, the Sun well up.
 * The same three are all on the night side at 2025-03-14 06:59 UT, which is why
 * one POV set can serve both eclipses.
 *
 * **The Moon is placed, not snapped.** `moonOrbitOffsetDeg` is an offset along
 * the Moon's own inclined orbit, applied as a rotation about the node line. Zero
 * is the real Moon, so the staged instants are real eclipses; the child slides
 * the Moon and finds (or loses) the alignment. Nothing in the app moves it to
 * the answer.
 *
 * The drawn orbits are what makes the inclination visible rather than stated:
 * the Moon's orbit and the ecliptic reference ring through the Earth are two
 * rings 5.145° apart, crossing at the nodes.
 */

import { moonGeocentricAtOffsetAu, solarEclipse } from '$lib/session/eclipse';
import { MOON_ORBIT_SETTING_KEY } from '$lib/session/eclipse';
import { dot, sunGeocentricPositionAu } from '$lib/session/ephemeris';
import type { MissionScene } from './types';
import { defineActivity, type Activity } from './types';

const FROM = Date.UTC(2024, 0, 1);
const TO = Date.UTC(2025, 2, 31);

/**
 * The 2024-04-08 total solar eclipse, staged at 18:20 UT: the model's umbra is
 * over east Texas then (the published conjunction is 18:21, and the truncated
 * lunar series is ~0.2° ahead, which is ~17 minutes of lunar motion).
 */
const SOLAR_ECLIPSE = Date.UTC(2024, 3, 8, 18, 20);

/** A new moon the same year with the Moon far from the node: no eclipse anywhere. */
const FAILED_NEW_MOON = Date.UTC(2024, 5, 6, 12, 38);

/** The 2025-03-14 total lunar eclipse: published greatest eclipse 06:58:47 UT. */
const LUNAR_TOTAL = Date.UTC(2025, 2, 14, 6, 59);
/** On the way in: the published umbral phase runs 05:09–08:48, totality 06:26–07:32. */
const LUNAR_PARTIAL = Date.UTC(2025, 2, 14, 6, 40);
const LUNAR_PENUMBRAL = Date.UTC(2025, 2, 14, 5, 30);

/** Inside the umbra of the 2024-04-08 eclipse: east Texas. */
const UMBRA_OBSERVER = { latitudeDeg: 32.0, longitudeDeg: -95.0 };
/** Published partial only: Los Angeles, 48.8 % obscuration. */
const PENUMBRA_OBSERVER = { latitudeDeg: 34.052, longitudeDeg: -118.244 };
/** Plain sunlight, with the Sun well above the horizon. */
const SUNLIGHT_OBSERVER = { latitudeDeg: -20.0, longitudeDeg: -70.0 };

/** The placement offset the mission scene holds. */
function offsetOf(scene: MissionScene): number {
	const value = scene.settings[MOON_ORBIT_SETTING_KEY];
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** The Moon as the scene has it: the ephemeris, moved along its orbit. */
function moonOf(scene: MissionScene) {
	return moonGeocentricAtOffsetAu(scene.instant, offsetOf(scene));
}

/** What the first POV sees of the Sun, in this scene. */
function firstObserverEclipse(scene: MissionScene) {
	const observer = scene.observers[0];
	if (observer === undefined) return null;
	return solarEclipse(observer, scene.instant, moonOf(scene));
}

/** Is the Moon on the Sun's side of the Earth, as seen from the Earth? */
function moonBetweenEarthAndSun(scene: MissionScene): boolean {
	return dot(moonOf(scene), sunGeocentricPositionAu(scene.instant)) > 0;
}

/**
 * How far the first observer is from totality, in degrees of Sun–Moon
 * separation: 0 once the Moon's disc covers the Sun's, growing outside it. The
 * mission's child-correctable measure — totality is a region, not a point, so
 * everything inside it is zero rather than negative.
 */
function degreesFromTotality(scene: MissionScene): number {
	const eclipse = firstObserverEclipse(scene);
	if (eclipse === null) return Number.POSITIVE_INFINITY;

	const inner = eclipse.moonAngularRadiusDeg - eclipse.sunAngularRadiusDeg;
	return Math.max(0, eclipse.separationDeg - inner);
}

export default defineActivity({
	id: 'eclipses',
	level: 5,
	// The alignment is a Sun–Earth–Moon thing; nothing else needs to be drawn.
	subsystem: ['earth', 'moon'],
	povs: [
		{ id: 'umbra', bodyId: 'earth', ...UMBRA_OBSERVER },
		{ id: 'penumbra', bodyId: 'earth', ...PENUMBRA_OBSERVER },
		{ id: 'sunlight', bodyId: 'earth', ...SUNLIGHT_OBSERVER }
	],
	timeSpan: { from: FROM, to: TO },
	/**
	 * The two rings of the inclination: the Moon's orbit, and the ecliptic plane
	 * it is inclined to (the Earth's orbital plane, drawn through the Earth), plus
	 * the Earth's orbit itself so the small ring can be seen being carried along.
	 */
	orbitPaths: [
		{ id: 'moon-orbit', kind: 'moon-orbit' },
		{ id: 'ecliptic', kind: 'ecliptic' },
		{ id: 'earth-orbit', kind: 'earth-orbit' }
	],
	cameraPresets: [
		{
			id: 'whole-scene',
			label: 'activity.eclipses.camera.overview',
			distance: 7,
			pitch: 0.25
		},
		{
			id: 'above-ecliptic',
			label: 'activity.eclipses.camera.aboveEcliptic',
			distance: 3.6,
			pitch: 1.15
		},
		{
			id: 'along-the-line',
			label: 'activity.eclipses.camera.alongTheLine',
			distance: 2.2,
			pitch: 0.06
		}
	],
	settings: [
		{
			// Declaring this key is what lets the child place the Moon: the session
			// reads it, and the space view lets the Moon be dragged (page.ts).
			key: MOON_ORBIT_SETTING_KEY,
			kind: 'number',
			label: 'activity.eclipses.setting.moonPlacement',
			default: 0,
			min: -180,
			max: 180,
			step: 0.5
		}
	],
	guide: [
		{
			narration: 'activity.eclipses.guide.alignment',
			apply: { camera: 'above-ecliptic', instant: SOLAR_ECLIPSE },
			waitForChild: true
		},
		{
			narration: 'activity.eclipses.guide.threeViews',
			apply: { camera: 'along-the-line', instant: SOLAR_ECLIPSE },
			waitForChild: true
		},
		{
			narration: 'activity.eclipses.guide.mostMonths',
			apply: { instant: FAILED_NEW_MOON },
			waitForChild: true
		},
		{
			narration: 'activity.eclipses.guide.earthShadow',
			apply: { camera: 'whole-scene', instant: LUNAR_PENUMBRAL },
			waitForChild: true
		},
		{
			narration: 'activity.eclipses.guide.earthShadowTotal',
			apply: { instant: LUNAR_TOTAL },
			waitForChild: true
		}
	],
	missions: [
		{
			id: 'line-them-up',
			label: 'activity.eclipses.mission.lineUp.label',
			brief: 'activity.eclipses.mission.lineUp.brief',
			prediction: {
				prompt: 'activity.eclipses.mission.lineUp.prediction',
				propositions: [
					{
						id: 'moon-in-front',
						statement: 'activity.eclipses.mission.lineUp.claim.moonInFront',
						// The child states the claim by placing the Moon on the Sun's side
						// of the Earth; the scene says which claim that is.
						holds: (scene) => moonBetweenEarthAndSun(scene)
					},
					{
						id: 'earth-in-front',
						statement: 'activity.eclipses.mission.lineUp.claim.earthInFront',
						holds: (scene) => !moonBetweenEarthAndSun(scene)
					}
				]
			},
			success: {
				kind: 'continuous',
				measure: degreesFromTotality,
				// Zero: the Moon's disc must actually cover the Sun for the first POV.
				tolerance: 0,
				closeTolerance: 0.15
			},
			observe: 'activity.eclipses.mission.lineUp.observe',
			explain: 'activity.eclipses.mission.lineUp.explain',
			feedback: {
				close: 'activity.eclipses.mission.lineUp.close',
				right: 'activity.eclipses.mission.lineUp.right'
			}
		}
	]
}) satisfies Activity;

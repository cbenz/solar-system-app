/**
 * Day and night: one place on the Earth, followed from one noon to the next.
 *
 * The span is a day and a half, opening in the morning four hours before local
 * solar noon. That choice does three jobs:
 *
 * - the child can leave time before noon for the prediction, then find noon
 *   inside the same span;
 * - the guide can walk noon → sunset → the other side of midnight → the next
 *   noon → the next sunset without the timeline jumping under the child;
 * - a child who moves the observer to the Polar Circle can run the whole day
 *   inside the span and see that it has no night. The first noon is the day
 *   before the June solstice, so the midnight between the two noons is the
 *   solstice midnight. The Polar Circle is derived from the model's obliquity
 *   (`POLAR_CIRCLE_DEG`), never written as 66.5.
 *
 * Six months later is deliberately *not* in this span: the activity is one day
 * and a half, so the polar night is a session assertion at the December
 * solstice, not a guide step that teleports the timeline. The sandbox's year is
 * where the child goes to see it.
 *
 * Both missions move **time**, never a body. The noon mission measures the gap
 * between the Sun's current elevation and its elevation on the observer's
 * meridian; the shadow mission measures the distance to the nearest crossing
 * from daylight into darkness. Neither asks the child to read a sentence: the
 * mission brief carries a scene-derived pictogram, and the answer is the scene.
 */

import {
	isDaylight,
	maxSunElevationDeg,
	sunElevationDeg,
	sunHourAngleDeg,
	type Observer
} from '$lib/session';
import type { MissionMotif, MissionScene } from './types';
import { defineActivity, type Activity } from './types';

const MINUTE = 60_000;
const DAY = 86_400_000;

/**
 * Four hours before local solar noon on 2025-06-20, so the prediction has a
 * morning to stand in. The instants are found from the model, not from a clock:
 * the Sun's hour angle is zero at 12:01:41 UTC on the 20th and 12:01:54 UTC on
 * the 21st (the June solstice day).
 */
const FROM = Date.UTC(2025, 5, 20, 8, 1, 41);
const TO = FROM + 36 * 60 * MINUTE;

/** Noon, sunset, the other side of midnight, the next noon, the next sunset. */
const NOON = Date.UTC(2025, 5, 20, 12, 1, 41);
const SUNSET = Date.UTC(2025, 5, 20, 20, 0, 46);
const MIDNIGHT = Date.UTC(2025, 5, 21, 0, 1, 41);
const NEXT_NOON = Date.UTC(2025, 5, 21, 12, 1, 54);
const NEXT_SUNSET = Date.UTC(2025, 5, 21, 20, 0, 59);

/** The observed place. The child may move it along its meridian at any time. */
const LATITUDE_DEG = 48.8566;

/** How close to the meridian counts as "now" in the prediction, in degrees. */
const NOW_BAND_DEG = 0.5;

/** The noon mission's bands, in degrees of elevation below the meridian height. */
const NOON_TOLERANCE_DEG = 0.5;
const NOON_CLOSE_TOLERANCE_DEG = 5;

/** The shadow mission's bands, in milliseconds from the crossing. */
const CROSSING_TOLERANCE_MS = 2 * MINUTE;
const CROSSING_CLOSE_TOLERANCE_MS = 20 * MINUTE;

/** The observer whose POV the activity shows, if the scene has one. */
function observerOf(scene: MissionScene): Observer | undefined {
	return scene.observers.find((observer) => observer.bodyId === 'earth');
}

/** The Sun's hour angle for the scene, or null when there is no observer. */
function hourAngleOf(scene: MissionScene): number | null {
	const observer = observerOf(scene);
	return observer === undefined ? null : sunHourAngleDeg(observer, scene.instant);
}

/**
 * The noon measure: how far the Sun is below its height on the observer's
 * meridian, in degrees. Zero exactly at solar noon and positive everywhere
 * else. The meridian height comes from the same declination formula the shadow
 * module uses, so the mission and the gnomon cannot disagree about noon.
 */
function noonDeficitDeg(scene: MissionScene): number {
	const observer = observerOf(scene);
	if (observer === undefined) return Number.POSITIVE_INFINITY;

	const meridianElevation = maxSunElevationDeg(observer.latitudeDeg, scene.instant);
	return meridianElevation - sunElevationDeg(observer, scene.instant);
}

/** Bisect a daylight boundary whose bracketing samples straddle it. */
function bisectCrossing(observer: Observer, from: number, to: number): number {
	let low = from;
	let high = to;

	for (let iteration = 0; iteration < 40; iteration += 1) {
		const middle = (low + high) / 2;
		if (isDaylight(observer, middle)) low = middle;
		else high = middle;
	}

	return (low + high) / 2;
}

/**
 * Signed distance to the nearest instant where the observer's dot crosses from
 * daylight into darkness, in milliseconds. Negative before the crossing,
 * positive after it. `Infinity` when there is no crossing in the surrounding
 * day — a polar day or a polar night has no shadow edge to find.
 *
 * The search is the same predicate the terminator and the POV use (`isDaylight`),
 * so the mission's target is exactly the scene's own boundary.
 */
function nearestSunsetOffsetMs(scene: MissionScene): number {
	const observer = observerOf(scene);
	if (observer === undefined) return Number.POSITIVE_INFINITY;

	const step = 10 * MINUTE;
	const from = scene.instant - DAY / 2;
	const to = scene.instant + DAY / 2;

	let best = Number.POSITIVE_INFINITY;
	let previous = isDaylight(observer, from);

	for (let at = from + step; at <= to; at += step) {
		const daylight = isDaylight(observer, at);

		if (previous && !daylight) {
			const crossing = bisectCrossing(observer, at - step, at);
			const offset = crossing - scene.instant;
			if (Math.abs(offset) < Math.abs(best)) best = offset;
		}

		previous = daylight;
	}

	return best;
}

/** The brief's picture, read from the Sun's elevation in the scene. */
function sunMotif(scene: MissionScene): MissionMotif {
	const observer = observerOf(scene);
	if (observer === undefined) return 'sun-below';

	const elevation = sunElevationDeg(observer, scene.instant);
	if (elevation > 5) return 'sun-high';
	if (elevation >= -5) return 'sun-on-horizon';
	return 'sun-below';
}

export default defineActivity({
	id: 'day-and-night',
	level: 1,
	// The Sun is implied; the activity needs the Earth and nothing else.
	subsystem: ['earth'],
	povs: [
		{
			id: 'pov-1',
			bodyId: 'earth',
			latitudeDeg: LATITUDE_DEG
		}
	],
	timeSpan: { from: FROM, to: TO },
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
			id: 'terminator',
			label: 'activity.day-and-night.camera.terminator',
			distance: 3.6,
			pitch: 1.25
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
	guide: [
		{
			narration: 'activity.day-and-night.guide.noon',
			apply: { camera: 'side', instant: NOON },
			waitForChild: true
		},
		{
			narration: 'activity.day-and-night.guide.sunset',
			apply: { camera: 'close', instant: SUNSET },
			waitForChild: true
		},
		{
			narration: 'activity.day-and-night.guide.midnight',
			apply: { camera: 'terminator', instant: MIDNIGHT },
			waitForChild: true
		},
		{
			narration: 'activity.day-and-night.guide.nextNoon',
			apply: { camera: 'side', instant: NEXT_NOON },
			waitForChild: true
		},
		{
			narration: 'activity.day-and-night.guide.backToDark',
			apply: { camera: 'close', instant: NEXT_SUNSET },
			waitForChild: false
		}
	],
	missions: [
		{
			id: 'noon-where-i-am',
			label: 'mission.day-and-night.noon.label',
			brief: 'mission.day-and-night.noon.brief',
			motif: sunMotif,
			prediction: {
				prompt: 'mission.day-and-night.noon.predict',
				propositions: [
					{
						id: 'before',
						statement: 'mission.day-and-night.noon.claim.before',
						// The child says "noon is later" by leaving the Sun east of the
						// meridian. The hour angle is what states that in the scene.
						holds: (scene) => {
							const hourAngle = hourAngleOf(scene);
							return hourAngle !== null && hourAngle < -NOW_BAND_DEG;
						}
					},
					{
						id: 'now',
						statement: 'mission.day-and-night.noon.claim.now',
						holds: (scene) => {
							const hourAngle = hourAngleOf(scene);
							return hourAngle !== null && Math.abs(hourAngle) <= NOW_BAND_DEG;
						}
					},
					{
						id: 'after',
						statement: 'mission.day-and-night.noon.claim.after',
						holds: (scene) => {
							const hourAngle = hourAngleOf(scene);
							return hourAngle !== null && hourAngle > NOW_BAND_DEG;
						}
					}
				]
			},
			success: {
				kind: 'continuous',
				measure: noonDeficitDeg,
				tolerance: NOON_TOLERANCE_DEG,
				closeTolerance: NOON_CLOSE_TOLERANCE_DEG
			},
			observe: 'mission.day-and-night.noon.observe',
			explain: 'mission.day-and-night.noon.explain',
			feedback: {
				close: 'mission.day-and-night.noon.close',
				right: 'mission.day-and-night.noon.right'
			}
		},
		{
			id: 'into-the-shadow',
			label: 'mission.day-and-night.shadow.label',
			brief: 'mission.day-and-night.shadow.brief',
			motif: sunMotif,
			prediction: {
				prompt: 'mission.day-and-night.shadow.predict',
				propositions: [
					{
						id: 'before',
						statement: 'mission.day-and-night.shadow.claim.before',
						holds: (scene) => {
							const hourAngle = hourAngleOf(scene);
							return hourAngle !== null && hourAngle < 0;
						}
					},
					{
						id: 'after',
						statement: 'mission.day-and-night.shadow.claim.after',
						holds: (scene) => {
							const hourAngle = hourAngleOf(scene);
							return hourAngle !== null && hourAngle >= 0;
						}
					}
				]
			},
			success: {
				kind: 'continuous',
				measure: nearestSunsetOffsetMs,
				tolerance: CROSSING_TOLERANCE_MS,
				closeTolerance: CROSSING_CLOSE_TOLERANCE_MS
			},
			observe: 'mission.day-and-night.shadow.observe',
			explain: 'mission.day-and-night.shadow.explain',
			feedback: {
				close: 'mission.day-and-night.shadow.close',
				right: 'mission.day-and-night.shadow.right'
			}
		}
	]
}) satisfies Activity;

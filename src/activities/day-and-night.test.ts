/**
 * Ticket 10: day and night, completed.
 *
 * The assertions go through the session module and the activity's own pure
 * predicates. The polar latitudes are derived from the obliquity constant, and
 * the guide is checked by ticket 08's golden helper rather than by a hand-pinned
 * step list.
 */

import { describe, expect, it } from 'vitest';
import { LOCALES } from '$lib/i18n/locale';
import { catalogues, type MessageKey } from '$lib/i18n/messages';
import {
	OBLIQUITY_DEG,
	POLAR_CIRCLE_DEG,
	applyEvent,
	buildScene,
	createInitialState,
	evaluateSuccess,
	isDaylight,
	placeName,
	type Observer,
	type SessionState
} from '$lib/session';
import { runGuideGolden } from './guide-golden';
import type { MissionScene } from './types';
import activity from './day-and-night.activity';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 86_400_000;

const LATITUDE_DEG = activity.povs[0]!.latitudeDeg;

/** The activity's own instants, read from its data rather than re-typed. */
const FROM = activity.timeSpan.from;
const TO = activity.timeSpan.to;
const NOON = activity.guide[0]!.apply.instant!;
const SUNSET = activity.guide[1]!.apply.instant!;
const MIDNIGHT = activity.guide[2]!.apply.instant!;

function observerAt(latitudeDeg: number): Observer {
	return { id: 'probe', bodyId: 'earth', latitudeDeg, colour: '#ffffff' };
}

/** Daylight minutes in a window, sampled through the session predicate. */
function daylightMinutes(observer: Observer, from: number, to: number): number {
	let minutes = 0;

	for (let instant = from; instant < to; instant += MINUTE) {
		if (isDaylight(observer, instant)) minutes += 1;
	}

	return minutes;
}

/** The part of the session state a mission predicate is allowed to read. */
function sceneAt(instant: number, latitudeDeg = LATITUDE_DEG): MissionScene {
	return {
		instant,
		timeSpan: { fromInstant: FROM, toInstant: TO },
		camera: activity.cameraPresets[0]!,
		observers: [
			{
				id: 'pov-1',
				bodyId: 'earth',
				latitudeDeg,
				colour: '#ffffff'
			}
		],
		settings: {},
		trueDistance: false,
		trueSize: false,
		subsystem: [...activity.subsystem]
	};
}

function openedActivity(instant = FROM): SessionState {
	const sandbox = createInitialState({ activities: [activity], instant });
	return applyEvent(sandbox, { type: 'open-activity', activityId: activity.id }).state;
}

/** Find the first instant after `from` where the observer's dot enters the shadow. */
function firstSunset(observer: Observer, from: number): number {
	let previous = isDaylight(observer, from);

	for (let instant = from + MINUTE; instant <= from + DAY; instant += MINUTE) {
		const daylight = isDaylight(observer, instant);
		if (previous && !daylight) return instant;
		previous = daylight;
	}

	throw new Error('no sunset in the search window');
}

describe('the day-and-night activity', () => {
	it('is level 1, one POV, a day and a half, and four declared camera presets', () => {
		expect(activity.level).toBe(1);
		expect(activity.subsystem).toEqual(['sun', 'earth']);
		expect(activity.povs).toHaveLength(1);
		expect(activity.povs[0]!.bodyId).toBe('earth');
		expect(activity.cameraPresets.length).toBeGreaterThanOrEqual(3);
		expect(activity.cameraPresets.length).toBeLessThanOrEqual(4);

		const days = (TO - FROM) / DAY;
		expect(days).toBe(1.5);
		expect(activity.settings.map((setting) => setting.key)).toContain('playbackSpeed');
	});

	it('opens from an Earth marker and closes back to the sandbox', () => {
		const sandbox = createInitialState({ activities: [activity], instant: FROM });

		expect(buildScene(sandbox).markers).toContainEqual({
			activityId: activity.id,
			bodyId: 'earth'
		});

		const opened = applyEvent(sandbox, { type: 'open-activity', activityId: activity.id }).state;
		expect(opened.mode).toBe('activity');
		expect(opened.phase).toBe('sandbox');
		expect(buildScene(opened).markers).toEqual([]);

		const closed = applyEvent(opened, { type: 'leave-activity' }).state;
		expect(closed.mode).toBe('sandbox');
		expect(closed.activityId).toBeNull();
		expect(buildScene(closed).markers).toContainEqual({
			activityId: activity.id,
			bodyId: 'earth'
		});
	});

	it('walks noon, sunset, midnight, the next noon and back into darkness', () => {
		const result = runGuideGolden(activity);

		expect(result.skipped).toBe(false);
		expect(result.steps.length).toBeGreaterThanOrEqual(4);
		expect(result.steps.length).toBe(activity.guide.length);

		const probe = observerAt(LATITUDE_DEG);
		const daylightStates = result.steps.map((step) => isDaylight(probe, step.instant));

		// Noon, sunset, the other side of midnight, the next noon, the next sunset.
		expect(daylightStates.slice(0, 5)).toEqual([true, false, false, true, false]);

		// Every step but the last is a place to look before moving on.
		expect(result.steps.map((step, index) => activity.guide[index]!.waitForChild)).toEqual([
			true,
			true,
			true,
			true,
			false
		]);
	});
});

describe('polar day and polar night at the derived Polar Circle', () => {
	it('gives the Polar Circle a day with no night at the June solstice', () => {
		const opened = openedActivity();
		const polar = applyEvent(opened, {
			type: 'place-observer',
			povId: 'pov-1',
			latitudeDeg: POLAR_CIRCLE_DEG
		}).state;
		const observer = polar.observers[0]!;

		expect(observer.latitudeDeg).toBe(POLAR_CIRCLE_DEG);

		// The activity's span holds a full window, noon to noon, around the
		// solstice midnight. The first noon is the day before the June solstice.
		const daylight = daylightMinutes(observer, NOON, NOON + DAY);
		expect(daylight).toBeGreaterThanOrEqual(23 * 60 + 59);
		expect(daylight).toBeLessThanOrEqual(24 * 60);

		// Twenty hundredths of a degree farther south there is a real night.
		const justInside = observerAt(POLAR_CIRCLE_DEG - 0.02);
		expect(daylightMinutes(justInside, NOON, NOON + DAY)).toBeLessThanOrEqual(23 * 60 + 45);
	});

	it('gives the same place a night with no day six months later', () => {
		const december = Date.UTC(2025, 11, 21);
		const sandbox = createInitialState({
			activities: [activity],
			instant: december + 12 * HOUR,
			timeSpan: { fromInstant: december, toInstant: december + 2 * DAY }
		});
		const polar = applyEvent(sandbox, {
			type: 'place-observer',
			povId: 'pov-1',
			latitudeDeg: POLAR_CIRCLE_DEG
		}).state;
		const observer = polar.observers[0]!;

		const daylight = daylightMinutes(observer, december, december + DAY);
		expect(daylight).toBeLessThanOrEqual(1);

		// Twenty hundredths of a degree farther south the Sun does rise.
		const justInside = observerAt(POLAR_CIRCLE_DEG - 0.02);
		expect(daylightMinutes(justInside, december, december + DAY)).toBeGreaterThanOrEqual(15);
	});

	it('derives the boundary from the obliquity, not from 66.5', () => {
		expect(POLAR_CIRCLE_DEG).toBe(90 - OBLIQUITY_DEG);
		expect(POLAR_CIRCLE_DEG).not.toBe(66.5);
	});
});

describe('the noon-where-I-am mission', () => {
	const mission = activity.missions.find((entry) => entry.id === 'noon-where-i-am')!;

	function outcome(instant: number) {
		return evaluateSuccess(mission.success, sceneAt(instant));
	}

	it('is continuous and reads the scene only', () => {
		expect(mission.success.kind).toBe('continuous');
		if (mission.success.kind !== 'continuous') throw new Error('expected a continuous success');

		const measure = mission.success.measure(sceneAt(SUNSET));
		expect(measure).toBeGreaterThan(0);
	});

	it('grades the meridian height as right, a little away as close, far away as far', () => {
		expect(outcome(NOON).state).toBe('right');
		expect(outcome(NOON + 10 * MINUTE).state).toBe('right');
		expect(outcome(NOON + HOUR).state).toBe('close');
		expect(outcome(NOON + 4 * HOUR).state).toBe('far');
	});

	it('keeps the prediction when the child moves on', () => {
		const started = applyEvent(openedActivity(), {
			type: 'start-mission',
			missionId: mission.id
		}).state;
		const morning = applyEvent(started, { type: 'scrub-to', instant: FROM }).state;
		const predicted = applyEvent(morning, { type: 'record-prediction' }).state;

		expect(predicted.mission?.phase).toBe('manipulate');
		expect(predicted.mission?.prediction?.propositionId).toBe('before');

		const atNoon = applyEvent(predicted, { type: 'scrub-to', instant: NOON }).state;
		expect(atNoon.mission?.prediction).toEqual(predicted.mission?.prediction);
	});
});

describe('the into-the-shadow mission', () => {
	const mission = activity.missions.find((entry) => entry.id === 'into-the-shadow')!;
	const sunset = firstSunset(observerAt(LATITUDE_DEG), FROM);

	function outcome(instant: number, latitudeDeg = LATITUDE_DEG) {
		return evaluateSuccess(mission.success, sceneAt(instant, latitudeDeg));
	}

	it('accepts the crossing into shadow, and grades nearby attempts', () => {
		expect(outcome(sunset).state).toBe('right');
		expect(outcome(sunset - 10 * MINUTE).state).toBe('close');
		expect(outcome(sunset - 4 * HOUR).state).toBe('far');
	});

	it('reports a miss in a polar day, where there is no crossing', () => {
		// One degree inside the circle is unambiguously polar day: no edge at all.
		const polarDay = outcome(NOON, POLAR_CIRCLE_DEG + 1);
		expect(polarDay.state).toBe('far');
		expect(Number.isFinite(polarDay.measure)).toBe(false);
	});
});

describe('the mission brief’s pictogram', () => {
	it('follows the Sun in the scene: high, on the horizon, below', () => {
		const started = applyEvent(openedActivity(), {
			type: 'start-mission',
			missionId: 'noon-where-i-am'
		}).state;

		expect(buildScene(started).mission?.motif).toBe('sun-high');

		const atSunset = applyEvent(started, { type: 'scrub-to', instant: SUNSET }).state;
		expect(buildScene(atSunset).mission?.motif).toBe('sun-on-horizon');

		const atMidnight = applyEvent(started, { type: 'scrub-to', instant: MIDNIGHT }).state;
		expect(buildScene(atMidnight).mission?.motif).toBe('sun-below');
	});
});

describe('the activity catalogue keys', () => {
	it('resolves every key the activity uses in both locales', () => {
		const keys = new Set<MessageKey>();

		for (const key of collectMessageKeys(activity)) keys.add(key);
		keys.add(placeName(LATITUDE_DEG));
		keys.add('pov.sunHeight');
		keys.add('activity.leave');

		for (const locale of LOCALES) {
			for (const key of keys) {
				const message = catalogues[locale][key];
				expect(message, `${locale}: ${key}`).toBeTruthy();
				expect(message.trim(), `${locale}: ${key}`).not.toBe('');
			}
		}
	});
});

/**
 * Every catalogue key reachable from the activity data. Ids contain no dot, so
 * a dotted string is a message key by construction in this schema.
 */
function collectMessageKeys(value: unknown, keys = new Set<MessageKey>()): MessageKey[] {
	if (typeof value === 'string') {
		if (value.includes('.')) keys.add(value as MessageKey);
		return [...keys];
	}
	if (Array.isArray(value)) {
		for (const entry of value) collectMessageKeys(entry, keys);
		return [...keys];
	}
	if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value)) collectMessageKeys(entry, keys);
	}
	return [...keys];
}

import { describe, expect, it } from 'vitest';
import { catalogues, type MessageKey } from '$lib/i18n/messages';
import { LOCALES } from '$lib/i18n/locale';
import { evaluateSuccess, shadowExcessAt, shadowGeometry } from '$lib/session';
import type { MissionScene } from './types';
import activity from './shadows.activity';

const MINUTE = 60_000;

const LATITUDE = activity.povs[0]!.latitudeDeg;

/** The part of the session state a mission predicate is allowed to read. */
function sceneAt(instant: number): MissionScene {
	return {
		instant,
		timeSpan: {
			fromInstant: activity.timeSpan.from,
			toInstant: activity.timeSpan.to
		},
		camera: activity.cameraPresets[0]!,
		observers: [
			{
				id: 'pov-1',
				bodyId: 'earth',
				latitudeDeg: LATITUDE,
				colour: '#ffffff'
			}
		],
		settings: {},
		trueDistance: false,
		trueSize: false,
		subsystem: [...activity.subsystem]
	};
}

/** Solar noon found by running the day, the same way the child does. */
function shortestShadowInstant(dayStart: number): number {
	let best = dayStart;
	let bestFactor = Number.POSITIVE_INFINITY;
	for (let instant = dayStart; instant < dayStart + 24 * 60 * MINUTE; instant += MINUTE) {
		const factor = shadowGeometry(LATITUDE, instant).shadowLengthFactor;
		if (factor < bestFactor) {
			bestFactor = factor;
			best = instant;
		}
	}
	return best;
}

describe('the shortest-shadow mission', () => {
	const mission = activity.missions[0]!;
	const dayStart = Date.UTC(2025, 2, 20);
	const noon = shortestShadowInstant(dayStart);

	function outcome(instant: number) {
		return evaluateSuccess(mission.success, sceneAt(instant));
	}

	it('accepts the shortest shadow as right', () => {
		expect(outcome(noon).state).toBe('right');
	});

	it('calls an attempt near noon close, not right', () => {
		expect(outcome(noon + 50 * MINUTE).state).toBe('close');
	});

	it('calls a shadow far from its shortest far', () => {
		expect(outcome(noon + 4 * 60 * MINUTE).state).toBe('far');
	});

	it('does not accept a night shadow, when there is none', () => {
		expect(outcome(dayStart).state).toBe('far');
	});

	it('is a continuous predicate, so the panel can say close', () => {
		expect(mission.success.kind).toBe('continuous');
	});
});

describe('the shadows activity', () => {
	it('is level 2, shows the Earth alone, and stages one POV', () => {
		expect(activity.level).toBe(2);
		expect(activity.subsystem).toEqual(['sun', 'earth']);
		expect(activity.povs).toHaveLength(1);
		expect(activity.povs[0]!.bodyId).toBe('earth');
	});

	it('opens with a year, so the guide can reach the annual evidence without a jump', () => {
		const days = (activity.timeSpan.to - activity.timeSpan.from) / (24 * 60 * MINUTE);
		expect(days).toBeGreaterThanOrEqual(365);
		expect(days).toBeLessThanOrEqual(366);
	});

	it('declares a ground-facing and a top-down camera preset', () => {
		const pitches = activity.cameraPresets.map((preset) => preset.pitch);
		expect(Math.min(...pitches)).toBeLessThan(0.2);
		expect(Math.max(...pitches)).toBeGreaterThan(1.2);
	});

	it('names every camera preset, setting, guide step and mission string a catalogue key', () => {
		const keys = collectMessageKeys(activity);
		expect(keys.length).toBeGreaterThan(8);

		for (const key of keys) {
			for (const locale of LOCALES) {
				const message = catalogues[locale][key as keyof typeof catalogues.en];
				expect(message, `${locale}: ${key}`).toBeTruthy();
				expect(message.trim(), `${locale}: ${key}`).not.toBe('');
			}
		}
	});

	it('has a golden guide that walks the day, then the year', () => {
		const steps = activity.guide.map((step) => ({
			narration: step.narration,
			camera: step.apply.camera ?? null,
			instant: step.apply.instant ?? null,
			waitForChild: step.waitForChild
		}));

		expect(steps).toEqual([
			{
				narration: 'activity.shadows.guide.watchTheStick',
				camera: 'ground',
				instant: Date.UTC(2025, 2, 20, 8, 0, 0),
				waitForChild: true
			},
			{
				narration: 'activity.shadows.guide.runTheDay',
				camera: null,
				instant: Date.UTC(2025, 2, 20, 16, 0, 0),
				waitForChild: true
			},
			{
				narration: 'activity.shadows.guide.aYear',
				camera: 'top',
				instant: Date.UTC(2025, 5, 21, 12, 0, 0),
				waitForChild: true
			},
			{
				narration: 'activity.shadows.guide.otherHalf',
				camera: null,
				instant: Date.UTC(2025, 11, 21, 12, 0, 0),
				waitForChild: true
			}
		]);

		const presetIds = new Set(activity.cameraPresets.map((preset) => preset.id));
		for (const step of activity.guide) {
			if (step.apply.camera !== undefined) {
				expect(presetIds.has(step.apply.camera)).toBe(true);
			}
			if (step.apply.instant !== undefined) {
				expect(step.apply.instant).toBeGreaterThanOrEqual(activity.timeSpan.from);
				expect(step.apply.instant).toBeLessThanOrEqual(activity.timeSpan.to);
			}
		}
	});

	it('exposes a mission that reads the scene, not a form', () => {
		const mission = activity.missions[0]!;
		expect(mission.success.kind).toBe('continuous');
		if (mission.success.kind !== 'continuous') throw new Error('expected a continuous success');
		// The measure is the shadow's relative excess, which the child recovers by
		// moving the timeline; no proposition names an answer to pick.
		const measure = mission.success.measure(sceneAt(Date.UTC(2025, 2, 20, 16)));
		expect(measure).toBeGreaterThan(0);
		expect(measure).toBeCloseTo(shadowExcessAt(LATITUDE, Date.UTC(2025, 2, 20, 16)), 10);
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

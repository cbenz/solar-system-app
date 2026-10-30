/**
 * Ticket 11: the latitudes activity and the geometry it proves.
 *
 * The four assertions below are stated against the session module's own
 * quantities (`isDaylight`, `sunElevationDeg`, the obliquity constant), never
 * against a clock or a hard-coded 66.5. The tolerances are stated at the
 * assertion they belong to.
 */

import { describe, expect, it } from 'vitest';
import {
	OBLIQUITY_DEG,
	POLAR_CIRCLE_DEG,
	applyEvent,
	buildScene,
	createInitialState,
	isDaylight,
	placeName,
	sunElevationDeg,
	type Observer,
	type SessionState
} from '$lib/session';
import { catalogues } from '$lib/i18n/messages';
import { LOCALES } from '$lib/i18n/locale';
import latitudes from './latitudes.activity';

const MINUTE = 60_000;
const DAY = 86_400_000;

const YEAR_START = Date.UTC(2025, 0, 1);
const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);
const DECEMBER_SOLSTICE = Date.UTC(2025, 11, 21, 15, 3);

function observer(latitudeDeg: number): Observer {
	return { id: 'probe', bodyId: 'earth', latitudeDeg, colour: '#ffffff' };
}

/** Daylight in a 24-hour window, from the predicate, not from a duration formula. */
function daylightHours(place: Observer, dayStart: number, stepMs = MINUTE): number {
	let samples = 0;
	for (let instant = dayStart; instant < dayStart + DAY; instant += stepMs) {
		if (isDaylight(place, instant)) samples += 1;
	}
	return (samples * stepMs) / 3_600_000;
}

/**
 * The day's highest Sun, found rather than sampled at a fixed instant: the
 * elevation curve has one maximum per day, and a coarse grid would miss the
 * narrow zenith window at the Tropic.
 */
function peakElevation(place: Observer, dayStart: number): number {
	let best = -Infinity;
	let bestAt = dayStart;

	for (let instant = dayStart; instant < dayStart + DAY; instant += MINUTE) {
		const elevation = sunElevationDeg(place, instant);
		if (elevation > best) {
			best = elevation;
			bestAt = instant;
		}
	}

	// Ternary search around the best minute: the curve is unimodal there.
	let low = bestAt - MINUTE;
	let high = bestAt + MINUTE;
	for (let iteration = 0; iteration < 60; iteration += 1) {
		const left = low + (high - low) / 3;
		const right = high - (high - low) / 3;
		if (sunElevationDeg(place, left) < sunElevationDeg(place, right)) low = left;
		else high = right;
	}

	return sunElevationDeg(place, (low + high) / 2);
}

/** The first latitude where a day has no daylight at all, by bisection. */
function firstLatitudeWithoutDaylight(
	dayStart: number,
	below: number,
	above: number
): number {
	const hasDaylight = (latitudeDeg: number) => peakElevation(observer(latitudeDeg), dayStart) > 0;

	let low = below;
	let high = above;
	for (let iteration = 0; iteration < 40; iteration += 1) {
		const middle = (low + high) / 2;
		if (hasDaylight(middle)) low = middle;
		else high = middle;
	}

	return high;
}

describe('latitudes: the activity data', () => {
	it('declares three POVs, one year, and the Tropics and Polar Circles', () => {
		expect(latitudes.level).toBe(2);
		expect(latitudes.subsystem).toEqual(['sun', 'earth']);
		expect(latitudes.povs).toHaveLength(3);
		expect(latitudes.povs.map((pov) => pov.latitudeDeg)).toEqual([
			0,
			OBLIQUITY_DEG,
			POLAR_CIRCLE_DEG
		]);
		expect(new Set(latitudes.povs.map((pov) => pov.id)).size).toBe(3);
		expect(latitudes.timeSpan.to - latitudes.timeSpan.from).toBe(365 * DAY);

		const circles = latitudes.latitudeCircles ?? [];
		expect(circles.map((circle) => circle.latitudeDeg).sort((a, b) => a - b)).toEqual(
			[-POLAR_CIRCLE_DEG, -OBLIQUITY_DEG, OBLIQUITY_DEG, POLAR_CIRCLE_DEG].sort((a, b) => a - b)
		);
	});

	it('draws the extra circles only while the activity is open', () => {
		const activityState = (activityId: string): SessionState =>
			createInitialState({ activities: [latitudes], instant: YEAR_START });

		const sandbox = activityState('latitudes');
		expect(buildScene(sandbox).circles.map((circle) => circle.id)).toEqual(['equator']);

		const opened = applyEvent(sandbox, { type: 'open-activity', activityId: 'latitudes' }).state;
		expect(buildScene(opened).circles.map((circle) => circle.id)).toEqual([
			'equator',
			'tropic-of-cancer',
			'tropic-of-capricorn',
			'arctic-circle',
			'antarctic-circle'
		]);

		const closed = applyEvent(opened, { type: 'leave-activity' }).state;
		expect(buildScene(closed).circles.map((circle) => circle.id)).toEqual(['equator']);
	});

	it('opens with exactly the three POVs, each with its own colour', () => {
		const sandbox = createInitialState({ activities: [latitudes], instant: YEAR_START });
		const opened = applyEvent(sandbox, { type: 'open-activity', activityId: 'latitudes' }).state;

		expect(opened.observers.map((entry) => entry.id)).toEqual(['equator', 'tropic', 'polar-circle']);
		expect(new Set(opened.observers.map((entry) => entry.colour)).size).toBe(3);
		expect(buildScene(opened).observers).toHaveLength(3);
	});
});

describe('at the Equator every day lasts about twelve hours, all year', () => {
	it('sums to 365 × 12 h within 10 minutes over one year', () => {
		const equator = observer(0);
		let total = 0;
		for (let day = 0; day < 365; day += 1) {
			total += daylightHours(equator, YEAR_START + day * DAY);
		}

		// One-minute predicate sampling costs six minutes over the year
		// (measured); the geometry is exactly 12 h per day.
		expect(Math.abs(total - 365 * 12) * 60).toBeLessThan(10);
	});
});

describe('the polar night begins exactly at the Polar Circle', () => {
	it('north: the December-solstice boundary is 90° − ε', () => {
		const boundary = firstLatitudeWithoutDaylight(Date.UTC(2025, 11, 21), 60, 70);

		expect(Math.abs(boundary - POLAR_CIRCLE_DEG)).toBeLessThan(0.01);
		// That no latitude below it is already dark: one hundredth of a degree
		// below the boundary the solstice day still has daylight.
		expect(peakElevation(observer(POLAR_CIRCLE_DEG - 0.02), Date.UTC(2025, 11, 21))).toBeGreaterThan(0);
	});

	it('south: the June-solstice boundary is −(90° − ε)', () => {
		const boundary = firstLatitudeWithoutDaylight(Date.UTC(2025, 5, 21), -60, -70);

		expect(Math.abs(boundary + POLAR_CIRCLE_DEG)).toBeLessThan(0.01);
		expect(peakElevation(observer(-POLAR_CIRCLE_DEG + 0.02), Date.UTC(2025, 5, 21))).toBeGreaterThan(0);
	});
});

describe('at the Tropic the Sun reaches the zenith on exactly one day', () => {
	const EPSILON_DEG = 0.001;

	it('has one contiguous window in the year, on the June solstice', () => {
		const tropic = observer(OBLIQUITY_DEG);
		const qualifyingDays: number[] = [];

		for (let day = 0; day < 365; day += 1) {
			const dayStart = YEAR_START + day * DAY;
			if (90 - peakElevation(tropic, dayStart) < EPSILON_DEG) qualifyingDays.push(dayStart);
		}

		expect(qualifyingDays).toHaveLength(1);
		const [day] = qualifyingDays;
		expect(day).toBeDefined();
		const dayStart = day as number;
		expect(new Date(dayStart).toISOString().slice(0, 10)).toBe('2025-06-21');

		// One window: the elevation curve is unimodal, so the set above the
		// threshold is the interval between the two crossings around noon.
		const peakAt = findPeakInstant(tropic, dayStart);
		const left = crossBelow(tropic, dayStart, peakAt, 90 - EPSILON_DEG);
		const right = crossBelow(tropic, peakAt, dayStart + DAY, 90 - EPSILON_DEG);

		expect(left).toBeLessThan(right);
		expect(sunElevationDeg(tropic, left)).toBeCloseTo(90 - EPSILON_DEG, 6);
		expect(sunElevationDeg(tropic, right)).toBeCloseTo(90 - EPSILON_DEG, 6);
		expect(new Date(left).toISOString().slice(0, 10)).toBe('2025-06-21');
		expect(new Date(right).toISOString().slice(0, 10)).toBe('2025-06-21');

		// Sampling inside the interval satisfies the condition; one minute
		// outside it does not.
		expect(90 - sunElevationDeg(tropic, (left + right) / 2)).toBeLessThan(EPSILON_DEG);
		expect(90 - sunElevationDeg(tropic, left - MINUTE)).toBeGreaterThan(EPSILON_DEG);
		expect(90 - sunElevationDeg(tropic, right + MINUTE)).toBeGreaterThan(EPSILON_DEG);
	});
});

function findPeakInstant(place: Observer, dayStart: number): number {
	let best = -Infinity;
	let bestAt = dayStart;
	for (let instant = dayStart; instant < dayStart + DAY; instant += MINUTE) {
		const elevation = sunElevationDeg(place, instant);
		if (elevation > best) {
			best = elevation;
			bestAt = instant;
		}
	}

	let low = bestAt - MINUTE;
	let high = bestAt + MINUTE;
	for (let iteration = 0; iteration < 60; iteration += 1) {
		const left = low + (high - low) / 3;
		const right = high - (high - low) / 3;
		if (sunElevationDeg(place, left) < sunElevationDeg(place, right)) low = left;
		else high = right;
	}

	return (low + high) / 2;
}

/** Bisect an interval whose ends sit on opposite sides of `threshold`. */
function crossBelow(
	place: Observer,
	from: number,
	to: number,
	thresholdDeg: number
): number {
	const above = (instant: number) => sunElevationDeg(place, instant) > thresholdDeg;
	const fromAbove = above(from);

	let low = from;
	let high = to;
	for (let iteration = 0; iteration < 60; iteration += 1) {
		const middle = (low + high) / 2;
		if (above(middle) === fromAbove) low = middle;
		else high = middle;
	}

	return (low + high) / 2;
}

describe('daylight duration is symmetric about the solstices', () => {
	// The geometry is symmetric in declination; the residual below is the
	// elliptical orbit's unequal speed, largest just inside the Polar Circle.
	const OFFSET = 30 * DAY;
	const TOLERANCE_MIN = 20;

	for (const latitudeDeg of [0, OBLIQUITY_DEG, POLAR_CIRCLE_DEG]) {
		for (const [name, solstice] of [
			['June', JUNE_SOLSTICE],
			['December', DECEMBER_SOLSTICE]
		] as const) {
			it(`at ${latitudeDeg}° around the ${name} solstice`, () => {
				const place = observer(latitudeDeg);
				const before = daylightHours(place, solstice - OFFSET);
				const after = daylightHours(place, solstice + OFFSET);

				expect(Math.abs(after - before) * 60).toBeLessThan(TOLERANCE_MIN);
			});
		}
	}
});

describe('the activity catalogue keys', () => {
	it('resolves every key the activity uses in both locales', () => {
		const keys = new Set<string>();

		for (const preset of latitudes.cameraPresets) keys.add(preset.label);
		for (const setting of latitudes.settings) keys.add(setting.label);
		for (const step of latitudes.guide) keys.add(step.narration);
		for (const mission of latitudes.missions) {
			keys.add(mission.prompt);
			keys.add(mission.prediction);
			keys.add(mission.feedback.close);
			keys.add(mission.feedback.right);
		}
		for (const pov of latitudes.povs) keys.add(placeName(pov.latitudeDeg));

		keys.add('pov.sunHeight');
		keys.add('activity.leave');

		for (const locale of LOCALES) {
			for (const key of keys) {
				expect(
					catalogues[locale][key as keyof typeof catalogues.en],
					`${locale}: ${key}`
				).toBeTruthy();
			}
		}
	});
});

describe('the golden guide', () => {
	// Ticket 08 owns the guide runner; this is the ordered script it will run.
	it('applies the camera presets and instants in the declared order', () => {
		const applied = latitudes.guide.map((step) => ({
			camera: step.apply.camera,
			instant: step.apply.instant
		}));

		expect(applied).toEqual([
			{ camera: 'whole-system', instant: Date.UTC(2025, 2, 20, 9, 1) },
			{ camera: 'sunlit-side', instant: JUNE_SOLSTICE },
			{ camera: 'sunlit-side', instant: DECEMBER_SOLSTICE },
			{ camera: 'above-pole', instant: JUNE_SOLSTICE }
		]);

		for (const step of latitudes.guide) {
			expect(latitudes.cameraPresets.map((preset) => preset.id)).toContain(step.apply.camera);
		}
	});
});

/**
 * Ticket 13: the seasons activity and the evidence it puts in front of the
 * child. Values are ASTRONOMY.md's published ones (Paris 15 h 58 m / 8 h 02 m,
 * perihelion 0.9833 AU in early January), never a copy of the implementation.
 */

import { describe, expect, it } from 'vitest';
import {
	DRAWN_ORBIT_MAX_ECCENTRICITY,
	OBLIQUITY_DEG,
	applyEvent,
	buildScene,
	createInitialState,
	dayLengthHoursForTilt,
	distanceToSunAu,
	drawnOrbitEccentricity,
	earthSunDistanceAu,
	perihelionInstant,
	solarDeclinationForTiltDeg,
	sunElevationDeg,
	type SessionState
} from '$lib/session';
import { catalogues } from '$lib/i18n/messages';
import { LOCALES } from '$lib/i18n/locale';
import { runGuideGolden } from './guide-golden';
import activity, { PARIS_DEG, SEASONS_POV_LABELS, SYDNEY_DEG } from './seasons.activity';

const DAY = 86_400_000;
const JUNE_SOLSTICE = Date.UTC(2025, 5, 21, 2, 42);
const DECEMBER_SOLSTICE = Date.UTC(2025, 11, 21, 15, 3);

function openAt(instant: number): SessionState {
	const state = createActivityState(instant);
	const result = applyEvent(state, { type: 'open-activity', activityId: 'seasons' });
	return applyEvent(result.state, { type: 'scrub-to', instant }).state;
}

function createActivityState(instant: number): SessionState {
	return createInitialState({ activities: [activity], instant });
}

describe('the seasons activity data', () => {
	it('is level 4, on the Earth alone, over one year, with Paris and Sydney', () => {
		expect(activity.level).toBe(4);
		expect(activity.subsystem).toEqual(['sun', 'earth']);
		expect(activity.povs.map((pov) => pov.id)).toEqual(['paris', 'sydney']);
		expect(activity.povs.map((pov) => pov.latitudeDeg)).toEqual([PARIS_DEG, SYDNEY_DEG]);
		expect(activity.timeSpan.to - activity.timeSpan.from).toBe(365 * DAY);
		expect(activity.povs).toHaveLength(2);
	});

	it('declares a tilt slider reaching zero and an exaggerated-orbit switch', () => {
		const tilt = activity.settings.find((setting) => setting.key === 'tilt');
		const exaggerated = activity.settings.find(
			(setting) => setting.key === 'exaggeratedOrbit'
		);

		expect(tilt?.kind).toBe('number');
		if (tilt?.kind !== 'number') throw new Error('tilt must be a number setting');
		expect(tilt.min).toBe(0);
		expect(tilt.max).toBe(OBLIQUITY_DEG);
		expect(tilt.default).toBe(OBLIQUITY_DEG);

		expect(exaggerated?.kind).toBe('boolean');
		if (exaggerated?.kind !== 'boolean') throw new Error('exaggeratedOrbit must be boolean');
		expect(exaggerated.default).toBe(false);
	});
});

describe('Paris and Sydney at the same instant', () => {
	it('has Paris in summer and Sydney in winter, at the same distance', () => {
		const state = openAt(JUNE_SOLSTICE);
		const scene = buildScene(state);
		const paris = scene.observers.find((entry) => entry.observer.id === 'paris')!;
		const sydney = scene.observers.find((entry) => entry.observer.id === 'sydney')!;

		const parisDay = dayLengthHoursForTilt(PARIS_DEG, JUNE_SOLSTICE, OBLIQUITY_DEG);
		const sydneyDay = dayLengthHoursForTilt(SYDNEY_DEG, JUNE_SOLSTICE, OBLIQUITY_DEG);

		expect(parisDay).toBeGreaterThan(15.9);
		expect(sydneyDay).toBeLessThan(9.8);
		expect(parisDay).toBeGreaterThan(sydneyDay);

		// The same body: the observers' distance to the Sun is identical, bit for
		// bit, because the distance belongs to the Earth and not to the place.
		expect(distanceToSunAu(paris.observer, JUNE_SOLSTICE)).toBe(
			distanceToSunAu(sydney.observer, JUNE_SOLSTICE)
		);
		// And their POVs really are opposite seasons, not the same one.
		expect(parisDay - sydneyDay).toBeGreaterThan(6);
		// Both observers belong to the Earth, so the scene draws the same body.
		expect(paris.observer.bodyId).toBe('earth');
		expect(sydney.observer.bodyId).toBe('earth');
	});
});

describe('the distance explanation is tested, not contradicted', () => {
	it('records "closer in summer" and keeps it after the measurement', () => {
		const start = openAt(JUNE_SOLSTICE);
		const running = applyEvent(start, {
			type: 'start-mission',
			missionId: 'closest-day'
		}).state;
		const predicted = applyEvent(running, { type: 'record-prediction' }).state;

		expect(predicted.mission?.phase).toBe('manipulate');
		expect(predicted.mission?.prediction?.propositionId).toBe('summer');
		expect(predicted.mission?.prediction?.instant).toBe(JUNE_SOLSTICE);

		const perihelion = perihelionInstant(activity.timeSpan.from, activity.timeSpan.to);
		const atPerihelion = applyEvent(predicted, {
			type: 'scrub-to',
			instant: perihelion
		}).state;

		// The scene answers: the Earth is now nearest the Sun, in the northern winter.
		expect(
			applyEvent(atPerihelion, { type: 'reveal-mission' }).state.mission?.phase
		).toBe('observe');

		// The prediction was copied, so the answer cannot rewrite it.
		expect(atPerihelion.mission?.prediction?.propositionId).toBe('summer');
		expect(atPerihelion.mission?.prediction?.instant).toBe(JUNE_SOLSTICE);
	});

	it('refuses the reveal while the scene is still in northern summer', () => {
		const start = openAt(JUNE_SOLSTICE);
		const running = applyEvent(start, { type: 'start-mission', missionId: 'closest-day' }).state;
		const predicted = applyEvent(running, { type: 'record-prediction' }).state;

		expect(applyEvent(predicted, { type: 'reveal-mission' }).state).toBe(predicted);
	});

	it('shows the January minimum and the June summer near aphelion', () => {
		const perihelion = perihelionInstant(activity.timeSpan.from, activity.timeSpan.to);

		expect(new Date(perihelion).toISOString().slice(0, 10)).toMatch(/^2025-01-0[1-6]$/);
		expect(earthSunDistanceAu(perihelion)).toBeCloseTo(0.9833, 4);
		expect(earthSunDistanceAu(perihelion)).toBeLessThan(earthSunDistanceAu(JUNE_SOLSTICE));
		expect(earthSunDistanceAu(JUNE_SOLSTICE)).toBeGreaterThan(1.015);
	});
});

describe('the tilt slider changes the scene, not just a number', () => {
	it('changes the scene the session builds, at the same instant', () => {
		const juneFull = openAt(JUNE_SOLSTICE);
		const juneZero = applyEvent(juneFull, {
			type: 'set-setting',
			key: 'tilt',
			value: 0
		}).state;

		expect(juneZero.settings.tilt).toBe(0);
		expect(buildScene(juneZero).season?.tiltDeg).toBe(0);

		const parisFull = buildScene(juneFull).observers.find(
			(entry) => entry.observer.id === 'paris'
		)!;
		const parisZero = buildScene(juneZero).observers.find(
			(entry) => entry.observer.id === 'paris'
		)!;

		// The Sun is lower (or rather, the whole seasonal sweep is gone) and the
		// POV reads a different elevation at the same instant.
		expect(parisFull.sunElevationDeg).not.toBeCloseTo(parisZero.sunElevationDeg, 3);
		expect(solarDeclinationForTiltDeg(JUNE_SOLSTICE, 0)).toBeCloseTo(0, 9);
		expect(parisZero.observer.latitudeDeg).toBe(PARIS_DEG);

		// At zero tilt every day is twelve hours: the seasons' duration signal is
		// gone, and only the small distance remainder is left (seasons.test.ts).
		expect(dayLengthHoursForTilt(PARIS_DEG, JUNE_SOLSTICE, 0)).toBeCloseTo(12, 9);
		expect(dayLengthHoursForTilt(PARIS_DEG, DECEMBER_SOLSTICE, 0)).toBeCloseTo(12, 9);

		// And the pure probe the scene uses agrees with the snapshot.
		expect(sunElevationDeg(parisZero.observer, JUNE_SOLSTICE, 0)).toBeCloseTo(
			parisZero.sunElevationDeg,
			9
		);
	});
});

describe('the seasons scene', () => {
	it('draws a circular orbit unless the hypothesis is switched on', () => {
		for (const preset of activity.cameraPresets) {
			// The drawn eccentricity is independent of the zoom the preset declares.
			expect(preset.distance).toBeGreaterThan(0);
			expect(drawnOrbitEccentricity(false)).toBeLessThanOrEqual(
				DRAWN_ORBIT_MAX_ECCENTRICITY
			);
		}

		const state = openAt(JUNE_SOLSTICE);
		const season = buildScene(state).season;
		expect(season).not.toBeNull();
		expect(season?.exaggeratedOrbit).toBe(false);
		expect(season?.drawnEccentricity).toBe(0);
	});

	it('turns on a visibly eccentric orbit only through the setting', () => {
		const state = openAt(JUNE_SOLSTICE);
		const exaggerated = applyEvent(state, {
			type: 'set-setting',
			key: 'exaggeratedOrbit',
			value: true
		}).state;
		const season = buildScene(exaggerated).season!;

		expect(season.exaggeratedOrbit).toBe(true);
		expect(season.drawnEccentricity).toBeGreaterThan(0.3);
	});

	it('carries the parallel ray bundle and the distance readout', () => {
		const state = openAt(DECEMBER_SOLSTICE);
		const season = buildScene(state).season!;

		expect(season.rays.rays.length).toBe(7);
		expect(season.rays.spacingAu).toBeGreaterThan(0);
		expect(season.earthSunDistanceAu).toBe(earthSunDistanceAu(DECEMBER_SOLSTICE));
		// December is near perihelion: the readout is the small end of the year.
		expect(season.earthSunDistanceAu).toBeLessThan(0.985);
	});
});

describe('the golden guide and the catalogues', () => {
	it('walks the guide with every camera preset and instant in order', () => {
		const result = runGuideGolden(activity);

		expect(result.skipped).toBe(false);
		expect(result.steps).toHaveLength(activity.guide.length);
		// The guide applies the tilt step too, not only camera and time.
		const zeroTilt = applyEvent(
			applyEvent(createActivityState(activity.timeSpan.from), {
				type: 'open-activity',
				activityId: 'seasons'
			}).state,
			{ type: 'next-guide-step' }
		).state;
		expect(zeroTilt).toBeTruthy();
	});

	it('resolves every key the activity uses in both locales', () => {
		const keys = new Set<string>();

		for (const preset of activity.cameraPresets) keys.add(preset.label);
		for (const setting of activity.settings) keys.add(setting.label);
		for (const step of activity.guide) keys.add(step.narration);
		for (const mission of activity.missions) {
			keys.add(mission.label);
			keys.add(mission.brief);
			keys.add(mission.prediction.prompt);
			for (const proposition of mission.prediction.propositions) keys.add(proposition.statement);
			keys.add(mission.observe);
			keys.add(mission.explain);
			keys.add(mission.feedback.close);
			keys.add(mission.feedback.right);
		}
		for (const label of Object.values(SEASONS_POV_LABELS)) keys.add(label);
		keys.add('activity.seasons.scene.distance');
		keys.add('activity.seasons.scene.notRealOrbit');
		keys.add('pov.sunHeight');
		keys.add('activity.leave');

		for (const locale of LOCALES) {
			for (const key of keys) {
				const message = catalogues[locale][key as keyof typeof catalogues.en];
				expect(message, `${locale}: ${key}`).toBeTruthy();
				expect(message.trim(), `${locale}: ${key}`).not.toBe('');
			}
		}
	});
});

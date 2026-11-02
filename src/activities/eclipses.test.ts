import { describe, expect, it } from 'vitest';
import { catalogues, type MessageKey } from '$lib/i18n/messages';
import { LOCALES } from '$lib/i18n/locale';
import {
	MOON_INCLINATION_DEG,
	MOON_ORBIT_SETTING_KEY,
	applyEvent,
	createInitialState,
	evaluateSuccess,
	moonGeocentricPositionAu,
	moonOrbitPathAu,
	solarEclipse,
	sunGeocentricPositionAu,
	type SessionState
} from '$lib/session';
import { runGuideGolden } from './guide-golden';
import activity from './eclipses';

const HOUR = 3600_000;

/** The staged 2024-04-08 eclipse instant (the model's umbra over east Texas). */
const SOLAR = Date.UTC(2024, 3, 8, 18, 20);
/** A new moon far from the node: no eclipse anywhere. */
const FAILED_NEW_MOON = Date.UTC(2024, 5, 6, 12, 38);
/** Published greatest eclipse of the 2025-03-14 total lunar eclipse. */
const LUNAR = Date.UTC(2025, 2, 14, 6, 59);

function openActivity(): SessionState {
	const initial = createInitialState({ activities: [activity] });
	return applyEvent(initial, { type: 'open-activity', activityId: 'eclipses' }).state;
}

function at(instant: number, settings: Record<string, number | boolean> = {}): SessionState {
	let state = applyEvent(openActivity(), { type: 'scrub-to', instant }).state;
	for (const [key, value] of Object.entries(settings)) {
		state = applyEvent(state, { type: 'set-setting', key, value }).state;
	}
	return state;
}

describe('the eclipses activity', () => {
	it('is level 5, shows the Earth and the Moon, and stages three POVs', () => {
		expect(activity.level).toBe(5);
		expect(activity.subsystem).toEqual(['sun', 'earth', 'moon']);
		expect(activity.povs).toHaveLength(3);
		for (const pov of activity.povs) expect(pov.bodyId).toBe('earth');
	});

	it('declares a longitude for each POV, because latitude alone is Greenwich', () => {
		const longitudes = activity.povs.map((pov) => pov.longitudeDeg);
		expect(longitudes.every((value) => typeof value === 'number')).toBe(true);
		expect(new Set(longitudes).size).toBe(3);
	});

	it('opens on a span that holds both staged eclipses, and scrubs months', () => {
		const days = (activity.timeSpan.to - activity.timeSpan.from) / (24 * HOUR);
		expect(days).toBeGreaterThanOrEqual(365);
		expect(days).toBeLessThanOrEqual(460);
		expect(activity.timeSpan.from).toBeLessThanOrEqual(SOLAR);
		expect(activity.timeSpan.to).toBeGreaterThanOrEqual(LUNAR);
	});

	it('offers a camera preset from above the ecliptic, where the tilt shows', () => {
		const steepest = Math.max(...activity.cameraPresets.map((preset) => preset.pitch));
		expect(steepest).toBeGreaterThan(1);

		// And one close along the line of sight, where the alignment shows.
		const closest = Math.min(...activity.cameraPresets.map((preset) => preset.distance));
		expect(closest).toBeLessThan(2.6);
	});

	it('draws the Moon’s orbit and the ecliptic plane it is inclined to', () => {
		const kinds = (activity.orbitPaths ?? []).map((path) => path.kind);
		expect(kinds).toContain('moon-orbit');
		expect(kinds).toContain('ecliptic');

		const scene = applyEvent(at(SOLAR), { type: 'scrub-to', instant: SOLAR }).scene;
		expect(scene.orbits.map((orbit) => orbit.kind)).toContain('moon-orbit');
	});

	it('outside the activity draws no orbit ring', () => {
		const state = createInitialState({ activities: [activity] });
		const scene = applyEvent(state, { type: 'scrub-to', instant: state.instant }).scene;
		expect(scene.orbits).toEqual([]);
	});
});

describe('three POVs at one instant', () => {
	const state = at(SOLAR);
	const { scene } = applyEvent(state, { type: 'scrub-to', instant: SOLAR });

	it('puts one observer in the umbra, one in the penumbra, one in plain light', () => {
		const kinds = scene.observers.map((entry) => entry.eclipse.kind);
		expect(kinds).toEqual(['total', 'partial', 'none']);
	});

	it('darkens the POV by what it sees: totality darkest, sunlight untouched', () => {
		const [umbra, penumbra, sunlight] = scene.observers;
		expect(umbra!.eclipse.darkening).toBe(1);
		expect(penumbra!.eclipse.darkening).toBeGreaterThan(0);
		expect(penumbra!.eclipse.darkening).toBeLessThan(1);
		expect(sunlight!.eclipse.darkening).toBe(0);
	});

	it('has the Sun above the horizon for all three, or the panels would be dark', () => {
		for (const entry of scene.observers) {
			expect(entry.sunElevationDeg, entry.observer.id).toBeGreaterThan(10);
		}
	});

	it('agrees with the predicate on the same instants', () => {
		const moon = moonGeocentricPositionAu(SOLAR);
		for (const entry of scene.observers) {
			const eclipse = solarEclipse(entry.observer, SOLAR, moon);
			expect(entry.eclipse.kind).toBe(eclipse.kind);
			expect(entry.eclipse.darkening).toBeCloseTo(eclipse.view.darkening, 12);
		}
	});

	it('shows nothing at a new moon far from the node', () => {
		const failed = applyEvent(at(FAILED_NEW_MOON), { type: 'scrub-to', instant: FAILED_NEW_MOON })
			.scene;
		for (const entry of failed.observers) expect(entry.eclipse.kind).toBe('none');
	});
});

describe('placing the Moon on its orbit', () => {
	it('moves the Moon along the drawn ring without changing its radius', () => {
		const rest = at(SOLAR);
		const placed = at(SOLAR, { [MOON_ORBIT_SETTING_KEY]: 40 });

		const restMoon = applyEvent(rest, { type: 'scrub-to', instant: SOLAR }).scene.bodies.find(
			(body) => body.id === 'moon'
		)!;
		const placedMoon = applyEvent(placed, { type: 'scrub-to', instant: SOLAR }).scene.bodies.find(
			(body) => body.id === 'moon'
		)!;

		expect(placedMoon.position).not.toEqual(restMoon.position);

		// The distance from the Earth is unchanged: a slide, not a shove.
		const earth = { x: -0.942, y: -0.332 };
		expect(
			Math.hypot(placedMoon.position.x - earth.x, placedMoon.position.y - earth.y)
		).toBeCloseTo(Math.hypot(restMoon.position.x - earth.x, restMoon.position.y - earth.y), 1);
	});

	it('lets the child lose the eclipse, and find it again', () => {
		const lost = applyEvent(at(SOLAR, { [MOON_ORBIT_SETTING_KEY]: 60 }), {
			type: 'scrub-to',
			instant: SOLAR
		}).scene;
		expect(lost.observers[0]!.eclipse.kind).toBe('none');

		const found = applyEvent(at(SOLAR, { [MOON_ORBIT_SETTING_KEY]: 0 }), {
			type: 'scrub-to',
			instant: SOLAR
		}).scene;
		expect(found.observers[0]!.eclipse.kind).toBe('total');
	});

	it('is a declared setting, so only this activity can move the Moon', () => {
		const key = activity.settings.find((setting) => setting.key === MOON_ORBIT_SETTING_KEY);
		expect(key?.kind).toBe('number');
		expect(activity.settings).toHaveLength(1);

		// A closed activity has no such setting: the event is refused.
		const closed = createInitialState({ activities: [activity] });
		const after = applyEvent(closed, {
			type: 'set-setting',
			key: MOON_ORBIT_SETTING_KEY,
			value: 40
		});
		expect(after.state).toBe(closed);
	});
});

describe('the Moon’s orbit is drawn, and it is inclined', () => {
	it('reads 5.145° off the drawn ring itself', () => {
		const points = moonOrbitPathAu(SOLAR);
		const a = points[0]!;
		const b = points[Math.floor(points.length / 4)]!;
		const c = points[Math.floor(points.length / 2)]!;

		const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
		const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
		const normal = {
			x: u.y * v.z - u.z * v.y,
			y: u.z * v.x - u.x * v.z,
			z: u.x * v.y - u.y * v.x
		};
		const norm = Math.hypot(normal.x, normal.y, normal.z);
		const inclination = (Math.acos(Math.abs(normal.z / norm)) * 180) / Math.PI;

		expect(inclination).toBeCloseTo(MOON_INCLINATION_DEG, 3);
		expect(inclination).toBeGreaterThan(5.1);
		expect(inclination).toBeLessThan(5.2);
	});

	it('draws the ring and the ecliptic reference flat ring at one radius', () => {
		const scene = applyEvent(at(SOLAR), { type: 'scrub-to', instant: SOLAR }).scene;
		const moonOrbit = scene.orbits.find((orbit) => orbit.kind === 'moon-orbit')!;
		const ecliptic = scene.orbits.find((orbit) => orbit.kind === 'ecliptic')!;

		const radius = (points: typeof moonOrbit.points) =>
			Math.hypot(points[0]!.x, points[0]!.y, points[0]!.z);

		expect(radius(ecliptic.points)).toBeCloseTo(radius(moonOrbit.points), 12);
		expect(ecliptic.points.every((point) => point.z === 0)).toBe(true);
		expect(moonOrbit.points.some((point) => Math.abs(point.z) > 0)).toBe(true);
		// Both rings are drawn at the Moon's readable separation (`distortion.ts`).
		expect(moonOrbit.distanceFactor).toBeGreaterThan(1);
		expect(ecliptic.distanceFactor).toBe(moonOrbit.distanceFactor);
	});
});

describe('a lunar eclipse, the same three observers', () => {
	/** The four staged moments of the 2025-03-14 eclipse. */
	const moments = [
		{ instant: Date.UTC(2025, 2, 14, 3, 0), kind: 'none' },
		{ instant: Date.UTC(2025, 2, 14, 5, 30), kind: 'penumbral' },
		{ instant: Date.UTC(2025, 2, 14, 6, 40), kind: 'partial' },
		{ instant: LUNAR, kind: 'total' }
	] as const;

	it('gives every night-side observer the same eclipse, because it is a shadow', () => {
		for (const moment of moments) {
			const scene = applyEvent(at(moment.instant), {
				type: 'scrub-to',
				instant: moment.instant
			}).scene;

			for (const entry of scene.observers) {
				expect(entry.moon, entry.observer.id).not.toBeNull();
				// The Moon is up for all three, so all three can see it.
				expect(entry.moon!.altitudeDeg, entry.observer.id).toBeGreaterThan(0);
				expect(entry.moon!.eclipse?.kind, entry.observer.id).toBe(moment.kind);
			}

			const darkenings = scene.observers.map((entry) => entry.moon!.eclipse!.darkening);
			expect(new Set(darkenings).size, 'one shadow, one darkening').toBe(1);
		}
	});

	it('darkens the Moon monotonically as it enters the umbra', () => {
		const darkenings = moments.map(
			(moment) =>
				applyEvent(at(moment.instant), { type: 'scrub-to', instant: moment.instant }).scene
					.observers[0]!.moon!.eclipse!.darkening
		);

		expect(darkenings[0]).toBe(0);
		for (let index = 1; index < darkenings.length; index += 1) {
			expect(darkenings[index]!).toBeGreaterThan(darkenings[index - 1]!);
		}
		expect(darkenings[3]).toBe(1);
	});

	it('shows the Earth’s umbra on the Moon with the published radii', () => {
		const scene = applyEvent(at(LUNAR), { type: 'scrub-to', instant: LUNAR }).scene;
		const moon = scene.observers[0]!.moon!;
		expect(moon.eclipse?.kind).toBe('total');
		// ASTRONOMY.md §5.1: the umbra is ~41′ at the Moon's mean distance.
		expect(moon.angularDiameterDeg).toBeGreaterThan(0.45);
		expect(moon.angularDiameterDeg).toBeLessThan(0.56);
	});
});

describe('scrubbing months: most alignments fail', () => {
	const sunLongitude = (instant: number) => {
		const sun = sunGeocentricPositionAu(instant);
		return (Math.atan2(sun.y, sun.x) * 180) / Math.PI;
	};
	const moonLongitude = (instant: number) => {
		const moon = moonGeocentricPositionAu(instant);
		return (Math.atan2(moon.y, moon.x) * 180) / Math.PI;
	};
	const longitudeGap = (instant: number) =>
		((moonLongitude(instant) - sunLongitude(instant) + 540) % 360) - 180;

	/** Does the eclipse happen anywhere on the day side of the Earth? */
	const anywhereEclipse = (instant: number): boolean => {
		const moon = moonGeocentricPositionAu(instant);
		for (let latitudeDeg = -85; latitudeDeg <= 85; latitudeDeg += 5) {
			for (let longitudeDeg = -180; longitudeDeg < 180; longitudeDeg += 5) {
				const observer = {
					id: 'grid',
					bodyId: 'earth' as const,
					latitudeDeg,
					longitudeDeg,
					colour: '#ffffff'
				};
				if (solarEclipse(observer, instant, moon).kind !== 'none') return true;
			}
		}
		return false;
	};

	/** Contiguous runs of hourly instants, in order: one run per event. */
	const runStarts = (instants: readonly number[]): number[] => {
		const starts: number[] = [];
		let previous: number | null = null;
		for (const instant of instants) {
			if (previous === null || instant - previous > 1.5 * HOUR) starts.push(instant);
			previous = instant;
		}
		return starts;
	};

	/**
	 * Hour by hour through calendar 2024. An **alignment** is the Moon passing the
	 * Sun's ecliptic longitude (a new moon, within one degree); an **eclipse** is
	 * one of those hours at which some observer on the day side actually sees
	 * overlapping discs.
	 *
	 * Measured: 13 new moons, 2 solar eclipses (2024-04-08 and 2024-10-02), 50
	 * aligned hours and 8 eclipse hours. The assertions allow for the model's
	 * 0.1° Moon and still fail on a real mistake.
	 */
	function sweep(): {
		newMoons: number;
		alignedHours: number;
		eclipseHours: number;
		eclipses: number[];
	} {
		const start = Date.UTC(2024, 0, 1);
		const end = Date.UTC(2025, 0, 1);
		const aligned: number[] = [];
		const eclipsed: number[] = [];

		for (let instant = start; instant < end; instant += HOUR) {
			if (Math.abs(longitudeGap(instant)) > 1) continue;
			aligned.push(instant);
			if (anywhereEclipse(instant)) eclipsed.push(instant);
		}

		return {
			newMoons: runStarts(aligned).length,
			alignedHours: aligned.length,
			eclipseHours: eclipsed.length,
			eclipses: runStarts(eclipsed)
		};
	}

	it('finds many alignments and few eclipses over twelve months', () => {
		const counts = sweep();

		expect(counts.newMoons).toBeGreaterThanOrEqual(12);
		expect(counts.newMoons).toBeLessThanOrEqual(14);
		expect(counts.eclipseHours).toBeGreaterThan(0);
		expect(counts.newMoons).toBeGreaterThanOrEqual(4 * counts.eclipses.length);
		expect(counts.alignedHours).toBeGreaterThanOrEqual(4 * counts.eclipseHours);
	}, 30_000);

	it('finds at most two eclipse seasons, months apart', () => {
		const counts = sweep();
		expect(counts.eclipses).toHaveLength(2);

		const [first, second] = counts.eclipses;
		const gapDays = (second! - first!) / (24 * HOUR);
		expect(gapDays).toBeGreaterThan(150);
		expect(gapDays).toBeLessThan(200);
	}, 30_000);
});

describe('the eclipses catalogue', () => {
	it('names every string a catalogue key, in both locales', () => {
		const keys = collectMessageKeys(activity);
		expect(keys.length).toBeGreaterThan(15);

		for (const key of keys) {
			for (const locale of LOCALES) {
				const message = catalogues[locale][key as keyof typeof catalogues.en];
				expect(message, `${locale}: ${key}`).toBeTruthy();
				expect(message.trim(), `${locale}: ${key}`).not.toBe('');
			}
		}
	});

	it('has a golden guide that walks the alignment, the miss, then the lunar eclipse', () => {
		const result = runGuideGolden(activity);
		expect(result.skipped).toBe(false);
		expect(result.steps.map((step) => step.cameraPreset)).toEqual([
			'above-ecliptic',
			'along-the-line',
			null,
			'whole-scene',
			null
		]);
		expect(result.steps.map((step) => step.instant)).toEqual([
			SOLAR,
			SOLAR,
			FAILED_NEW_MOON,
			Date.UTC(2025, 2, 14, 5, 30),
			LUNAR
		]);
	});
});

describe('the line-them-up mission', () => {
	const mission = activity.missions[0]!;

	it('asks the child to produce an eclipse, never to pick an answer', () => {
		expect(mission.success.kind).toBe('continuous');

		const right = evaluateSuccess(mission.success, at(SOLAR));
		const far = evaluateSuccess(mission.success, at(SOLAR, { [MOON_ORBIT_SETTING_KEY]: 60 }));
		const wrongMonth = evaluateSuccess(mission.success, at(FAILED_NEW_MOON));

		expect(right.state).toBe('right');
		expect(far.state).toBe('far');
		expect(wrongMonth.state).toBe('far');
	});

	it('records which body the child put in front by the scene they produced', () => {
		const state = at(SOLAR);
		const matched = mission.prediction.propositions.filter((proposition) => proposition.holds(state));
		expect(matched.map((proposition) => proposition.id)).toContain('moon-in-front');

		// A half-orbit away the same propositions say the Earth is in front.
		const behind = at(SOLAR, { [MOON_ORBIT_SETTING_KEY]: 180 });
		const matchedBehind = mission.prediction.propositions.filter((proposition) =>
			proposition.holds(behind)
		);
		expect(matchedBehind.map((proposition) => proposition.id)).toContain('earth-in-front');
	});

	it('runs predict → observe only once the eclipse is real', () => {
		let state = at(SOLAR, { [MOON_ORBIT_SETTING_KEY]: 90 });
		state = applyEvent(state, { type: 'start-mission', missionId: mission.id }).state;
		expect(state.mission?.phase).toBe('predict');

		state = applyEvent(state, { type: 'record-prediction' }).state;
		expect(state.mission?.phase).toBe('manipulate');

		// Not an eclipse yet: the reveal is refused.
		const refused = applyEvent(state, { type: 'reveal-mission' });
		expect(refused.state.mission?.phase).toBe('manipulate');

		// Place the Moon back on the alignment; now the model answers.
		const aligned = applyEvent(state, { type: 'set-setting', key: MOON_ORBIT_SETTING_KEY, value: 0 });
		const revealed = applyEvent(aligned.state, { type: 'reveal-mission' });
		expect(revealed.state.mission?.phase).toBe('observe');
	});
});

/** Every dotted string reachable from the activity data is a message key. */
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

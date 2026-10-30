import { describe, expect, it } from 'vitest';
import {
	MAX_SHADOW_LENGTH_FACTOR,
	SHADOW_SATURATION_FACTOR,
	gnomonScreen,
	shadowGeometry,
	shadowExcessAt,
	type ShadowGeometry
} from './shadow';
import { horizonY, type SkyViewport } from './sky';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type SeasonCase = {
	name: string;
	latitudeDeg: number;
	dayStart: number;
};

/**
 * Three latitudes and three seasons. The southern-hemisphere case catches a
 * sign error the northern one cannot: the shadow still points away from the
 * Sun, but "away" is the other side of the sky.
 */
const SEASONS: readonly SeasonCase[] = [
	{ name: 'Paris, June solstice', latitudeDeg: 48.8566, dayStart: Date.UTC(2025, 5, 21) },
	{ name: 'Equator, March equinox', latitudeDeg: 0, dayStart: Date.UTC(2025, 2, 20) },
	{ name: '35°S, December solstice', latitudeDeg: -35, dayStart: Date.UTC(2025, 11, 21) }
];

type Sample = ShadowGeometry & { instant: number };

function sampleDay(latitudeDeg: number, dayStart: number, stepMs = 10 * MINUTE): Sample[] {
	const samples: Sample[] = [];
	for (let instant = dayStart; instant < dayStart + 24 * HOUR; instant += stepMs) {
		samples.push({ instant, ...shadowGeometry(latitudeDeg, instant) });
	}
	return samples;
}

/** The sample with the smallest (finite) shadow length factor. */
function shortest(samples: readonly Sample[]): Sample {
	const daylit = samples.filter((sample) => sample.shadowAzimuthDeg !== null);
	const first = daylit[0];
	if (first === undefined) throw new Error('no daylight sample');
	return daylit.reduce((best, sample) =>
		sample.shadowLengthFactor < best.shadowLengthFactor ? sample : best
	);
}

function angularDistance(a: number, b: number): number {
	const difference = (((a - b) % 360) + 360) % 360;
	return Math.min(difference, 360 - difference);
}

describe('the stick and its shadow on one day', () => {
	for (const season of SEASONS) {
		it(`is longest at sunrise and sunset and shortest at noon: ${season.name}`, () => {
			const samples = sampleDay(season.latitudeDeg, season.dayStart);
			const daylit = samples.filter((sample) => sample.shadowAzimuthDeg !== null);
			const first = daylit[0];
			const last = daylit[daylit.length - 1];
			const noon = shortest(samples);

			expect(first).toBeDefined();
			expect(last).toBeDefined();

			// The day's shortest shadow is at local solar noon: the rotation sweeps
			// the hour angle, and longitude defaults to 0, so noon is within the
			// equation of time's ±16 min of 12:00 UTC.
			expect(noon.instant).toBeGreaterThanOrEqual(season.dayStart + 11.5 * HOUR);
			expect(noon.instant).toBeLessThanOrEqual(season.dayStart + 12.5 * HOUR);

			// Longest at the horizon crossings: the first and last daylight samples
			// carry the clamped maximum, and every other sample is shorter.
			const longest = daylit.reduce((best, sample) =>
				sample.shadowLengthFactor > best.shadowLengthFactor ? sample : best
			);
			expect([first!.instant, last!.instant]).toContain(longest.instant);
			expect(longest.shadowLengthFactor).toBe(MAX_SHADOW_LENGTH_FACTOR);
			expect(longest.shadowLengthFactor).toBeGreaterThan(noon.shadowLengthFactor * 5);
		});

		it(`points west in the morning and east in the afternoon: ${season.name}`, () => {
			const samples = sampleDay(season.latitudeDeg, season.dayStart);
			const daylit = samples.filter((sample) => sample.shadowAzimuthDeg !== null);
			const first = daylit[0]!;
			const last = daylit[daylit.length - 1]!;

			// The shadow points away from the Sun: a morning Sun in the east means
			// a shadow in the western half, and the reverse after noon.
			expect(first.shadowAzimuthDeg!).toBeGreaterThan(180);
			expect(last.shadowAzimuthDeg!).toBeLessThan(180);

			// And it crosses noon: the shortest shadow points north in the northern
			// case and south in the southern one. The equator at the equinox is the
			// one exception — the noon Sun is at the zenith, the shadow vanishes and
			// its direction is undefined (ASTRONOMY.md §3.5).
			const noon = shortest(samples);
			expect(noon.shadowAzimuthDeg).not.toBeNull();
			if (season.latitudeDeg !== 0) {
				expect(
					angularDistance(noon.shadowAzimuthDeg!, season.latitudeDeg >= 0 ? 0 : 180)
				).toBeLessThan(15);
			}
		});
	}

	it('casts no shadow when the Sun is below the horizon', () => {
		const midnight = shadowGeometry(48.8566, Date.UTC(2025, 5, 21, 0, 0, 0));
		expect(midnight.sunElevationDeg).toBeLessThan(0);
		expect(midnight.shadowAzimuthDeg).toBeNull();
	});

	it('clamps the length at the horizon instead of returning infinity', () => {
		const sunrise = shadowGeometry(48.8566, Date.UTC(2025, 5, 21, 3, 0, 0));
		expect(sunrise.shadowLengthFactor).toBe(MAX_SHADOW_LENGTH_FACTOR);
		expect(Number.isFinite(sunrise.shadowLengthFactor)).toBe(true);
	});
});

describe('the stick and its shadow across a year', () => {
	/** A tropical latitude, where the noon Sun crosses the zenith twice a year. */
	const LATITUDE = 19.4326;

	function noonOfMonth(month: number): Sample {
		// Find the day's shortest shadow at minute resolution rather than assuming
		// 12:00 UTC: the equation of time moves solar noon by up to ±16 min.
		const dayStart = Date.UTC(2025, month, 15);
		return shortest(sampleDay(LATITUDE, dayStart, MINUTE));
	}

	it('changes the noon shadow length at the same place', () => {
		const june = noonOfMonth(5);
		const december = noonOfMonth(11);

		// At the June solstice the noon Sun is nearly overhead here; in December
		// it is low in the south. The shadow length follows the elevation.
		expect(june.shadowLengthFactor).toBeLessThan(december.shadowLengthFactor);
		expect(december.shadowLengthFactor / june.shadowLengthFactor).toBeGreaterThan(5);

		const lengths = Array.from({ length: 12 }, (_, month) => noonOfMonth(month).shadowLengthFactor);
		const spread = Math.max(...lengths) - Math.min(...lengths);
		expect(spread).toBeGreaterThan(0.5);
	});

	it('changes the noon shadow direction across the year', () => {
		const june = noonOfMonth(5);
		const december = noonOfMonth(11);

		// In June the noon Sun is north of the zenith, so the shadow points south;
		// in December it points north. That flip is the evidence the activity
		// wants the child to see, and it never happens outside the tropics.
		expect(angularDistance(june.shadowAzimuthDeg!, 180)).toBeLessThan(5);
		expect(angularDistance(december.shadowAzimuthDeg!, 0)).toBeLessThan(5);

		const directions = Array.from({ length: 12 }, (_, month) => noonOfMonth(month).shadowAzimuthDeg!);
		expect(directions.some((direction) => angularDistance(direction, 0) < 5)).toBe(true);
		expect(directions.some((direction) => angularDistance(direction, 180) < 5)).toBe(true);
	});

	it('reports the relative excess over the day at a given instant', () => {
		const dayStart = Date.UTC(2025, 2, 20);
		const noon = shortest(sampleDay(LATITUDE, dayStart, MINUTE));
		const afternoon = noon.instant + 3 * HOUR;

		expect(shadowExcessAt(LATITUDE, noon.instant)).toBeLessThan(0.05);
		expect(shadowExcessAt(LATITUDE, afternoon)).toBeGreaterThan(1);
	});
});

describe('the gnomon as the POV draws it', () => {
	const viewport: SkyViewport = { width: 360, height: 240 };
	const horizon = horizonY(viewport.height);

	function glyph(factor: number, azimuthDeg: number | null) {
		return gnomonScreen({ shadowLengthFactor: factor, shadowAzimuthDeg: azimuthDeg }, viewport);
	}

	it('keeps the stick on its base and the shadow on the ground', () => {
		const drawn = glyph(0.5, 180);
		expect(drawn.stick.baseY).toBeGreaterThan(horizon);
		expect(drawn.stick.topY).toBeLessThan(drawn.stick.baseY);
		expect(drawn.shadow).not.toBeNull();
		expect(drawn.shadow!.baseLeft.y).toBeGreaterThan(horizon);
		expect(drawn.shadow!.tipLeft.y).toBeGreaterThan(horizon);
		expect(drawn.shadow!.tipLeft.y).toBeLessThanOrEqual(drawn.shadow!.baseLeft.y);
	});

	it('draws nothing on the ground when there is no shadow', () => {
		expect(glyph(MAX_SHADOW_LENGTH_FACTOR, null).shadow).toBeNull();
	});

	it('stays on the ground and gets closer to the horizon when very long', () => {
		const short = glyph(0.2, 180).shadow!;
		const long = glyph(MAX_SHADOW_LENGTH_FACTOR, 180).shadow!;

		const shortReach = short.baseLeft.y - short.tipLeft.y;
		const longReach = long.baseLeft.y - long.tipLeft.y;

		expect(longReach).toBeGreaterThan(shortReach);
		// Saturation, never a stretched smear: the tip stays on the panel even at
		// the documented maximum length.
		expect(long.tipLeft.y).toBeGreaterThanOrEqual(horizon);
		expect(long.tipLeft.x).toBeGreaterThanOrEqual(0);
		expect(long.tipLeft.x).toBeLessThanOrEqual(viewport.width);
		expect(SHADOW_SATURATION_FACTOR).toBeGreaterThan(0);
	});

	it('turns the shadow away from the Sun across the panorama', () => {
		// Azimuth 90 (east) sits left of the centre in the sky's panorama, so a
		// shadow pointing east must reach toward the left edge.
		expect(glyph(0.5, 90).shadow!.tipLeft.x).toBeLessThan(viewport.width / 2);
		// Azimuth 270 (west) reaches the other way.
		expect(glyph(0.5, 270).shadow!.tipLeft.x).toBeGreaterThan(viewport.width / 2);
	});
});

describe('the shadow in the scene snapshot', () => {
	it('is exposed per POV, not computed by the renderer', async () => {
		const { applyEvent, buildScene, createInitialState } = await import('./index');
		const { default: shadowsActivity } = await import('../../activities/shadows.activity');

		const state = createInitialState({
			instant: Date.UTC(2025, 2, 20, 8, 0, 0),
			activities: [shadowsActivity]
		});
		const opened = applyEvent(state, { type: 'open-activity', activityId: 'shadows' }).state;
		const entry = buildScene(opened).observers[0]!;

		expect(entry.shadow.shadowAzimuthDeg).not.toBeNull();
		expect(entry.shadow.shadowLengthFactor).toBeGreaterThan(0);
		expect(entry.shadow.shadowLengthFactor).toBeLessThanOrEqual(MAX_SHADOW_LENGTH_FACTOR);
	});
});

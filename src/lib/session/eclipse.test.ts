import { describe, expect, it } from 'vitest';
import {
	EARTH_RADIUS_KM,
	MOON_INCLINATION_DEG,
	MOON_ORBIT_SETTING_KEY,
	MOON_RADIUS_KM,
	angleBetweenDeg,
	angularRadiusDeg,
	earthShadowDeg,
	eclipticPathAu,
	lunarEclipse,
	moonArgumentDeg,
	moonGeocentricAtOffsetAu,
	moonGeocentricPositionAu,
	moonOffsetForPosition,
	moonOrbitPathAu,
	moonOrbitPointAu,
	pathInclinationDeg,
	solarEclipse,
	createInitialState,
	moonOrbitOffsetDeg,
	placedMoonGeocentricAu,
	overlapFraction,
	type Observer,
	type Vec3
} from './index';

const DEG = Math.PI / 180;

/** A point on the Earth's surface, as the activity stages it. */
function observer(latitudeDeg: number, longitudeDeg: number): Observer {
	return { id: 'pov', bodyId: 'earth', latitudeDeg, longitudeDeg, colour: '#ffffff' };
}

/** 2024-04-08 18:20 UT: the model's umbra is over east Texas (see the activity). */
const SOLAR = Date.UTC(2024, 3, 8, 18, 20);

/** Published greatest eclipse of the 2025-03-14 lunar eclipse, 06:58:47 UT. */
const LUNAR = Date.UTC(2025, 2, 14, 6, 59);

const UMBRA = observer(32.0, -95.0);
const LOS_ANGELES = observer(34.052, -118.244);
const CHILE = observer(-20.0, -70.0);

describe('the solar-eclipse predicate (ASTRONOMY.md §5.3)', () => {
	const moon = moonGeocentricPositionAu(SOLAR);

	it('puts the staged Texas observer in the umbra', () => {
		const eclipse = solarEclipse(UMBRA, SOLAR, moon);

		expect(eclipse.kind).toBe('total');
		expect(eclipse.separationDeg).toBeLessThan(
			eclipse.moonAngularRadiusDeg - eclipse.sunAngularRadiusDeg
		);
		expect(eclipse.obscuration).toBe(1);
		expect(eclipse.view.darkening).toBe(1);
	});

	it('gives Los Angeles a partial eclipse, never totality', () => {
		// The published 2024-04-08 obscuration there is 48.8 %; the model is asserted
		// on the classification and on being neither total nor plain sunlight.
		const eclipse = solarEclipse(LOS_ANGELES, SOLAR, moon);

		expect(eclipse.kind).toBe('partial');
		expect(eclipse.obscuration).toBeGreaterThan(0);
		expect(eclipse.obscuration).toBeLessThan(1);
		expect(eclipse.view.darkening).toBeGreaterThan(0);
		expect(eclipse.view.darkening).toBeLessThan(1);
	});

	it('leaves Chile in plain sunlight', () => {
		const eclipse = solarEclipse(CHILE, SOLAR, moon);

		expect(eclipse.kind).toBe('none');
		expect(eclipse.obscuration).toBe(0);
		expect(eclipse.view.darkening).toBe(0);
	});

	it('makes totality darker than partiality, and sunlight untouched', () => {
		const total = solarEclipse(UMBRA, SOLAR, moon).view.darkening;
		const partial = solarEclipse(LOS_ANGELES, SOLAR, moon).view.darkening;
		const none = solarEclipse(CHILE, SOLAR, moon).view.darkening;

		expect(total).toBeGreaterThan(partial);
		expect(partial).toBeGreaterThan(none);
		expect(none).toBe(0);
	});

	it('matches the Sun and Moon angular sizes of the published case', () => {
		const eclipse = solarEclipse(UMBRA, SOLAR, moon);

		// ASTRONOMY.md row 26: θ☉ ≈ 16.0′, θ☾ ≈ 16.6′ for 2024-04-08.
		expect(eclipse.sunAngularRadiusDeg * 60).toBeCloseTo(16.0, 0);
		expect(eclipse.moonAngularRadiusDeg * 60).toBeGreaterThan(16.0);
		expect(eclipse.moonAngularRadiusDeg * 60).toBeLessThan(17.2);
	});
});

describe('the lunar-eclipse predicate (ASTRONOMY.md §5.5)', () => {
	it('has the Moon fully inside the umbra at greatest eclipse', () => {
		const eclipse = lunarEclipse(LUNAR, moonGeocentricPositionAu(LUNAR));

		expect(eclipse.kind).toBe('total');
		expect(eclipse.obscuration).toBe(1);
		expect(eclipse.view.darkening).toBe(1);
	});

	it('walks in through the penumbra and the umbra', () => {
		const kinds = [3, 4.5, 5.5, 6, 6.67, 6.98, 7.53, 8, 8.8, 9.5].map(
			(hours) =>
				lunarEclipse(
					Date.UTC(2025, 2, 14, Math.floor(hours), Math.round((hours % 1) * 60)),
					moonGeocentricPositionAu(
						Date.UTC(2025, 2, 14, Math.floor(hours), Math.round((hours % 1) * 60))
					)
				).kind
		);

		// Published: penumbral from 03:57, umbral from 05:09, totality 06:26–07:32.
		expect(kinds).toEqual([
			'none',
			'penumbral',
			'penumbral',
			'partial',
			'partial',
			'total',
			'total',
			'partial',
			'partial',
			'penumbral'
		]);
	});

	it('reproduces the published umbra and penumbra radii at the mean distance', () => {
		// ASTRONOMY.md §5.1: 41.0′ umbra and 73.0′ penumbra at 384 400 km.
		const { umbraRadiusDeg, penumbraRadiusDeg } = earthShadowDeg(LUNAR, 384_400);

		expect(umbraRadiusDeg * 60).toBeCloseTo(41.0, 0);
		expect(penumbraRadiusDeg * 60).toBeCloseTo(73.0, 0);
	});

	it('needs a Moon larger than the Earth’s umbra’s base, not a cone of its own', () => {
		// The Earth's umbra half-angle is the Sun's angular radius, so the umbra
		// shrinks with distance: the cone is not drawn, it is a number.
		const near = earthShadowDeg(LUNAR, 356_500).umbraRadiusDeg;
		const far = earthShadowDeg(LUNAR, 406_700).umbraRadiusDeg;

		expect(near).toBeGreaterThan(far);
		expect(angularRadiusDeg(EARTH_RADIUS_KM, 384_400)).toBeCloseTo(0.95, 2);
	});
});

describe('overlapping discs', () => {
	it('gives no overlap, full overlap and a symmetric lens', () => {
		expect(overlapFraction(1, 0.5, 0.5)).toBe(0);
		expect(overlapFraction(0, 0.5, 0.5)).toBe(1);
		expect(overlapFraction(0, 1, 0.2)).toBeCloseTo(0.04, 12);
		// Equal discs, centres one radius apart: the standard lens area.
		expect(overlapFraction(0.5, 0.5, 0.5)).toBeCloseTo(0.391, 3);
	});
});

describe('placing the Moon on its orbit', () => {
	it('leaves the ephemeris Moon exactly where it was at offset zero', () => {
		const ephemeris = moonGeocentricPositionAu(SOLAR);
		const placed = moonGeocentricAtOffsetAu(SOLAR, 0);

		expect(placed).toEqual(ephemeris);
	});

	it('keeps the Moon on its drawn orbit, at the same distance', () => {
		// Within 0.04°: the ephemeris' periodic longitude terms lift the real
		// Moon slightly off the ideal plane, and the drawn ring is that plane.
		// What must hold is that the placement never leaves the orbit, at any
		// offset, and never changes the distance.
		for (const offset of [-90, -12.5, 3, 47, 180]) {
			const placed = moonGeocentricAtOffsetAu(SOLAR, offset);
			const argument = moonArgumentDeg(SOLAR, placed);
			const onOrbit = moonOrbitPointAu(SOLAR, argument);

			expect(angleBetweenDeg(placed, onOrbit)).toBeLessThan(0.05);
			expect(Math.hypot(placed.x, placed.y, placed.z)).toBeCloseTo(
				Math.hypot(...Object.values(moonGeocentricPositionAu(SOLAR))),
				9
			);
		}
	});

	it('moves the Moon along its orbit by the offset, in argument of latitude', () => {
		const real = moonGeocentricPositionAu(SOLAR);
		const placed = moonGeocentricAtOffsetAu(SOLAR, 20);

		const delta = moonArgumentDeg(SOLAR, placed) - moonArgumentDeg(SOLAR, real);
		const wrapped = ((delta + 540) % 360) - 180;

		expect(wrapped).toBeCloseTo(20, 6);
		// The rotation is about the node line, so the offset changes the latitude.
		expect(placed.z).not.toBeCloseTo(real.z, 6);
	});

	it('turns a dropped direction back into the offset it implies', () => {
		const dropped = moonGeocentricAtOffsetAu(SOLAR, 35);
		const offset = moonOffsetForPosition(SOLAR, dropped);

		expect(offset).not.toBeNull();
		expect(offset).toBeCloseTo(35, 6);
		// A drop in the Moon's own direction changes nothing.
		expect(moonOffsetForPosition(SOLAR, moonGeocentricPositionAu(SOLAR))).toBeCloseTo(0, 6);
		expect(moonOffsetForPosition(SOLAR, { x: 0, y: 0, z: 0 })).toBeNull();
	});

	it('changes what the observers see, so the child can lose the alignment', () => {
		const real = solarEclipse(UMBRA, SOLAR, moonGeocentricPositionAu(SOLAR));
		const moved = solarEclipse(UMBRA, SOLAR, moonGeocentricAtOffsetAu(SOLAR, 60));

		expect(real.kind).toBe('total');
		expect(moved.kind).toBe('none');
	});
});

describe('the drawn orbit', () => {
	it('is inclined by the Moon’s 5.145°, read off the drawn samples', () => {
		const inclination = pathInclinationDeg(moonOrbitPathAu(SOLAR));

		expect(inclination).not.toBeNull();
		expect(inclination!).toBeCloseTo(MOON_INCLINATION_DEG, 3);
	});

	it('crosses the ecliptic ring at the nodes, and only there', () => {
		const moonPoints = moonOrbitPathAu(SOLAR);
		const ecliptic = eclipticPathAu(SOLAR);

		// Exactly two samples sit on the ecliptic: the ascending and descending
		// nodes. Everywhere else the ring is off the plane, by up to sin i.
		const onThePlane = moonPoints.filter((point) => Math.abs(point.z) < 1e-9);
		expect(onThePlane).toHaveLength(2);

		const highest = Math.max(...moonPoints.map((point) => Math.abs(point.z)));
		const radius = Math.hypot(moonPoints[0]!.x, moonPoints[0]!.y, moonPoints[0]!.z);
		expect((Math.asin(highest / radius) * 180) / Math.PI).toBeCloseTo(MOON_INCLINATION_DEG, 3);

		// The reference ring is flat, at the same radius, so the two rings cross.
		for (const point of ecliptic) expect(point.z).toBe(0);
		expect(Math.hypot(ecliptic[0]!.x, ecliptic[0]!.y)).toBeCloseTo(radius, 12);
	});

	it('draws the Moon on the ring the activity shows, to the model’s own accuracy', () => {
		const placed: Vec3 = moonGeocentricAtOffsetAu(SOLAR, 12);
		const argument = moonArgumentDeg(SOLAR, placed);
		const point = moonOrbitPointAu(SOLAR, argument);
		const missAu = Math.hypot(placed.x - point.x, placed.y - point.y, placed.z - point.z);

		// One AU is 215 Earth radii; 1e-6 AU is ~0.03° of the Moon's orbit.
		expect(missAu).toBeLessThan(2e-6);
	});
});

describe('the placement is a setting, not hidden state', () => {
	it('is read from the session setting, and is zero when nothing declares it', () => {
		const state = createInitialState();
		expect(moonOrbitOffsetDeg(state)).toBe(0);
		expect(placedMoonGeocentricAu(state, SOLAR)).toEqual(moonGeocentricPositionAu(SOLAR));

		const placed = { ...state, settings: { ...state.settings, [MOON_ORBIT_SETTING_KEY]: 45 } };
		expect(moonOrbitOffsetDeg(placed)).toBe(45);
		expect(placedMoonGeocentricAu(placed, SOLAR)).toEqual(moonGeocentricAtOffsetAu(SOLAR, 45));

		// A non-number never becomes an offset.
		const broken = { ...state, settings: { ...state.settings, [MOON_ORBIT_SETTING_KEY]: 'x' } };
		expect(moonOrbitOffsetDeg(broken as never)).toBe(0);
	});
});

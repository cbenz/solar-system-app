/**
 * Closed-form two-body ephemeris (ADR-0007: conics, never force integration).
 *
 * Pipeline, per body: mean anomaly → eccentric anomaly (Newton) → true anomaly
 * → heliocentric distance → ecliptic Cartesian. The elements and the formulae
 * are those of `agent-notes/ASTRONOMY.md` §1, which are Meeus' of-date solar
 * elements (ch. 25) and his truncated lunar series (ch. 47).
 *
 * Frame: ecliptic and mean equinox **of date**, `+x` toward the vernal equinox,
 * `+z` toward ecliptic north. Distances are AU (see `types.ts`).
 *
 * Accuracy to expect (ASTRONOMY.md §1.2, §1.3): 0.01° in the Sun's longitude and
 * 0.01 % in the Earth–Sun distance for 1900–2100; 0.1° typical (≤ 1°) in the
 * Moon's longitude and 0.3 % in its distance. That is why eclipses are staged by
 * activity data rather than predicted here.
 */

import { julianDay } from './time';
import type { Instant, Vec3 } from './types';

export const AU_KM = 149_597_870.7;

/** Earth's mean radius, in AU, for placing an observer on the surface. */
export const EARTH_RADIUS_AU = 6371 / AU_KM;

export const OBLIQUITY_DEG = 23.44;

const SUN_MEAN_DISTANCE_AU = 1.000001018;
const MOON_MEAN_DISTANCE_KM = 384_400;
const MOON_ECCENTRICITY = 0.0549006;
const MOON_INCLINATION_DEG = 5.1453964;
const EARTH_SIDEREAL_YEAR_DAYS = 365.256363;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function normalizeDeg(degrees: number): number {
	const wrapped = degrees % 360;
	return wrapped < 0 ? wrapped + 360 : wrapped;
}

function wrap180(degrees: number): number {
	return normalizeDeg(degrees + 180) - 180;
}

export { wrap180 };

/**
 * Keplerian orbital elements. Angles in degrees, distances in AU.
 *
 * This is the shape the sandbox will edit in ticket 15; keep it plain data.
 */
export type OrbitElements = {
	semiMajorAxisAu: number;
	eccentricity: number;
	inclinationDeg: number;
	ascendingNodeDeg: number;
	argumentOfPerihelionDeg: number;
	/** Mean anomaly at `epochJd`. */
	meanAnomalyDeg: number;
	epochJd: number;
	periodDays: number;
};

/**
 * Solve Kepler's equation `E - e·sin E = M` by Newton iteration.
 * `E₀ = M` is enough for `e < 0.1`; high eccentricities (eclipse geometry,
 * ticket 15's dropped bodies) start at π.
 */
export function eccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
	let anomaly = eccentricity > 0.8 ? Math.PI : meanAnomalyRad;

	for (let iteration = 0; iteration < 24; iteration += 1) {
		const residual = anomaly - eccentricity * Math.sin(anomaly) - meanAnomalyRad;
		const delta = residual / (1 - eccentricity * Math.cos(anomaly));
		anomaly -= delta;
		if (Math.abs(delta) < 1e-13) break;
	}

	return anomaly;
}

/** Position relative to the orbit's focus, in the ecliptic frame, in AU. */
export function positionFromElements(elements: OrbitElements, epochDays: number): Vec3 {
	const elapsedDays = epochDays - elements.epochJd;
	const meanAnomalyDeg =
		elements.meanAnomalyDeg + (360 * elapsedDays) / elements.periodDays;
	const eccentricity = elements.eccentricity;

	const meanAnomalyRad = meanAnomalyDeg * DEG;
	const eccentricAnomalyRad = eccentricAnomaly(meanAnomalyRad, eccentricity);
	const trueAnomalyRad =
		2 *
		Math.atan2(
			Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomalyRad / 2),
			Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomalyRad / 2)
		);
	const radius = elements.semiMajorAxisAu * (1 - eccentricity * Math.cos(eccentricAnomalyRad));

	const node = elements.ascendingNodeDeg * DEG;
	const inclination = elements.inclinationDeg * DEG;
	const argumentOfLatitude = elements.argumentOfPerihelionDeg * DEG + trueAnomalyRad;

	return {
		x:
			radius *
			(Math.cos(node) * Math.cos(argumentOfLatitude) -
				Math.sin(node) * Math.sin(argumentOfLatitude) * Math.cos(inclination)),
		y:
			radius *
			(Math.sin(node) * Math.cos(argumentOfLatitude) +
				Math.cos(node) * Math.sin(argumentOfLatitude) * Math.cos(inclination)),
		z: radius * (Math.sin(argumentOfLatitude) * Math.sin(inclination))
	};
}

/**
 * The Sun's geocentric position, computed from Meeus' of-date elements for the
 * Sun's apparent orbit (ASTRONOMY.md §1.2). Its distance is the Earth–Sun
 * distance and its longitude is `λ☉`.
 */
export function sunGeocentricPositionAu(instant: Instant): Vec3 {
	const jd = julianDay(instant);
	const centuries = (jd - 2451545.0) / 36525;

	const eccentricity = 0.016708634 - 0.000042037 * centuries - 0.0000001267 * centuries ** 2;
	const meanLongitude = 280.46646 + 36000.76983 * centuries + 0.0003032 * centuries ** 2;
	const perihelionLongitude = 282.93744 + 1.71946 * centuries + 0.00046 * centuries ** 2;

	return positionFromElements(
		{
			semiMajorAxisAu: SUN_MEAN_DISTANCE_AU,
			eccentricity,
			inclinationDeg: 0,
			ascendingNodeDeg: 0,
			argumentOfPerihelionDeg: normalizeDeg(perihelionLongitude),
			meanAnomalyDeg: normalizeDeg(meanLongitude - perihelionLongitude),
			epochJd: jd,
			periodDays: EARTH_SIDEREAL_YEAR_DAYS
		},
		jd
	);
}

/** Earth's heliocentric position: the Sun's geocentric vector, negated. */
export function earthHeliocentricPositionAu(instant: Instant): Vec3 {
	const sun = sunGeocentricPositionAu(instant);
	return { x: -sun.x, y: -sun.y, z: -sun.z };
}

/** Earth–Sun distance in AU. */
export function earthSunDistanceAu(instant: Instant): number {
	const sun = sunGeocentricPositionAu(instant);
	return Math.hypot(sun.x, sun.y, sun.z);
}

/** The Sun's geocentric ecliptic longitude `λ☉`, in degrees (0…360). */
export function sunLongitudeDeg(instant: Instant): number {
	const sun = sunGeocentricPositionAu(instant);
	return normalizeDeg(Math.atan2(sun.y, sun.x) * RAD);
}

/** Obliquity of the ecliptic, in degrees. The model's fixed tilt (§2.1). */
export function obliquityDeg(): number {
	return OBLIQUITY_DEG;
}

/** The Sun's declination `δ = asin(sin ε · sin λ☉)`, in degrees. */
export function solarDeclinationDeg(instant: Instant): number {
	const longitude = sunLongitudeDeg(instant) * DEG;
	return Math.asin(Math.sin(OBLIQUITY_DEG * DEG) * Math.sin(longitude)) * RAD;
}

/** Greenwich mean sidereal time, in degrees (§3.1, Meeus ch. 12). */
export function greenwichSiderealTimeDeg(instant: Instant): number {
	const jd = julianDay(instant);
	const days = jd - 2451545.0;
	const centuries = days / 36525;

	return normalizeDeg(
		280.46061837 +
			360.98564736629 * days +
			0.000387933 * centuries ** 2 -
			centuries ** 3 / 38710000
	);
}

/**
 * The Moon's geocentric position, in AU in the ecliptic frame.
 *
 * Keplerian ellipse from Meeus' mean elements, plus the leading periodic terms
 * of ASTRONOMY.md §1.3 (17 longitude/latitude terms, 3 distance terms).
 */
export function moonGeocentricPositionAu(instant: Instant): Vec3 {
	const jd = julianDay(instant);
	const centuries = (jd - 2451545.0) / 36525;
	const t2 = centuries ** 2;
	const t3 = centuries ** 3;
	const t4 = centuries ** 4;

	const meanLongitude =
		218.3164477 +
		481267.88123421 * centuries -
		0.0015786 * t2 +
		t3 / 538841 -
		t4 / 65194000;
	const elongation =
		297.8501921 + 445267.1114034 * centuries - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000;
	const sunMeanAnomaly = 357.5291092 + 35999.0502909 * centuries - 0.0001536 * t2 + t3 / 24490000;
	const moonMeanAnomaly =
		134.9633964 +
		477198.8675055 * centuries +
		0.0087414 * t2 +
		t3 / 69699 -
		t4 / 14712000;
	const argumentOfLatitude =
		93.272095 +
		483202.0175233 * centuries -
		0.0036539 * t2 -
		t3 / 3526000 +
		t4 / 863310000;
	const ascendingNode =
		125.0445479 -
		1934.1362891 * centuries +
		0.0020754 * t2 +
		t3 / 467441 -
		t4 / 60616000;

	const argumentOfPerigee = meanLongitude - ascendingNode - moonMeanAnomaly;

	// Kepler solve for the ellipse, in the orbital plane (§1.1 steps 2–4).
	const eccentricAnomalyRad = eccentricAnomaly(moonMeanAnomaly * DEG, MOON_ECCENTRICITY);
	const trueAnomalyRad =
		2 *
		Math.atan2(
			Math.sqrt(1 + MOON_ECCENTRICITY) * Math.sin(eccentricAnomalyRad / 2),
			Math.sqrt(1 - MOON_ECCENTRICITY) * Math.cos(eccentricAnomalyRad / 2)
		);
	const radiusKm = MOON_MEAN_DISTANCE_KM * (1 - MOON_ECCENTRICITY * Math.cos(eccentricAnomalyRad));

	// Rotate to the ecliptic: λ and β from the argument of latitude u = ω + ν.
	const abbreviationRad = argumentOfPerigee * DEG + trueAnomalyRad;
	const nodeRad = ascendingNode * DEG;
	const inclinationRad = MOON_INCLINATION_DEG * DEG;
	const longitudeBeforeTerms = normalizeDeg(
		ascendingNode +
			Math.atan2(Math.sin(abbreviationRad) * Math.cos(inclinationRad), Math.cos(abbreviationRad)) *
				RAD
	);
	const latitudeBeforeTerms =
		Math.asin(Math.sin(inclinationRad) * Math.sin(abbreviationRad)) * RAD;

	const d = normalizeDeg(elongation);
	const m = normalizeDeg(sunMeanAnomaly);
	const mp = normalizeDeg(moonMeanAnomaly);
	const f = normalizeDeg(argumentOfLatitude);

	const sin = (degrees: number) => Math.sin(degrees * DEG);
	const cos = (degrees: number) => Math.cos(degrees * DEG);

	const longitude =
		longitudeBeforeTerms +
		1.274 * sin(2 * d - mp) +
		0.658 * sin(2 * d) +
		0.214 * sin(2 * mp) -
		0.186 * sin(m) -
		0.114 * sin(2 * f) +
		0.059 * sin(2 * d - 2 * mp) +
		0.057 * sin(2 * d - m - mp) +
		0.053 * sin(2 * d + mp) +
		0.046 * sin(2 * d - m) -
		0.041 * sin(m - mp) -
		0.035 * sin(d) -
		0.031 * sin(m + mp);
	const latitude =
		latitudeBeforeTerms -
		0.173 * sin(f - 2 * d) -
		0.055 * sin(mp - f - 2 * d) -
		0.046 * sin(mp + f - 2 * d) +
		0.033 * sin(f + 2 * d) +
		0.017 * sin(2 * mp + f);
	const distanceKm =
		radiusKm -
		3699.111 * cos(2 * d - mp) -
		2955.968 * cos(2 * d) -
		569.925 * cos(2 * mp);

	const longitudeRad = longitude * DEG;
	const latitudeRad = latitude * DEG;
	const distanceAu = distanceKm / AU_KM;
	const projected = distanceAu * Math.cos(latitudeRad);

	return {
		x: projected * Math.cos(longitudeRad),
		y: projected * Math.sin(longitudeRad),
		z: distanceAu * Math.sin(latitudeRad)
	};
}

/** The Moon's heliocentric position, in AU. */
export function moonHeliocentricPositionAu(instant: Instant): Vec3 {
	const earth = earthHeliocentricPositionAu(instant);
	const moon = moonGeocentricPositionAu(instant);
	return { x: earth.x + moon.x, y: earth.y + moon.y, z: earth.z + moon.z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(vector: Vec3, factor: number): Vec3 {
	return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

export function dot(a: Vec3, b: Vec3): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function length(vector: Vec3): number {
	return Math.hypot(vector.x, vector.y, vector.z);
}

/** Unit vector; the zero vector stays zero rather than becoming NaN. */
export function unit(vector: Vec3): Vec3 {
	const size = length(vector);
	return size === 0 ? { x: 0, y: 0, z: 0 } : scale(vector, 1 / size);
}

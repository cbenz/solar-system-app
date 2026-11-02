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
import type { Instant, PlanetId, Vec3 } from './types';

export const AU_KM = 149_597_870.7;

/** Earth's mean radius, in AU, for placing an observer on the surface. */
export const EARTH_RADIUS_AU = 6371 / AU_KM;

export const OBLIQUITY_DEG = 23.44;

const SUN_MEAN_DISTANCE_AU = 1.000001018;
const MOON_MEAN_DISTANCE_KM = 384_400;
const MOON_ECCENTRICITY = 0.0549006;
/** The Moon's orbital inclination to the ecliptic, in degrees (ASTRONOMY.md §1.3). */
export const MOON_INCLINATION_DEG = 5.1453964;
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

/**
 * Mean Keplerian elements of the major planets at J2000.0, with their linear
 * rates per Julian century. Source: E. M. Standish, *Keplerian Elements for
 * Approximate Positions of the Major Planets* (JPL Solar System Dynamics),
 * table 1, valid 1800–2050. The elements are referred to the J2000 ecliptic
 * and equinox; the model uses the ecliptic of date, a difference far below the
 * accuracy this map needs.
 *
 * `a` is in AU, angles in degrees, `rate*` are per Julian century.
 */
type PlanetElements = {
	semiMajorAxisAu: number;
	eccentricity: number;
	inclinationDeg: number;
	meanLongitudeDeg: number;
	perihelionLongitudeDeg: number;
	ascendingNodeDeg: number;
	semiMajorAxisRate: number;
	eccentricityRate: number;
	inclinationRate: number;
	meanLongitudeRate: number;
	perihelionLongitudeRate: number;
	ascendingNodeRate: number;
};

const PLANET_ELEMENTS: Record<PlanetId, PlanetElements> = {
	mercury: {
		semiMajorAxisAu: 0.38709927,
		eccentricity: 0.20563593,
		inclinationDeg: 7.00497902,
		meanLongitudeDeg: 252.2503235,
		perihelionLongitudeDeg: 77.45779628,
		ascendingNodeDeg: 48.33076593,
		semiMajorAxisRate: 0.00000037,
		eccentricityRate: 0.00001906,
		inclinationRate: -0.00594749,
		meanLongitudeRate: 149472.67411175,
		perihelionLongitudeRate: 0.16047689,
		ascendingNodeRate: -0.12534081
	},
	venus: {
		semiMajorAxisAu: 0.72333566,
		eccentricity: 0.00677672,
		inclinationDeg: 3.39467605,
		meanLongitudeDeg: 181.9790995,
		perihelionLongitudeDeg: 131.60246718,
		ascendingNodeDeg: 76.67984255,
		semiMajorAxisRate: 0.0000039,
		eccentricityRate: -0.00004107,
		inclinationRate: -0.0007889,
		meanLongitudeRate: 58517.81538729,
		perihelionLongitudeRate: 0.00268329,
		ascendingNodeRate: -0.27769418
	},
	mars: {
		semiMajorAxisAu: 1.52371034,
		eccentricity: 0.0933941,
		inclinationDeg: 1.84969142,
		meanLongitudeDeg: -4.55343205,
		perihelionLongitudeDeg: -23.94362959,
		ascendingNodeDeg: 49.55953891,
		semiMajorAxisRate: 0.00001847,
		eccentricityRate: 0.00007882,
		inclinationRate: -0.00813131,
		meanLongitudeRate: 19140.30268499,
		perihelionLongitudeRate: 0.44441088,
		ascendingNodeRate: -0.29257343
	},
	jupiter: {
		semiMajorAxisAu: 5.202887,
		eccentricity: 0.04838624,
		inclinationDeg: 1.30439695,
		meanLongitudeDeg: 34.39644051,
		perihelionLongitudeDeg: 14.72847983,
		ascendingNodeDeg: 100.47390909,
		semiMajorAxisRate: -0.00011607,
		eccentricityRate: -0.00013253,
		inclinationRate: -0.00183714,
		meanLongitudeRate: 3034.74612775,
		perihelionLongitudeRate: 0.21252668,
		ascendingNodeRate: 0.20469106
	},
	saturn: {
		semiMajorAxisAu: 9.53667594,
		eccentricity: 0.05386179,
		inclinationDeg: 2.48599187,
		meanLongitudeDeg: 49.95424423,
		perihelionLongitudeDeg: 92.59887831,
		ascendingNodeDeg: 113.66242448,
		semiMajorAxisRate: -0.0012506,
		eccentricityRate: -0.00050991,
		inclinationRate: 0.00193609,
		meanLongitudeRate: 1222.49362201,
		perihelionLongitudeRate: -0.41897216,
		ascendingNodeRate: -0.28867794
	},
	uranus: {
		semiMajorAxisAu: 19.18916464,
		eccentricity: 0.04725744,
		inclinationDeg: 0.77263783,
		meanLongitudeDeg: 313.23810451,
		perihelionLongitudeDeg: 170.9542763,
		ascendingNodeDeg: 74.01692503,
		semiMajorAxisRate: -0.00196176,
		eccentricityRate: -0.00004397,
		inclinationRate: -0.00242939,
		meanLongitudeRate: 428.48202785,
		perihelionLongitudeRate: 0.40805281,
		ascendingNodeRate: 0.04240589
	},
	neptune: {
		semiMajorAxisAu: 30.06992276,
		eccentricity: 0.00859048,
		inclinationDeg: 1.77004347,
		meanLongitudeDeg: -55.12002969,
		perihelionLongitudeDeg: 44.96476227,
		ascendingNodeDeg: 131.78422574,
		semiMajorAxisRate: 0.00026291,
		eccentricityRate: 0.00005105,
		inclinationRate: 0.00035372,
		meanLongitudeRate: 218.45945325,
		perihelionLongitudeRate: -0.32241464,
		ascendingNodeRate: -0.00508664
	}
};

/** A planet's heliocentric position, in AU in the ecliptic frame. */
export function planetHeliocentricPositionAu(planet: PlanetId, instant: Instant): Vec3 {
	const base = PLANET_ELEMENTS[planet];
	const jd = julianDay(instant);
	const centuries = (jd - 2451545.0) / 36525;

	const semiMajorAxisAu = base.semiMajorAxisAu + base.semiMajorAxisRate * centuries;
	const eccentricity = base.eccentricity + base.eccentricityRate * centuries;
	const inclinationDeg = base.inclinationDeg + base.inclinationRate * centuries;
	const meanLongitudeDeg = base.meanLongitudeDeg + base.meanLongitudeRate * centuries;
	const perihelionLongitudeDeg =
		base.perihelionLongitudeDeg + base.perihelionLongitudeRate * centuries;
	const ascendingNodeDeg = base.ascendingNodeDeg + base.ascendingNodeRate * centuries;
	const periodDays = 360 / (base.meanLongitudeRate / 36525);

	return positionFromElements(
		{
			semiMajorAxisAu,
			eccentricity,
			inclinationDeg,
			ascendingNodeDeg: normalizeDeg(ascendingNodeDeg),
			argumentOfPerihelionDeg: normalizeDeg(perihelionLongitudeDeg - ascendingNodeDeg),
			meanAnomalyDeg: normalizeDeg(meanLongitudeDeg - perihelionLongitudeDeg),
			epochJd: jd,
			periodDays
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

/**
 * The Sun's declination `δ = asin(sin ε · sin λ☉)`, in degrees.
 *
 * `tiltDeg` defaults to the model's obliquity, so every existing caller is
 * unchanged; the seasons activity passes its slider value (ticket 13).
 */
export function solarDeclinationDeg(instant: Instant, tiltDeg: number = OBLIQUITY_DEG): number {
	const longitude = sunLongitudeDeg(instant) * DEG;
	const epsilon = Math.min(90, Math.max(0, tiltDeg)) * DEG;
	return Math.asin(Math.sin(epsilon) * Math.sin(longitude)) * RAD;
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
 * The Moon's mean longitude of the ascending node `Ω`, in degrees, regressing
 * 19.34° per year (ASTRONOMY.md §1.3). It is the node line every eclipse lives
 * on, so it is exported rather than recomputed by the eclipse module.
 */
export function moonAscendingNodeDeg(instant: Instant): number {
	const jd = julianDay(instant);
	const centuries = (jd - 2451545.0) / 36525;
	const t2 = centuries ** 2;
	const t3 = centuries ** 3;
	const t4 = centuries ** 4;

	return normalizeDeg(
		125.0445479 -
			1934.1362891 * centuries +
			0.0020754 * t2 +
			t3 / 467441 -
			t4 / 60616000
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
	const ascendingNode = moonAscendingNodeDeg(instant);

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

/**
 * Observer geometry: where someone stands, and how high the Sun is above their
 * horizon.
 *
 * ASTRONOMY.md §3 and §4: one dot product decides everything.
 * `sunElevationDeg = asin(n̂ · ŝ)` and `daylight = n̂ · ŝ > 0`, from the same
 * surface normal `n̂`, which in turn comes from the one rotation function
 * (`greenwichSiderealTimeDeg`). Ticket 05 places observers, ticket 10 draws the
 * POV, ticket 33 checks that the terminator and the POV agree — they all use
 * these functions rather than deriving the geometry again.
 *
 * Longitude is a convention, never a control: it is 0 unless an activity says
 * otherwise, and the rotation sweeps every longitude as time runs.
 */

import {
	EARTH_RADIUS_AU,
	dot,
	earthHeliocentricPositionAu,
	greenwichSiderealTimeDeg,
	moonHeliocentricPositionAu,
	planetHeliocentricPositionAu,
	length,
	normalizeDeg,
	obliquityDeg,
	solarDeclinationDeg,
	subtract,
	sunLongitudeDeg,
	unit
} from './ephemeris';
import type { BodyId, Instant, Observer, Vec3 } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/**
 * The observer's outward surface normal, in the ecliptic frame.
 *
 * `θ = GMST + longitude` is the same rotation the globe mesh must use; then the
 * equatorial normal is tilted into the ecliptic about the `x` axis by ε.
 */
export function observerNormal(
	observer: Observer,
	instant: Instant,
	tiltDeg: number = obliquityDeg()
): Vec3 {
	const latitude = observer.latitudeDeg * DEG;
	const theta = (greenwichSiderealTimeDeg(instant) + (observer.longitudeDeg ?? 0)) * DEG;
	const epsilon = Math.min(90, Math.max(0, tiltDeg)) * DEG;

	const x = Math.cos(latitude) * Math.cos(theta);
	const y = Math.cos(latitude) * Math.sin(theta);
	const z = Math.sin(latitude);

	return {
		x,
		y: y * Math.cos(epsilon) + z * Math.sin(epsilon),
		z: -y * Math.sin(epsilon) + z * Math.cos(epsilon)
	};
}

/** The observer's position in the ecliptic frame, in AU. */
export function observerPositionAu(
	observer: Observer,
	instant: Instant,
	tiltDeg?: number
): Vec3 {
	const normal = observerNormal(observer, instant, tiltDeg);
	const center = bodyCenterAu(observer.bodyId, instant);

	return {
		x: center.x + normal.x * EARTH_RADIUS_AU,
		y: center.y + normal.y * EARTH_RADIUS_AU,
		z: center.z + normal.z * EARTH_RADIUS_AU
	};
}

/** Heliocentric centre of a body, in AU. */
export function bodyCenterAu(bodyId: BodyId, instant: Instant): Vec3 {
	switch (bodyId) {
		case 'sun':
			return { x: 0, y: 0, z: 0 };
		case 'earth':
			return earthHeliocentricPositionAu(instant);
		case 'moon':
			return moonHeliocentricPositionAu(instant);
		default:
			return planetHeliocentricPositionAu(bodyId, instant);
	}
}

/** Unit direction from the Earth's centre toward the Sun. */
export function sunDirection(instant: Instant): Vec3 {
	return unit(subtract({ x: 0, y: 0, z: 0 }, earthHeliocentricPositionAu(instant)));
}

/** Sun elevation above the observer's horizon, in degrees (−90 … +90). */
export function sunElevationDeg(
	observer: Observer,
	instant: Instant,
	tiltDeg?: number
): number {
	const elevation = dot(observerNormal(observer, instant, tiltDeg), sunDirection(instant));
	return Math.asin(Math.min(Math.max(elevation, -1), 1)) * RAD;
}

/**
 * Daylight is the sign of the same dot product, geometric centre of the Sun
 * (h₀ = 0, §3.3). Never a clock, never a shader of its own.
 */
export function isDaylight(observer: Observer, instant: Instant, tiltDeg?: number): boolean {
	return dot(observerNormal(observer, instant, tiltDeg), sunDirection(instant)) > 0;
}

/** Wrap degrees into (−180, 180]. */
function wrap180(degrees: number): number {
	return normalizeDeg(degrees + 180) - 180;
}

/**
 * The Sun's hour angle: zero at local solar noon, negative in the morning and
 * positive in the afternoon (ASTRONOMY.md §3.1).
 *
 * This is the quantity a clock cannot give: it is what makes "noon where I am"
 * a statement about the observer's meridian rather than about UTC.
 */
export function sunHourAngleDeg(observer: Observer, instant: Instant): number {
	return wrap180(
		greenwichSiderealTimeDeg(instant) +
			(observer.longitudeDeg ?? 0) -
			sunRightAscensionDeg(instant)
	);
}

/**
 * Azimuth from a declination and an hour angle, clockwise from north
 * (ASTRONOMY.md §3.5). The one place the horizon frame is built, so the Sun
 * and every other body share it.
 */
function azimuthFromHourAngleDeg(
	latitudeDeg: number,
	declinationDeg: number,
	hourAngleDeg: number
): number {
	const latitude = latitudeDeg * DEG;
	const declination = declinationDeg * DEG;
	const hourAngle = hourAngleDeg * DEG;

	const east = -Math.cos(declination) * Math.sin(hourAngle);
	const north =
		Math.sin(declination) * Math.cos(latitude) -
		Math.cos(declination) * Math.sin(latitude) * Math.cos(hourAngle);

	return normalizeDeg(Math.atan2(east, north) * RAD);
}

/** The Sun's azimuth, measured clockwise from north (ASTRONOMY.md §3.5). */
export function sunAzimuthDeg(observer: Observer, instant: Instant, tiltDeg?: number): number {
	return azimuthFromHourAngleDeg(
		observer.latitudeDeg,
		solarDeclinationDeg(instant, tiltDeg),
		sunHourAngleDeg(observer, instant)
	);
}

/** The Sun's apparent right ascension, in degrees. */
function sunRightAscensionDeg(instant: Instant): number {
	const longitude = sunLongitudeDeg(instant) * DEG;
	const epsilon = obliquityDeg() * DEG;
	return normalizeDeg(Math.atan2(Math.cos(epsilon) * Math.sin(longitude), Math.cos(longitude)) * RAD);
}

/** Elevation of any point above the observer's horizon, in degrees. */
export function elevationOfPointDeg(observer: Observer, pointAu: Vec3, instant: Instant): number {
	const direction = unit(subtract(pointAu, observerPositionAu(observer, instant)));
	return Math.asin(Math.min(Math.max(dot(observerNormal(observer, instant), direction), -1), 1)) * RAD;
}

/**
 * Equatorial right ascension and declination of an ecliptic direction, in
 * degrees. The inverse of `observerNormal`'s tilt about the `x` axis.
 */
function equatorialOf(direction: Vec3): { rightAscensionDeg: number; declinationDeg: number } {
	const epsilon = obliquityDeg() * DEG;
	const y = direction.y * Math.cos(epsilon) - direction.z * Math.sin(epsilon);
	const z = direction.y * Math.sin(epsilon) + direction.z * Math.cos(epsilon);

	return {
		rightAscensionDeg: normalizeDeg(Math.atan2(y, direction.x) * RAD),
		declinationDeg: Math.asin(Math.min(Math.max(z / length(direction), -1), 1)) * RAD
	};
}

/**
 * Altitude and azimuth of any point, for the POV panel. The same rotation
 * `sunElevationDeg` and `sunAzimuthDeg` use, so the night sky and the Sun
 * cannot disagree about where the horizon is.
 */
export function pointAltitudeAzimuthDeg(
	observer: Observer,
	pointAu: Vec3,
	instant: Instant
): { altitudeDeg: number; azimuthDeg: number } {
	const direction = unit(subtract(pointAu, observerPositionAu(observer, instant)));
	const { rightAscensionDeg, declinationDeg } = equatorialOf(direction);

	return {
		altitudeDeg: elevationOfPointDeg(observer, pointAu, instant),
		azimuthDeg: azimuthFromHourAngleDeg(
			observer.latitudeDeg,
			declinationDeg,
			greenwichSiderealTimeDeg(instant) + (observer.longitudeDeg ?? 0) - rightAscensionDeg
		)
	};
}

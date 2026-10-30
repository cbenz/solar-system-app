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
	obliquityDeg,
	subtract,
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
export function observerNormal(observer: Observer, instant: Instant): Vec3 {
	const latitude = observer.latitudeDeg * DEG;
	const theta = (greenwichSiderealTimeDeg(instant) + observer.longitudeDeg) * DEG;
	const epsilon = obliquityDeg() * DEG;

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
export function observerPositionAu(observer: Observer, instant: Instant): Vec3 {
	const normal = observerNormal(observer, instant);
	const center = bodyCenterAu(observer.bodyId, instant);

	return {
		x: center.x + normal.x * EARTH_RADIUS_AU,
		y: center.y + normal.y * EARTH_RADIUS_AU,
		z: center.z + normal.z * EARTH_RADIUS_AU
	};
}

/** Heliocentric centre of a body, in AU. Ticket 03 knows the Sun, Earth, Moon. */
export function bodyCenterAu(bodyId: BodyId, instant: Instant): Vec3 {
	switch (bodyId) {
		case 'sun':
			return { x: 0, y: 0, z: 0 };
		case 'earth':
			return earthHeliocentricPositionAu(instant);
		case 'moon':
			return moonHeliocentricPositionAu(instant);
	}
}

/** Unit direction from the Earth's centre toward the Sun. */
export function sunDirection(instant: Instant): Vec3 {
	return unit(subtract({ x: 0, y: 0, z: 0 }, earthHeliocentricPositionAu(instant)));
}

/** Sun elevation above the observer's horizon, in degrees (−90 … +90). */
export function sunElevationDeg(observer: Observer, instant: Instant): number {
	const elevation = dot(observerNormal(observer, instant), sunDirection(instant));
	return Math.asin(Math.min(Math.max(elevation, -1), 1)) * RAD;
}

/**
 * Daylight is the sign of the same dot product, geometric centre of the Sun
 * (h₀ = 0, §3.3). Never a clock, never a shader of its own.
 */
export function isDaylight(observer: Observer, instant: Instant): boolean {
	return dot(observerNormal(observer, instant), sunDirection(instant)) > 0;
}

/** Elevation of any point above the observer's horizon, in degrees. */
export function elevationOfPointDeg(observer: Observer, pointAu: Vec3, instant: Instant): number {
	const direction = unit(subtract(pointAu, observerPositionAu(observer, instant)));
	return Math.asin(Math.min(Math.max(dot(observerNormal(observer, instant), direction), -1), 1)) * RAD;
}

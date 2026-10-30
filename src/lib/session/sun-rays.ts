/**
 * Sunlight as a bundle of parallel rays, for the seasons scene.
 *
 * The Sun is about 108 Sun-diameters from the Earth (and ~12 000 Earth radii),
 * so the rays reaching the Earth are parallel to far better than a pixel. The
 * scene draws them parallel because that is the truth, and because the whole
 * "spread out" argument only works if they are: a fan would concentrate at the
 * wrong place. A comment, not a slider.
 *
 * The module is pure geometry in the session's frame (AU, ecliptic, Sun at the
 * origin). The renderer converts the segments through the same drawn offset it
 * uses for the bodies; it never decides a direction.
 */

import { EARTH_RADIUS_AU } from './ephemeris';
import { bodyCenterAu } from './observers';
import { sunlightDirection } from './seasons';
import type { Instant, Vec3 } from './types';

const DEG = Math.PI / 180;

export type SunRay = {
	/** Heliocentric start of the drawn segment, in AU. */
	origin: Vec3;
	/** Unit direction of travel (Sun → Earth). The same for every ray. */
	direction: Vec3;
	/** Length of the drawn segment, in AU. */
	lengthAu: number;
};

export type SunRayBundle = {
	rays: readonly SunRay[];
	direction: Vec3;
	/** Separation between adjacent rays before they reach the globe, in AU. */
	spacingAu: number;
};

export type SunRayOptions = {
	/** How many rays; an odd count puts one on the Earth–Sun axis. */
	count?: number;
	/** Half-width of the bundle across the Earth, in AU. */
	halfWidthAu?: number;
	/** How far the segment extends before and after the Earth, in AU. */
	lengthAu?: number;
};

/** A unit vector perpendicular to `direction`, chosen deterministically. */
function perpendicularTo(direction: Vec3): Vec3 {
	// Pick the axis least aligned with the direction, so the cross product is
	// never near the zero vector.
	const axis: Vec3 =
		Math.abs(direction.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };

	const cross = {
		x: direction.y * axis.z - direction.z * axis.y,
		y: direction.z * axis.x - direction.x * axis.z,
		z: direction.x * axis.y - direction.y * axis.x
	};
	const size = Math.hypot(cross.x, cross.y, cross.z);
	return { x: cross.x / size, y: cross.y / size, z: cross.z / size };
}

/**
 * A bundle of parallel rays crossing the Earth. All rays share one direction;
 * their origins are evenly spaced on a line perpendicular to it. That is what
 * "parallel sunlight" means, and the renderer draws the segments straight.
 */
export function parallelSunRays(instant: Instant, options: SunRayOptions = {}): SunRayBundle {
	const count = Math.max(2, Math.trunc(options.count ?? 7));
	const halfWidthAu = options.halfWidthAu ?? 1.5 * EARTH_RADIUS_AU;
	const lengthAu = options.lengthAu ?? 4 * EARTH_RADIUS_AU;

	const earth = bodyCenterAu('earth', instant);
	const direction = sunlightDirection(instant);
	const across = perpendicularTo(direction);
	const spacingAu = (2 * halfWidthAu) / (count - 1);

	const rays: SunRay[] = [];
	for (let index = 0; index < count; index += 1) {
		const offset = -halfWidthAu + index * spacingAu;
		// The segment straddles the Earth: it comes from the Sun's side and goes
		// past, so the globe visibly intersects the bundle.
		rays.push({
			origin: {
				x: earth.x + across.x * offset - direction.x * lengthAu,
				y: earth.y + across.y * offset - direction.y * lengthAu,
				z: earth.z + across.z * offset - direction.z * lengthAu
			},
			direction,
			lengthAu: 2 * lengthAu
		});
	}

	return { rays, direction, spacingAu };
}

/**
 * Spacing between adjacent rays where they meet a surface whose normal makes
 * the Sun's elevation `elevationDeg`: a bundle of fixed cross-section hits the
 * ground over `spacing / sin(elevation)`. At the zenith it is unchanged; low
 * sun spreads the same light over more ground, which is the concentration
 * argument in one line. Clamped just above the horizon so it stays finite.
 */
export function surfaceRaySpacingAu(bundleSpacingAu: number, elevationDeg: number): number {
	const elevation = Math.min(89.999, Math.max(0.001, elevationDeg));
	return bundleSpacingAu / Math.sin(elevation * DEG);
}

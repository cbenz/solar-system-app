/**
 * Eclipses: the two shadow cones, the angular predicate, and the Moon the child
 * places on its orbit.
 *
 * ASTRONOMY.md §5. Two things are deliberately separate here:
 *
 * - **The predicate.** What an observer sees is decided by angles, never by a
 *   cone drawn in the scene: `s ≥ θ☉ + θ☾` is plain sunlight, an overlap is
 *   partial, and `s ≤ |θ☾ − θ☉|` is central — total when the Moon's disc is the
 *   larger, annular when it is not (§5.3). A lunar eclipse is the same geometry
 *   seen the other way round: the Moon is inside the Earth's umbra, measured
 *   from the anti-solar point by `r_umbra / d` (§5.5).
 * - **The placement.** The Moon model is a 0.1° ephemeris, far too coarse to
 *   *predict* an eclipse (§1.3), so eclipses are staged by activity data. What
 *   the child does is place the Moon on its orbit: `moonOrbitOffsetDeg` is an
 *   offset along the inclined orbit, applied as a rotation about the node line,
 *   so the offset is exactly an extra argument of latitude. Offset 0 is the
 *   real Moon, bit for bit, which is what lets an activity stage a real eclipse
 *   and still let the child move the Moon off it.
 *
 * The umbra and penumbra radii are reported as angles too (`umbraRadiusDeg`,
 * `penumbraRadiusDeg`) because that is what confirms the cone picture for the
 * child: 41′ and 73′ at the Moon's distance, against the Moon's own 15′.
 */

import {
	AU_KM,
	MOON_INCLINATION_DEG,
	add,
	dot,
	earthHeliocentricPositionAu,
	earthSunDistanceAu,
	length,
	moonAscendingNodeDeg,
	moonGeocentricPositionAu,
	normalizeDeg,
	scale,
	subtract,
	sunGeocentricPositionAu,
	unit
} from './ephemeris';
import { observerPositionAu } from './observers';
import { currentActivity } from './camera';
import type { Instant, Observer, SceneMoon, SceneObserver, SessionState, Vec3 } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** The Sun's radius, in km (ASTRONOMY.md §6.2). */
export const SUN_RADIUS_KM = 696_000;

/** The Moon's radius, in km. The same number `moon.ts` uses. */
export const MOON_RADIUS_KM = 1737.4;

/** The Earth's radius, in km: the base of both of its shadow cones. */
export const EARTH_RADIUS_KM = 6371;

/**
 * The setting key an activity declares to let the child place the Moon.
 *
 * It is a number setting in degrees: zero is the ephemeris Moon, positive moves
 * it along its orbit (prograde). An activity that does not declare it gets no
 * placement, and the Moon stays where the ephemeris puts it.
 */
export const MOON_ORBIT_SETTING_KEY = 'moonOrbitOffsetDeg';

/** What an observer sees of the Sun. */
export type SolarEclipseKind = 'none' | 'partial' | 'total' | 'annular';

/** What the Earth's shadow does to the Moon. The same for every observer. */
export type LunarEclipseKind = 'none' | 'penumbral' | 'partial' | 'total';

/** The eclipse as one POV draws it: a kind and how far the light is dimmed. */
export type EclipseView = {
	kind: SolarEclipseKind | LunarEclipseKind;
	/** 0 in plain light, 1 in full shadow: what the panel multiplies light by. */
	darkening: number;
};

export type SolarEclipse = {
	kind: SolarEclipseKind;
	/** Angular separation of the two centres, in degrees. */
	separationDeg: number;
	sunAngularRadiusDeg: number;
	moonAngularRadiusDeg: number;
	/** Fraction of the Sun's disc the Moon covers, 0 … 1. */
	obscuration: number;
	/**
	 * The Sun's semi-diameter in degrees. The scene draws the discs with it, so
	 * the eclipse is drawn at its true relative size (ASTRONOMY.md §6.2).
	 */
	view: EclipseView;
};

export type LunarEclipse = {
	kind: LunarEclipseKind;
	/** Angular distance of the Moon's centre from the anti-solar point, degrees. */
	separationDeg: number;
	/** The Earth's umbra, as an angular radius seen from the Earth's centre. */
	umbraRadiusDeg: number;
	/** The penumbra, the same way. */
	penumbraRadiusDeg: number;
	moonAngularRadiusDeg: number;
	/** Fraction of the Moon's disc inside the umbra, 0 … 1. */
	obscuration: number;
	view: EclipseView;
};

function clampUnit(value: number): number {
	return Math.min(Math.max(value, -1), 1);
}

/** The angle between two vectors, in degrees. Zero-safe. */
export function angleBetweenDeg(a: Vec3, b: Vec3): number {
	return Math.acos(clampUnit(dot(unit(a), unit(b)))) * RAD;
}

/**
 * The area shared by two discs, as a fraction of the first one's area.
 *
 * The standard lens area of two circles a distance `separation` apart. Used for
 * both eclipse directions: how much of the Sun the Moon covers, and how much of
 * the Moon the Earth's umbra covers.
 */
export function overlapFraction(
	separation: number,
	discRadius: number,
	otherRadius: number
): number {
	const distance = Math.abs(separation);
	const outer = discRadius + otherRadius;

	if (distance >= outer) return 0;
	if (distance <= Math.abs(discRadius - otherRadius)) {
		return otherRadius >= discRadius ? 1 : (otherRadius / discRadius) ** 2;
	}

	const r1 = discRadius;
	const r2 = otherRadius;
	const root = Math.sqrt(
		Math.max(0, (-distance + r1 + r2) * (distance + r1 - r2) * (distance - r1 + r2) * (distance + r1 + r2))
	);
	const lens =
		r1 * r1 * Math.acos(clampUnit((distance * distance + r1 * r1 - r2 * r2) / (2 * distance * r1))) +
		r2 * r2 * Math.acos(clampUnit((distance * distance + r2 * r2 - r1 * r1) / (2 * distance * r2))) -
		root / 2;

	return lens / (Math.PI * r1 * r1);
}

/** The apparent angular radius of a sphere of radius `radiusKm` at `distanceKm`. */
export function angularRadiusDeg(radiusKm: number, distanceKm: number): number {
	return Math.asin(clampUnit(radiusKm / distanceKm)) * RAD;
}

/**
 * How much of the Sun this observer sees, at this instant, with the Moon where
 * the session has placed it (ASTRONOMY.md §5.3).
 *
 * The observer's position is topocentric — on the surface, not at the centre —
 * because the Moon's parallax is 0.95° and that is larger than the whole
 * totality band. The Moon's position is geocentric, as the caller gives it.
 */
export function solarEclipse(
	observer: Observer,
	instant: Instant,
	moonGeocentricAu: Vec3
): SolarEclipse {
	const observerAu = observerPositionAu(observer, instant);
	const moonHeliocentricAu = add(earthHeliocentricPositionAu(instant), moonGeocentricAu);

	const toSun = scale(observerAu, -1);
	const toMoon = subtract(moonHeliocentricAu, observerAu);

	const sunAngularRadiusDeg = angularRadiusDeg(SUN_RADIUS_KM, length(toSun) * AU_KM);
	const moonAngularRadiusDeg = angularRadiusDeg(MOON_RADIUS_KM, length(toMoon) * AU_KM);
	const separationDeg = angleBetweenDeg(toSun, toMoon);

	const outer = sunAngularRadiusDeg + moonAngularRadiusDeg;
	const inner = Math.abs(moonAngularRadiusDeg - sunAngularRadiusDeg);

	let kind: SolarEclipseKind = 'none';
	if (separationDeg < inner) {
		kind = moonAngularRadiusDeg >= sunAngularRadiusDeg ? 'total' : 'annular';
	} else if (separationDeg < outer) {
		kind = 'partial';
	}

	const obscuration =
		kind === 'none'
			? 0
			: kind === 'annular'
				? (moonAngularRadiusDeg / sunAngularRadiusDeg) ** 2
				: overlapFraction(separationDeg, sunAngularRadiusDeg, moonAngularRadiusDeg);

	return {
		kind,
		separationDeg,
		sunAngularRadiusDeg,
		moonAngularRadiusDeg,
		obscuration,
		view: { kind, darkening: kind === 'none' ? 0 : Math.min(1, obscuration) }
	};
}

/**
 * The Earth's umbra and penumbra at the Moon's distance, as angular radii seen
 * from the Earth's centre (ASTRONOMY.md §5.1).
 *
 * The umbra is a converging cone of half-angle `θ☉`, so its radius there is
 * `R_E − d·tan θ☉`: 4 583 km at the mean distance, i.e. 41′. The penumbra
 * diverges at the same rate and is 73′.
 */
export function earthShadowDeg(
	instant: Instant,
	moonDistanceKm: number
): { umbraRadiusDeg: number; penumbraRadiusDeg: number } {
	const sunAngularRadiusRad = Math.asin(
		clampUnit(SUN_RADIUS_KM / (earthSunDistanceAu(instant) * AU_KM))
	);
	const umbraKm = EARTH_RADIUS_KM - moonDistanceKm * Math.tan(sunAngularRadiusRad);
	const penumbraKm = EARTH_RADIUS_KM + moonDistanceKm * Math.tan(sunAngularRadiusRad);

	return {
		umbraRadiusDeg: Math.atan(Math.max(umbraKm, 0) / moonDistanceKm) * RAD,
		penumbraRadiusDeg: Math.atan(penumbraKm / moonDistanceKm) * RAD
	};
}

/**
 * What the Earth's shadow does to the Moon (ASTRONOMY.md §5.5).
 *
 * Measured from the anti-solar point, so it is the same number for everyone on
 * the night side: a lunar eclipse is a real shadow on the Moon, not a
 * projection into one observer's sky.
 */
export function lunarEclipse(instant: Instant, moonGeocentricAu: Vec3): LunarEclipse {
	const moonDistanceKm = length(moonGeocentricAu) * AU_KM;
	const moonAngularRadiusDeg = angularRadiusDeg(MOON_RADIUS_KM, moonDistanceKm);
	const { umbraRadiusDeg, penumbraRadiusDeg } = earthShadowDeg(instant, moonDistanceKm);

	const antiSolar = scale(unit(sunGeocentricPositionAu(instant)), -1);
	const separationDeg = angleBetweenDeg(moonGeocentricAu, antiSolar);

	let kind: LunarEclipseKind = 'none';
	if (separationDeg <= umbraRadiusDeg - moonAngularRadiusDeg) kind = 'total';
	else if (separationDeg <= umbraRadiusDeg + moonAngularRadiusDeg) kind = 'partial';
	else if (separationDeg <= penumbraRadiusDeg + moonAngularRadiusDeg) kind = 'penumbral';

	const obscuration =
		kind === 'none'
			? 0
			: kind === 'total'
				? 1
				: overlapFraction(separationDeg, moonAngularRadiusDeg, umbraRadiusDeg);

	const darkening =
		kind === 'none'
			? 0
			: kind === 'penumbral'
				? // The penumbra dims the Moon without a visible bite: a third of the way.
					0.35 * overlapFraction(separationDeg, moonAngularRadiusDeg, penumbraRadiusDeg)
				: obscuration;

	return {
		kind,
		separationDeg,
		umbraRadiusDeg,
		penumbraRadiusDeg,
		moonAngularRadiusDeg,
		obscuration,
		view: { kind, darkening }
	};
}

/* -------------------------------------------------------------------------- */
/* Placing the Moon on its orbit                                              */
/* -------------------------------------------------------------------------- */

export type MoonOrbitFrame = {
	/** `Ω`, the node line's direction in the ecliptic, degrees. */
	nodeDeg: number;
	/** Unit vector along the node line: the Moon's argument of latitude is 0 here. */
	nodeAxis: Vec3;
	/** Unit vector at argument 90°, tilted out of the ecliptic by `i`. */
	perpendicular: Vec3;
	/** The orbit's normal, 5.145° from the ecliptic pole. Sliding uses this axis. */
	normal: Vec3;
	/** The Moon's distance from the Earth's centre, in AU. */
	distanceAu: number;
};

/**
 * The Moon's orbital frame at an instant: the node line and the tilted
 * direction at argument 90°. A point at argument `u` is
 * `distance · (cos u · nodeAxis + sin u · perpendicular)`, which is why the
 * drawn orbit and the placed Moon can never disagree.
 */
export function moonOrbitFrame(instant: Instant): MoonOrbitFrame {
	const nodeDeg = moonAscendingNodeDeg(instant);
	const node = nodeDeg * DEG;
	const inclination = MOON_INCLINATION_DEG * DEG;

	const nodeAxis = { x: Math.cos(node), y: Math.sin(node), z: 0 };
	const perpendicular = {
		x: -Math.sin(node) * Math.cos(inclination),
		y: Math.cos(node) * Math.cos(inclination),
		z: Math.sin(inclination)
	};

	return {
		nodeDeg,
		nodeAxis,
		perpendicular,
		// n × m, already unit length because the two are orthonormal.
		normal: {
			x: nodeAxis.y * perpendicular.z - nodeAxis.z * perpendicular.y,
			y: nodeAxis.z * perpendicular.x - nodeAxis.x * perpendicular.z,
			z: nodeAxis.x * perpendicular.y - nodeAxis.y * perpendicular.x
		},
		distanceAu: length(moonGeocentricPositionAu(instant))
	};
}

/** The argument of latitude of a geocentric position, in degrees (0 … 360). */
export function moonArgumentDeg(instant: Instant, positionAu: Vec3): number {
	const frame = moonOrbitFrame(instant);
	return normalizeDeg(Math.atan2(dot(positionAu, frame.perpendicular), dot(positionAu, frame.nodeAxis)) * RAD);
}

/** A point on the Moon's inclined orbit at an argument of latitude, in AU. */
export function moonOrbitPointAu(instant: Instant, argumentDeg: number): Vec3 {
	const frame = moonOrbitFrame(instant);
	const argument = argumentDeg * DEG;
	return scale(
		add(scale(frame.nodeAxis, Math.cos(argument)), scale(frame.perpendicular, Math.sin(argument))),
		frame.distanceAu
	);
}

/** Rotate a vector about a unit axis (Rodrigues). */
export function rotateAboutAxis(vector: Vec3, axis: Vec3, angleRad: number): Vec3 {
	const cos = Math.cos(angleRad);
	const sin = Math.sin(angleRad);
	const along = dot(axis, vector);
	const cross = {
		x: axis.y * vector.z - axis.z * vector.y,
		y: axis.z * vector.x - axis.x * vector.z,
		z: axis.x * vector.y - axis.y * vector.x
	};

	return {
		x: vector.x * cos + cross.x * sin + axis.x * along * (1 - cos),
		y: vector.y * cos + cross.y * sin + axis.y * along * (1 - cos),
		z: vector.z * cos + cross.z * sin + axis.z * along * (1 - cos)
	};
}

/**
 * The Moon's geocentric position with a placement offset applied.
 *
 * The offset is an extra argument of latitude: rotating the ephemeris Moon about
 * its orbit's **normal** by the offset slides it along its own orbit and changes
 * its ecliptic latitude exactly as the inclined orbit does. (Rotating about the
 * node line would not: that carries the orbit's plane round with the point.)
 * Offset 0 is the ephemeris Moon unchanged, which is what keeps a staged
 * eclipse honest.
 */
export function moonGeocentricAtOffsetAu(instant: Instant, offsetDeg: number): Vec3 {
	const position = moonGeocentricPositionAu(instant);
	if (!Number.isFinite(offsetDeg) || offsetDeg === 0) return position;

	return rotateAboutAxis(position, moonOrbitFrame(instant).normal, offsetDeg * DEG);
}

/** The placement offset the open activity declares, or 0 when it declares none. */
export function moonOrbitOffsetDeg(state: SessionState): number {
	const value = state.settings[MOON_ORBIT_SETTING_KEY];
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Whether a body may be dragged in the space view right now.
 *
 * The sandbox always may. An activity may only when it declares the placement
 * setting: that declaration is the capability, so no chart of activity ids
 * lives in the page.
 */
export function bodyDragEnabled(state: SessionState): boolean {
	if (state.mode === 'sandbox') return true;

	const activity = currentActivity(state);
	return activity?.settings.some((setting) => setting.key === MOON_ORBIT_SETTING_KEY) ?? false;
}

/** The Moon's geocentric position in this session: ephemeris plus placement. */
export function placedMoonGeocentricAu(state: SessionState, instant: Instant): Vec3 {
	return moonGeocentricAtOffsetAu(instant, moonOrbitOffsetDeg(state));
}

/** The Moon's heliocentric position in this session. */
export function placedMoonHeliocentricAu(state: SessionState, instant: Instant): Vec3 {
	return add(earthHeliocentricPositionAu(instant), placedMoonGeocentricAu(state, instant));
}

/**
 * The offset a dropped Moon implies: the dropped direction's argument of
 * latitude minus the ephemeris Moon's. A drag lands anywhere in the drawn
 * frame; only the direction along the orbit is a placement.
 */
export function moonOffsetForPosition(instant: Instant, positionAu: Vec3): number | null {
	if (!(length(positionAu) > 0)) return null;
	const dropped = moonArgumentDeg(instant, positionAu);
	const real = moonArgumentDeg(instant, moonGeocentricPositionAu(instant));
	const offset = ((dropped - real + 540) % 360) - 180;
	return Number.isFinite(offset) ? offset : null;
}

/* -------------------------------------------------------------------------- */
/* The drawn orbit                                                            */
/* -------------------------------------------------------------------------- */

/** How many samples a drawn orbit ring has. Enough at 5.145° to look round. */
export const ORBIT_PATH_SAMPLES = 180;

/** The Moon's inclined orbit, as geocentric samples in AU, oldest first. */
export function moonOrbitPathAu(instant: Instant): Vec3[] {
	return Array.from({ length: ORBIT_PATH_SAMPLES }, (_unused, index) =>
		moonOrbitPointAu(instant, (360 * index) / ORBIT_PATH_SAMPLES)
	);
}

/**
 * The ecliptic reference ring at the Moon's distance.
 *
 * The Earth's orbit lies in the ecliptic plane, so this ring through the Earth
 * *is* that plane made visible where the Moon's orbit lives. The two rings cross
 * at the nodes, and the 5.145° between their planes is what the child sees.
 */
export function eclipticPathAu(instant: Instant): Vec3[] {
	const distance = moonOrbitFrame(instant).distanceAu;
	return Array.from({ length: ORBIT_PATH_SAMPLES }, (_unused, index) => {
		const angle = (2 * Math.PI * index) / ORBIT_PATH_SAMPLES;
		return { x: distance * Math.cos(angle), y: distance * Math.sin(angle), z: 0 };
	});
}

/** The inclination a drawn ring really has, in degrees: the assertion, not a label. */
export function pathInclinationDeg(points: readonly Vec3[]): number | null {
	const first = points[0];
	const second = points[Math.floor(points.length / 4)];
	const third = points[Math.floor(points.length / 2)];
	if (first === undefined || second === undefined || third === undefined) return null;

	const a = subtract(second, first);
	const b = subtract(third, first);
	const normal = unit({
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x
	});
	if (length(normal) === 0) return null;

	return Math.acos(Math.abs(clampUnit(normal.z))) * RAD;
}

/**
 * Fill in the eclipse half of a POV entry: what that observer sees of the Sun.
 *
 * The panel dims by `view.darkening`, so totality is darker than partiality and
 * plain sunlight is untouched — one number, derived here, never in a component.
 */
export function withSolarEclipse(entry: SceneObserver, state: SessionState): SceneObserver {
	if (entry.observer.bodyId !== 'earth' || !state.subsystem.includes('moon')) return entry;

	const eclipse = solarEclipse(
		entry.observer,
		state.instant,
		placedMoonGeocentricAu(state, state.instant)
	);

	return { ...entry, eclipse: eclipse.view };
}

/** The lunar-eclipse half of the Moon's POV entry. */
export function lunarEclipseFor(state: SessionState, moon: SceneMoon | null): SceneMoon | null {
	if (moon === null || !state.subsystem.includes('moon')) return moon;

	const eclipse = lunarEclipse(state.instant, placedMoonGeocentricAu(state, state.instant));
	return { ...moon, eclipse: eclipse.view };
}

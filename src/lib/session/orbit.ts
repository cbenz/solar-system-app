/**
 * Two-body conics from a state vector, and their propagation (ADR-0007).
 *
 * The sandbox edits a body's state vector — a position and a velocity relative
 * to its primary — and the orbit is a **consequence** of that vector, never a
 * stored shape. `orbitFromStateVector` is the one conversion, and
 * `positionAtElapsed` the one propagator: closed-form, so a position stays a
 * pure function of the instant and scrubbing never depends on history.
 *
 * Units follow the session module: AU, days, and a gravitational parameter in
 * AU³/day². All three conic kinds are supported:
 *
 * | kind      | energy | `semiMajorAxisAu` | `periodDays` |
 * |-----------|--------|-------------------|--------------|
 * | ellipse   | < 0    | > 0               | the period   |
 * | parabola  | 0      | `Infinity`        | `null`       |
 * | hyperbola | > 0    | < 0               | `null`       |
 *
 * `e = 1` is decided with a tolerance (1e-9): an escape-velocity vector computed
 * in floating point lands on either side of zero energy, and a "huge ellipse" is
 * physically a parabola. Reporting it as one keeps the escape test honest.
 */

import { dot, length, scale, subtract } from './ephemeris';
import type { Vec3 } from './types';

/** The Sun's gravitational parameter, AU³/day² (Gaussian constant squared). */
export const MU_SUN_AU3_PER_DAY2 = 2.959122082855911e-4;

/** Masses in kilograms, from the published values. */
export const SUN_MASS_KG = 1.98847e30;
export const EARTH_MASS_KG = 5.9722e24;
export const MOON_MASS_KG = 7.342e22;

/** One astronomical unit in kilometres. */
export const AU_KM = 149_597_870.7;

/** AU/day → km/s, so a slider can speak in kilometres per second. */
export const AU_PER_DAY_TO_KM_PER_S = AU_KM / 86_400;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** The eccentricity window in which a conic counts as parabolic. */
const PARABOLIC_TOLERANCE = 1e-9;

export type ConicKind = 'ellipse' | 'parabola' | 'hyperbola';

/**
 * A conic in the ecliptic frame, with the epoch encoded as the offset to
 * periapsis passage. Every angle is in degrees, every distance in AU.
 *
 * `trueAnomalyDeg` is the anomaly at the state vector the orbit was derived
 * from; `periapsisOffsetDays` is the signed time from that epoch to periapsis
 * (negative when periapsis is in the past). Propagation uses the offset, never
 * the anomaly, so it is exact in either direction.
 */
export type ConicOrbit = {
	kind: ConicKind;
	/** Positive for an ellipse, negative for a hyperbola, `Infinity` for a parabola. */
	semiMajorAxisAu: number;
	eccentricity: number;
	inclinationDeg: number;
	ascendingNodeDeg: number;
	argumentOfPeriapsisDeg: number;
	trueAnomalyDeg: number;
	periapsisOffsetDays: number;
	/** `null` when the conic does not close. */
	periodDays: number | null;
	periapsisAu: number;
	/** `null` when the conic does not close. */
	apoapsisAu: number | null;
	semiLatusRectumAu: number;
};

export type StateVector = {
	position: Vec3;
	velocity: Vec3;
	mu: number;
};

export function cross(a: Vec3, b: Vec3): Vec3 {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x
	};
}

function clampUnit(value: number): number {
	return Math.min(1, Math.max(-1, value));
}

/** The gravitational parameter of a primary and a body, in AU³/day². */
export function gravitationalParameter(primaryMassKg: number, bodyMassKg: number): number {
	return MU_SUN_AU3_PER_DAY2 * ((primaryMassKg + bodyMassKg) / SUN_MASS_KG);
}

/** Unit vector, with a fallback for the degenerate zero vector. */
function unitOr(vector: Vec3, fallback: Vec3): Vec3 {
	const size = length(vector);
	return size === 0 ? fallback : scale(vector, 1 / size);
}

/** Rotate an in-plane anomaly to the ecliptic frame; the two basis vectors. */
function planeBasis(orbit: Pick<ConicOrbit, 'ascendingNodeDeg' | 'inclinationDeg' | 'argumentOfPeriapsisDeg'>, trueAnomalyRad: number): { p: Vec3; q: Vec3 } {
	const node = orbit.ascendingNodeDeg * DEG;
	const inclination = orbit.inclinationDeg * DEG;
	const argument = orbit.argumentOfPeriapsisDeg * DEG + trueAnomalyRad;

	const cosNode = Math.cos(node);
	const sinNode = Math.sin(node);
	const cosInclination = Math.cos(inclination);
	const sinInclination = Math.sin(inclination);
	const cosArgument = Math.cos(argument);
	const sinArgument = Math.sin(argument);

	return {
		p: {
			x: cosNode * cosArgument - sinNode * sinArgument * cosInclination,
			y: sinNode * cosArgument + cosNode * sinArgument * cosInclination,
			z: sinArgument * sinInclination
		},
		q: {
			x: -cosNode * sinArgument - sinNode * cosArgument * cosInclination,
			y: -sinNode * sinArgument + cosNode * cosArgument * cosInclination,
			z: cosArgument * sinInclination
		}
	};
}

/**
 * The conic a state vector describes. The orbit is derived, never chosen: the
 * same position and velocity always give the same elements.
 */
export function orbitFromStateVector({ position, velocity, mu }: StateVector): ConicOrbit {
	const r = length(position);
	const v = length(velocity);
	if (!(r > 0) || !(mu > 0)) {
		throw new Error('orbitFromStateVector needs a non-zero position and a positive mu');
	}

	const hVec = cross(position, velocity);
	const h = length(hVec);
	const energy = (v * v) / 2 - mu / r;

	const eVec = subtract(scale(cross(velocity, hVec), 1 / mu), scale(position, 1 / r));
	const eccentricity = length(eVec);

	const kind: ConicKind =
		eccentricity < 1 - PARABOLIC_TOLERANCE
			? 'ellipse'
			: eccentricity > 1 + PARABOLIC_TOLERANCE
				? 'hyperbola'
				: 'parabola';

	const semiMajorAxisAu =
		kind === 'parabola' ? Number.POSITIVE_INFINITY : -mu / (2 * energy);
	const semiLatusRectumAu = (h * h) / mu;
	const periapsisAu = semiLatusRectumAu / (1 + eccentricity);
	const apoapsisAu =
		kind === 'ellipse' ? semiMajorAxisAu * (1 + eccentricity) : null;
	const periodDays =
		kind === 'ellipse' && semiMajorAxisAu > 0
			? 2 * Math.PI * Math.sqrt(semiMajorAxisAu ** 3 / mu)
			: null;

	const inclinationDeg =
		Math.acos(clampUnit(h === 0 ? 1 : hVec.z / h)) * RAD;

	// The node vector ẑ × h. At zero inclination there is no node, and the
	// x-axis of the ecliptic stands in for it; then the periapsis angle is the
	// longitude of periapsis in the plane.
	const nVec = { x: -hVec.y, y: hVec.x, z: 0 };
	const node = Math.hypot(nVec.x, nVec.y);
	const ascendingNodeDeg = node > 1e-12 ? Math.atan2(nVec.y, nVec.x) * RAD : 0;

	// A circular orbit has no periapsis direction; put periapsis at the body, so
	// the round trip through these elements reproduces the position exactly.
	const periapsisDirection =
		eccentricity > 1e-10 ? scale(eVec, 1 / eccentricity) : scale(position, 1 / r);

	const nodeDirection =
		node > 1e-12 ? scale(nVec, 1 / node) : { x: 1, y: 0, z: 0 };
	const hDirection = h === 0 ? { x: 0, y: 0, z: 1 } : scale(hVec, 1 / h);
	const nodeToPeriapsis = cross(nodeDirection, periapsisDirection);
	const argumentOfPeriapsisDeg =
		node > 1e-12
			? Math.atan2(
					dot(nodeToPeriapsis, hDirection),
					dot(nodeDirection, periapsisDirection)
				) * RAD
			: Math.atan2(periapsisDirection.y, periapsisDirection.x) * RAD - ascendingNodeDeg;

	const positionDirection = scale(position, 1 / r);
	const periapsisToPosition = cross(periapsisDirection, positionDirection);
	const trueAnomalyDeg = Math.atan2(
		dot(periapsisToPosition, hDirection),
		dot(periapsisDirection, positionDirection)
	) * RAD;

	const trueAnomalyRad = trueAnomalyDeg * DEG;
	const periapsisOffsetDays = periapsisOffsetFor(
		kind,
		trueAnomalyRad,
		eccentricity,
		semiMajorAxisAu,
		periapsisAu,
		mu
	);

	return {
		kind,
		semiMajorAxisAu,
		eccentricity,
		inclinationDeg,
		ascendingNodeDeg,
		argumentOfPeriapsisDeg,
		trueAnomalyDeg,
		periapsisOffsetDays,
		periodDays,
		periapsisAu,
		apoapsisAu,
		semiLatusRectumAu
	};
}

/** Signed days from the epoch state to periapsis passage. */
function periapsisOffsetFor(
	kind: ConicKind,
	trueAnomalyRad: number,
	eccentricity: number,
	semiMajorAxisAu: number,
	periapsisAu: number,
	mu: number
): number {
	if (kind === 'ellipse') {
		const eccentricAnomalyRad =
			2 *
			Math.atan2(
				Math.sqrt(1 - eccentricity) * Math.sin(trueAnomalyRad / 2),
				Math.sqrt(1 + eccentricity) * Math.cos(trueAnomalyRad / 2)
			);
		const meanAnomalyRad =
			eccentricAnomalyRad - eccentricity * Math.sin(eccentricAnomalyRad);
		const meanMotion = Math.sqrt(mu / semiMajorAxisAu ** 3);
		return -meanAnomalyRad / meanMotion;
	}

	if (kind === 'hyperbola') {
		const hyperbolicAnomalyRad =
			2 *
			Math.atanh(
				Math.sqrt((eccentricity - 1) / (eccentricity + 1)) *
					Math.tan(trueAnomalyRad / 2)
			);
		const meanAnomaly =
			eccentricity * Math.sinh(hyperbolicAnomalyRad) - hyperbolicAnomalyRad;
		const meanMotion = Math.sqrt(mu / Math.abs(semiMajorAxisAu) ** 3);
		return -meanAnomaly / meanMotion;
	}

	const parabolicAnomaly = Math.tan(trueAnomalyRad / 2);
	const timeScale = Math.sqrt((2 * periapsisAu ** 3) / mu);
	return -timeScale * (parabolicAnomaly + parabolicAnomaly ** 3 / 3);
}

/** Position relative to the primary, `elapsedDays` after the state vector. */
export function positionAtElapsed(orbit: ConicOrbit, mu: number, elapsedDays: number): Vec3 {
	const timeSincePeriapsis = elapsedDays - orbit.periapsisOffsetDays;
	const { radiusAu, trueAnomalyRad } = anomalyAt(orbit, mu, timeSincePeriapsis);
	const { p } = planeBasis(orbit, trueAnomalyRad);
	return scale(p, radiusAu);
}

/**
 * The state vector `elapsedDays` after the one the orbit was derived from.
 * Uses the conic's own r, ν and the radial/transverse decomposition of the
 * velocity — valid for all three kinds, with `h = sqrt(mu·p)`.
 */
export function stateVectorAtElapsed(
	orbit: ConicOrbit,
	mu: number,
	elapsedDays: number
): { position: Vec3; velocity: Vec3 } {
	const timeSincePeriapsis = elapsedDays - orbit.periapsisOffsetDays;
	const { radiusAu, trueAnomalyRad } = anomalyAt(orbit, mu, timeSincePeriapsis);
	const { p, q } = planeBasis(orbit, trueAnomalyRad);

	const h = Math.sqrt(mu * orbit.semiLatusRectumAu);
	const radialSpeed =
		(mu / h) * orbit.eccentricity * Math.sin(trueAnomalyRad);
	const transverseSpeed =
		(mu / h) * (1 + orbit.eccentricity * Math.cos(trueAnomalyRad));

	return {
		position: scale(p, radiusAu),
		velocity: {
			x: radialSpeed * p.x + transverseSpeed * q.x,
			y: radialSpeed * p.y + transverseSpeed * q.y,
			z: radialSpeed * p.z + transverseSpeed * q.z
		}
	};
}

function anomalyAt(
	orbit: ConicOrbit,
	mu: number,
	timeSincePeriapsis: number
): { radiusAu: number; trueAnomalyRad: number } {
	if (orbit.kind === 'ellipse') {
		const meanMotion = (2 * Math.PI) / (orbit.periodDays ?? 1);
		const meanAnomaly = meanMotion * timeSincePeriapsis;
		const eccentricAnomaly = eccentricAnomalyFromMean(
			meanAnomaly,
			orbit.eccentricity
		);
		const trueAnomalyRad =
			2 *
			Math.atan2(
				Math.sqrt(1 + orbit.eccentricity) *
					Math.sin(eccentricAnomaly / 2),
				Math.sqrt(1 - orbit.eccentricity) *
					Math.cos(eccentricAnomaly / 2)
			);
		return {
			radiusAu:
				orbit.semiMajorAxisAu *
				(1 - orbit.eccentricity * Math.cos(eccentricAnomaly)),
			trueAnomalyRad
		};
	}

	if (orbit.kind === 'hyperbola') {
		const meanMotion = Math.sqrt(
			mu / Math.abs(orbit.semiMajorAxisAu) ** 3
		);
		const meanAnomaly = meanMotion * timeSincePeriapsis;
		const hyperbolicAnomaly = hyperbolicAnomalyFromMean(
			meanAnomaly,
			orbit.eccentricity
		);
		const trueAnomalyRad =
			2 *
			Math.atan2(
				Math.sqrt(orbit.eccentricity + 1) *
					Math.sinh(hyperbolicAnomaly / 2),
				Math.sqrt(orbit.eccentricity - 1) *
					Math.cosh(hyperbolicAnomaly / 2)
			);
		return {
			radiusAu:
				orbit.semiMajorAxisAu *
				(1 - orbit.eccentricity * Math.cosh(hyperbolicAnomaly)),
			trueAnomalyRad
		};
	}

	// Parabola: Barker's equation, solved in closed form. With D = tan(ν/2),
	// t − t_p = sqrt(2q³/mu)·(D + D³/3); the cubic's root is 2·sinh(u) with
	// 3u = asinh(3A/2).
	const timeScale = Math.sqrt((2 * orbit.periapsisAu ** 3) / mu);
	const a = timeSincePeriapsis / timeScale;
	const u = Math.asinh((3 * a) / 2) / 3;
	const d = 2 * Math.sinh(u);
	return {
		radiusAu: orbit.periapsisAu * (1 + d * d),
		trueAnomalyRad: 2 * Math.atan(d)
	};
}

function eccentricAnomalyFromMean(meanAnomaly: number, eccentricity: number): number {
	let anomaly = eccentricity > 0.8 ? Math.PI : meanAnomaly;

	for (let iteration = 0; iteration < 24; iteration += 1) {
		const residual = anomaly - eccentricity * Math.sin(anomaly) - meanAnomaly;
		const delta = residual / (1 - eccentricity * Math.cos(anomaly));
		anomaly -= delta;
		if (Math.abs(delta) < 1e-13) break;
	}

	return anomaly;
}

function hyperbolicAnomalyFromMean(meanAnomaly: number, eccentricity: number): number {
	let anomaly =
		meanAnomaly >= 0
			? Math.log((2 * Math.abs(meanAnomaly)) / eccentricity + 1.8)
			: -Math.log((2 * Math.abs(meanAnomaly)) / eccentricity + 1.8);
	if (!Number.isFinite(anomaly)) anomaly = 0;

	for (let iteration = 0; iteration < 32; iteration += 1) {
		const residual =
			eccentricity * Math.sinh(anomaly) - anomaly - meanAnomaly;
		const delta =
			residual / (eccentricity * Math.cosh(anomaly) - 1);
		anomaly -= delta;
		if (Math.abs(delta) < 1e-13) break;
	}

	return anomaly;
}

/** The speed at a radius, from vis-viva (valid for every conic kind). */
export function speedAtRadius(orbit: ConicOrbit, mu: number, radiusAu: number): number {
	const inverseSemiMajorAxis =
		orbit.kind === 'parabola' ? 0 : 1 / orbit.semiMajorAxisAu;
	return Math.sqrt(mu * (2 / radiusAu - inverseSemiMajorAxis));
}

/** The speed that leaves the orbit and never returns, at a radius. */
export function escapeSpeedAtRadius(mu: number, radiusAu: number): number {
	return Math.sqrt((2 * mu) / radiusAu);
}

export { unitOr };

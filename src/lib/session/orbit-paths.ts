/**
 * Orbit rings for the space view (ticket 14).
 *
 * The activity names which rings to draw (it is data, like `latitudeCircles`);
 * the geometry is the session's. Two of the rings are the point of the act:
 *
 * - `moon-orbit` is the Moon's orbit, sampled from the same inclined frame and
 *   the same distance the Moon is placed in, so the drawn ring and the drawn
 *   Moon cannot disagree;
 * - `ecliptic` is the Earth's orbital plane drawn where the Moon's orbit lives:
 *   a circle through the Earth in the `z = 0` plane, at the Moon's distance. The
 *   Earth's orbit *is* that plane, and two rings through the nodes show the
 *   5.145° between the planes better than any caption.
 * - `earth-orbit` is the Earth's orbit around the Sun itself, one year of true
 *   positions, so the child can see the Moon's orbit is a small thing carried
 *   along a big, almost-flat one.
 *
 * Samples are **relative to the Earth**, in true AU, like every other position
 * in the session module. Each ring carries the distance factor of the body it
 * belongs to, so the renderer only multiplies (ADR-0003).
 */

import { currentActivity } from './camera';
import { eclipticPathAu, moonOrbitPathAu } from './eclipse';
import { earthHeliocentricPositionAu } from './ephemeris';
import { MS_PER_DAY } from './time';
import { bodyScale } from './scale';
import type { Instant, SceneOrbitPath, SessionState, Vec3 } from './types';

/** Samples of the Earth's orbit around the Sun. A year is a closed loop. */
export const EARTH_ORBIT_SAMPLES = 128;

const YEAR_DAYS = 365.256363;

/** The Earth's orbit, as positions relative to the Earth's own position now. */
function earthOrbitPathAu(instant: Instant): Vec3[] {
	const now = earthHeliocentricPositionAu(instant);
	const samples: Vec3[] = [];

	for (let index = 0; index < EARTH_ORBIT_SAMPLES; index += 1) {
		const instantAt = instant + (index / EARTH_ORBIT_SAMPLES) * YEAR_DAYS * MS_PER_DAY;
		const position = earthHeliocentricPositionAu(instantAt);
		samples.push({
			x: position.x - now.x,
			y: position.y - now.y,
			z: position.z - now.z
		});
	}

	return samples;
}

/**
 * The rings this state draws: the open activity's declared paths, plus nothing.
 * Outside an activity the scene draws no orbit at all, which is the sandbox's
 * existing look.
 */
export function orbitPathsFor(state: SessionState): SceneOrbitPath[] {
	const activity = currentActivity(state);
	const specs = activity?.orbitPaths ?? [];
	if (specs.length === 0) return [];

	const earthFactor = bodyScale(state.trueDistance, state.trueSize, 'earth').distanceFactor;
	const moonFactor = bodyScale(state.trueDistance, state.trueSize, 'moon').distanceFactor;

	return specs.map((spec) => {
		switch (spec.kind) {
			case 'moon-orbit':
				return {
					id: spec.id,
					kind: spec.kind,
					points: moonOrbitPathAu(state.instant),
					distanceFactor: moonFactor
				};
			case 'ecliptic':
				return {
					id: spec.id,
					kind: spec.kind,
					points: eclipticPathAu(state.instant),
					distanceFactor: moonFactor
				};
			case 'earth-orbit':
				return {
					id: spec.id,
					kind: spec.kind,
					points: earthOrbitPathAu(state.instant),
					distanceFactor: earthFactor
				};
		}
	});
}

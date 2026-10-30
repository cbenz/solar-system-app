/**
 * The visibility limit: whether the eye could actually see a body from a given
 * point on the ground, given its apparent magnitude and angular size.
 *
 * This is a **deliberate heuristic**, not an ephemeris (ASTRONOMY.md §6.3). It
 * answers a different question from "is the body in the scene": a body can be
 * present in the scene and above the horizon and still be invisible to the eye.
 * The glossary's words are the rule — the visibility limit is *distinct from
 * whether the body is present in the scene*.
 *
 * The predicate, in this order:
 *
 * 1. above the horizon: elevation > 0;
 * 2. not lost in daylight: if the Sun is up, the body must beat `−4` — the Moon
 *    survives a bright sky, a star does not;
 * 3. extinction near the horizon: `m_eff = m + 0.2·(X − 1)` with the airmass
 *    `X = 1/sin(h)`, capped at the airmass of 10° so the horizon does not blow
 *    up;
 * 4. the limiting magnitude: `m_eff < LIMITING_MAGNITUDE`;
 * 5. the angular floor: a body smaller than what the eye resolves is not drawn.
 *
 * Rule 2 is the one people forget: a half Moon of magnitude −10 is plainly
 * visible at 10 a.m., so a limit that only looked at magnitude would hide it.
 */


/**
 * The naked-eye limiting magnitude at a dark site (Bortle 1–2). Suburban skies
 * are closer to 4.5; the number is the setting's own definition, so it only has
 * to be consistent, not almanac-exact (ASTRONOMY.md §6.3).
 */
export const LIMITING_MAGNITUDE = 6.0;

/**
 * Below this apparent angular diameter, in degrees, a body is under what the
 * unaided eye resolves. For scale: the real Moon is always between 0.49° and
 * 0.56°, so the floor never hides it in practice; it guards the degenerate
 * case, where a body shrinks to a point.
 */
export const MIN_VISIBLE_ANGULAR_DIAMETER_DEG = 0.1;

/** The Sun's apparent magnitude, a published constant (ASTRONOMY.md §6.3). */
export const SUN_APPARENT_MAGNITUDE = -26.74;

/** Below this magnitude a body is washed out while the Sun is up. */
const DAYLIGHT_MAGNITUDE = -4;

/** Everything the predicate needs about one body seen from one point. */
export type VisibilityInput = {
	/** The body's altitude above the observer's horizon, in degrees. */
	elevationDeg: number;
	/** The Sun's altitude above the same horizon, in degrees. */
	sunElevationDeg: number;
	/** Apparent magnitude, or null when the session models none for this body. */
	apparentMagnitude: number | null;
	/** Apparent angular diameter, or null when the session models none. */
	angularDiameterDeg: number | null;
};

/** The airmass correction: `0.2·(X − 1)` magnitudes, capped at 10° altitude. */
function extinctionMagnitudes(elevationDeg: number): number {
	const airmassCap = Math.sin(10 * (Math.PI / 180));
	const airmass = 1 / Math.max(Math.sin(elevationDeg * (Math.PI / 180)), airmassCap);

	return 0.2 * (airmass - 1);
}

/**
 * Could the eye see this body? `false` when the visibility limit rules it out.
 *
 * A null magnitude or angular size means the session does not model it (the
 * Earth seen from the Moon, say); the limit cannot rule out what it does not
 * know, so it leaves that body to rule 1 alone.
 */
export function isAboveVisibilityLimit(input: VisibilityInput): boolean {
	if (!(input.elevationDeg > 0)) return false;

	if (
		input.angularDiameterDeg !== null &&
		!(input.angularDiameterDeg > MIN_VISIBLE_ANGULAR_DIAMETER_DEG)
	) {
		return false;
	}

	if (input.apparentMagnitude === null) return true;

	if (input.sunElevationDeg > 0 && !(input.apparentMagnitude < DAYLIGHT_MAGNITUDE)) return false;

	const effective = input.apparentMagnitude + extinctionMagnitudes(input.elevationDeg);

	return effective < LIMITING_MAGNITUDE;
}

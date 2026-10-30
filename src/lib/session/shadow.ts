/**
 * The gnomon: a vertical stick on the observer's ground and the shadow it casts.
 *
 * ASTRONOMY.md §3.5. The shadow of a vertical stick points **away from the
 * Sun's azimuth** — `A_shadow = A_sun + 180°` — and its length is
 * `stickHeight / tan(sunElevation)`. That is the whole geometry: one elevation,
 * one azimuth, both already derived from the same dot product the terminator
 * and the POV use (`observers.ts`). Nothing here is a second lighting model.
 *
 * The length is a *factor*, a multiple of the stick's height, never a distance
 * in metres: the stick has no size in the model, it is a reference height.
 *
 * The factor is clamped at `MAX_SHADOW_LENGTH_FACTOR`. The real factor is
 * infinite at and below the horizon; the clamp is what sunrise looks like — the
 * shadow leaves the panel instead of reaching infinity. Below the horizon there
 * is no shadow at all, and the azimuth is `null` so no renderer can draw one.
 *
 * The POV panel is 2D (`sky.ts`), so the last part of this file maps the factor
 * and azimuth onto the panel's ground area. It saturates the drawn length with
 * `factor / (factor + SHADOW_SATURATION_FACTOR)`: a very long shadow reaches the
 * horizon and stops, instead of stretching into a smear. The mapping is pure and
 * the component only strokes the polygon it returns.
 */

import { normalizeDeg, solarDeclinationDeg } from './ephemeris';
import { sunAzimuthDeg, sunElevationDeg } from './observers';
import { horizonY, type SkyViewport } from './sky';
import type { Instant, Observer } from './types';

const DEG = Math.PI / 180;

/**
 * The largest shadow the model reports, as a multiple of the stick's height.
 * Just above the horizon the true factor is enormous; 50 is the documented cap
 * (about 1.15° of Sun elevation), far past the edge of the POV's ground.
 */
export const MAX_SHADOW_LENGTH_FACTOR = 50;

/**
 * How quickly the drawn shadow approaches the horizon. A factor of 1.5 draws a
 * shadow about half-way to the horizon; the cap draws it almost there.
 */
export const SHADOW_SATURATION_FACTOR = 1.5;

/** Guards the relative measure when the noon shadow vanishes at the zenith. */
export const SHORTEST_SHADOW_FLOOR = 0.05;

export type ShadowGeometry = {
	/** The Sun's elevation above the observer's horizon, degrees. */
	sunElevationDeg: number;
	/** The shadow's length as a multiple of the stick's height, clamped. */
	shadowLengthFactor: number;
	/** Where the shadow points, clockwise from north; `null` when there is none. */
	shadowAzimuthDeg: number | null;
};

/**
 * The shadow of a vertical stick at `latitudeDeg` and `instant`.
 *
 * Latitude alone is enough: longitude is a convention that the observer's
 * rotation carries, and the shadow is about the observer's own ground.
 */
export function shadowGeometry(latitudeDeg: number, instant: Instant): ShadowGeometry {
	const observer: Observer = {
		id: 'gnomon',
		bodyId: 'earth',
		latitudeDeg,
		colour: '#000000'
	};
	const elevation = sunElevationDeg(observer, instant);

	if (elevation <= 0) {
		return {
			sunElevationDeg: elevation,
			shadowLengthFactor: MAX_SHADOW_LENGTH_FACTOR,
			shadowAzimuthDeg: null
		};
	}

	const factor = Math.min(1 / Math.tan(elevation * DEG), MAX_SHADOW_LENGTH_FACTOR);

	return {
		sunElevationDeg: elevation,
		shadowLengthFactor: factor,
		// The shadow points away from the Sun, so a morning Sun in the east casts
		// a shadow to the west.
		shadowAzimuthDeg: normalizeDeg(sunAzimuthDeg(observer, instant) + 180)
	};
}

/**
 * The Sun's greatest elevation on the day around `instant`, from the day's
 * declination: `90° − |φ − δ|`. That maximum is local solar noon, which is why
 * it also gives the day's shortest shadow.
 */
export function maxSunElevationDeg(latitudeDeg: number, instant: Instant): number {
	return 90 - Math.abs(latitudeDeg - solarDeclinationDeg(instant));
}

/**
 * The shadow factor at local solar noon, i.e. the day's shortest shadow.
 * Infinite when the Sun does not rise, so a polar night is never mistaken for
 * a short shadow.
 */
export function shortestShadowLengthFactor(latitudeDeg: number, instant: Instant): number {
	const maxElevation = maxSunElevationDeg(latitudeDeg, instant);
	if (maxElevation <= 0) return Number.POSITIVE_INFINITY;
	return Math.min(1 / Math.tan(maxElevation * DEG), MAX_SHADOW_LENGTH_FACTOR);
}

/**
 * How much longer the shadow is than the day's shortest, relative to that
 * shortest: `0` at solar noon, positive everywhere else, `Infinity` when there
 * is no shadow to measure. The mission's continuous measure reads this.
 */
export function shadowExcessAt(latitudeDeg: number, instant: Instant): number {
	const geometry = shadowGeometry(latitudeDeg, instant);
	if (geometry.shadowAzimuthDeg === null) return Number.POSITIVE_INFINITY;

	const shortest = shortestShadowLengthFactor(latitudeDeg, instant);
	if (!Number.isFinite(shortest)) return Number.POSITIVE_INFINITY;

	return (geometry.shadowLengthFactor - shortest) / Math.max(shortest, SHORTEST_SHADOW_FLOOR);
}

export type GnomonPoint = { x: number; y: number };

/**
 * The stick and its ground shadow as the POV panel draws them.
 *
 * `stick` is a vertical glyph standing on its base; `shadow` is a tapered quad
 * whose far end moves away from the base in the shadow's azimuth direction.
 * `null` means there is no shadow (the Sun is down).
 */
export type GnomonGlyph = {
	stick: { x: number; baseY: number; topY: number; halfWidth: number };
	shadow: {
		baseLeft: GnomonPoint;
		baseRight: GnomonPoint;
		tipLeft: GnomonPoint;
		tipRight: GnomonPoint;
	} | null;
};

/**
 * Map the shadow onto the POV panel's ground area.
 *
 * The azimuth uses the same panorama as `skyToScreen`: 0° (north) is the left
 * edge, 180° (south) the centre, 360° the left edge again. The shadow therefore
 * points away from the Sun on screen as it does in the sky, and the child can
 * compare the two without a second coordinate system.
 */
export function gnomonScreen(
	shadow: Pick<ShadowGeometry, 'shadowLengthFactor' | 'shadowAzimuthDeg'>,
	viewport: SkyViewport
): GnomonGlyph {
	const { width, height } = viewport;
	const horizon = horizonY(height);
	const groundHeight = Math.max(height - horizon, 1);

	const baseX = width / 2;
	const baseY = horizon + groundHeight * 0.78;
	const halfWidth = Math.max(1.5, Math.min(width, height) * 0.008);
	const stickHeight = Math.min(groundHeight * 0.6, width * 0.24);

	const stick = { x: baseX, baseY, topY: baseY - stickHeight, halfWidth };

	if (shadow.shadowAzimuthDeg === null) return { stick, shadow: null };

	const azimuth = ((shadow.shadowAzimuthDeg % 360) + 360) % 360;
	// The far direction is the horizon point with the same azimuth, so the
	// shadow's drawn direction agrees with where the sky draws the Sun.
	const farX = (azimuth / 360) * width;
	const farY = horizon + groundHeight * 0.02;

	const factor = Math.max(0, shadow.shadowLengthFactor);
	const reach = factor / (factor + SHADOW_SATURATION_FACTOR);
	const tipX = baseX + (farX - baseX) * reach;
	const tipY = baseY + (farY - baseY) * reach;
	const tipHalfWidth = Math.max(0.5, halfWidth * (1 - reach * 0.75));

	return {
		stick,
		shadow: {
			baseLeft: { x: baseX - halfWidth, y: baseY },
			baseRight: { x: baseX + halfWidth, y: baseY },
			tipLeft: { x: tipX - tipHalfWidth, y: tipY },
			tipRight: { x: tipX + tipHalfWidth, y: tipY }
		}
	};
}

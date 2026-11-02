/**
 * The POV sky's only piece of geometry: mapping an altitude and an azimuth to a
 * pixel. Pure, so it is tested without a browser and the component stays a dumb
 * mapper.
 *
 * The panel is a cylindrical panorama: azimuth 0° (north) is the left edge,
 * 180° (south) the centre, 360° wraps to the left edge again. Altitude 90° is
 * the top, altitude 0° the horizon line at `HORIZON_FRACTION` of the height.
 * Altitudes below the horizon map into the ground and clamp at the bottom, so a
 * setting Sun stays visible below the horizon instead of disappearing.
 */

export type SkyViewport = { width: number; height: number };
export type SkyPoint = { x: number; y: number };

export const HORIZON_FRACTION = 0.68;

export function horizonY(height: number): number {
	return height * HORIZON_FRACTION;
}

export function skyToScreen(
	altitudeDeg: number,
	azimuthDeg: number,
	viewport: SkyViewport
): SkyPoint {
	const horizon = horizonY(viewport.height);
	const azimuth = ((azimuthDeg % 360) + 360) % 360;
	const x = (azimuth / 360) * viewport.width;

	if (altitudeDeg >= 0) {
		const altitude = Math.min(altitudeDeg, 90);
		return { x, y: horizon - (altitude / 90) * horizon };
	}

	const depth = Math.min(-altitudeDeg, 90);
	return { x, y: horizon + (depth / 90) * (viewport.height - horizon) };
}

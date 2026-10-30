/**
 * Snapping the scrubber to interesting instants.
 *
 * Pure and span-free: the component owns the pixels, this owns the rule. A snap
 * point captures the drag when the instant is within `ratio` × half the gap to
 * its nearest neighbouring snap point — so a dense cluster (a day's sunrise and
 * sunset) captures tightly and a lone seasonal point captures generously, with
 * no knowledge of the track's width.
 */

import type { Instant } from './types';

export type SnapKind = 'equinox' | 'solstice' | 'perihelion' | 'aphelion' | 'sunrise' | 'sunset';

export type SnapPoint = {
	instant: Instant;
	kind: SnapKind;
};

/** Default capture strength, as a fraction of the local half-gap. */
export const DEFAULT_SNAP_RATIO = 0.3;

/**
 * Snap an instant onto the nearest interesting one when it is close enough.
 *
 * `ratio` is a fraction in [0, 1]: 0 disables snapping, 1 captures the whole
 * local gap. A lone snap point has no neighbour to measure a gap against, so it
 * never captures (nothing else on the track could compete with it anyway).
 * Ties on distance go to the earlier instant, which keeps the result stable.
 */
export function snap(
	instant: Instant,
	snapPoints: readonly SnapPoint[],
	ratio: number = DEFAULT_SNAP_RATIO
): Instant {
	if (!Number.isFinite(instant)) return instant;
	if (!Number.isFinite(ratio) || ratio <= 0) return instant;
	if (snapPoints.length < 2) return instant;

	const sorted = snapPoints.slice().sort((a, b) => a.instant - b.instant);

	let best: SnapPoint | null = null;
	let bestDistance = Infinity;

	for (let index = 0; index < sorted.length; index += 1) {
		const point = sorted[index];
		if (point === undefined) continue;

		const previous = sorted[index - 1];
		const next = sorted[index + 1];
		const leftGap = previous === undefined ? Infinity : point.instant - previous.instant;
		const rightGap = next === undefined ? Infinity : next.instant - point.instant;
		const nearestGap = Math.min(leftGap, rightGap);
		const reach = (Math.min(ratio, 1) * nearestGap) / 2;
		const distance = Math.abs(instant - point.instant);

		if (distance <= reach && distance < bestDistance) {
			best = point;
			bestDistance = distance;
		}
	}

	return best === null ? instant : best.instant;
}

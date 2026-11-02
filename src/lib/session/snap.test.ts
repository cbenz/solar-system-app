import { describe, expect, it } from 'vitest';
import { DEFAULT_SNAP_RATIO, snap, type SnapPoint } from './snap';

const DAY = 86_400_000;
const ORIGIN = Date.parse('2025-01-01T00:00:00Z');

function at(daysFromOrigin: number, kind: SnapPoint['kind'] = 'solstice'): SnapPoint {
	return { instant: ORIGIN + daysFromOrigin * DAY, kind };
}

/** Four seasonal points a quarter apart, the common case for a year's span. */
const SEASONS: SnapPoint[] = [at(0, 'equinox'), at(91.31), at(182.62, 'equinox'), at(273.93)];

describe('snapping', () => {
	it('pulls an instant near an interesting one onto it', () => {
		const nearSolstice = at(91.31 + 4).instant;
		const snapped = snap(nearSolstice, SEASONS, 0.3);

		expect(snapped).toBe(SEASONS[1]?.instant);
	});

	it('leaves an instant far from every snap point alone', () => {
		const midpoint = at(45).instant;

		expect(snap(midpoint, SEASONS, 0.3)).toBe(midpoint);
	});

	it('never moves an instant that already sits on a snap point', () => {
		for (const point of SEASONS) {
			expect(snap(point.instant, SEASONS, 0.3)).toBe(point.instant);
		}
	});

	it('does not move anything at ratio 0', () => {
		const nearSolstice = at(91.31 + 10).instant;

		expect(snap(nearSolstice, SEASONS, 0)).toBe(nearSolstice);
	});

	it('captures more of the track at a bigger ratio', () => {
		const instant = at(91.31 + 20).instant;

		expect(snap(instant, SEASONS, 0.1)).toBe(instant);
		expect(snap(instant, SEASONS, 0.9)).toBe(SEASONS[1]?.instant);
	});

	it('is a no-op on an empty list or a lone point', () => {
		const instant = at(10).instant;

		expect(snap(instant, [], DEFAULT_SNAP_RATIO)).toBe(instant);
		expect(snap(instant, [at(10.1)], DEFAULT_SNAP_RATIO)).toBe(instant);
	});

	it('takes the nearest point when two are in reach', () => {
		const close = [at(10), at(10.2)];
		const instant = at(10.13).instant;

		expect(snap(instant, close, 0.9)).toBe(close[1]?.instant);
	});

	it('is stable and does not mutate the list it is given', () => {
		const shuffled = [SEASONS[2], SEASONS[0], SEASONS[3], SEASONS[1]] as SnapPoint[];
		const copy = shuffled.slice();
		const instant = at(91.5).instant;

		expect(snap(instant, shuffled, 0.3)).toBe(snap(instant, shuffled, 0.3));
		expect(shuffled).toEqual(copy);
	});

	it('leaves a non-finite instant alone rather than producing NaN', () => {
		expect(snap(Number.NaN, SEASONS, 0.3)).toBeNaN();
		expect(snap(Number.POSITIVE_INFINITY, SEASONS, 0.3)).toBe(Number.POSITIVE_INFINITY);
	});

	it('captures symmetrically around a snap point', () => {
		const target = SEASONS[1]?.instant ?? 0;

		expect(snap(target - 5 * DAY, SEASONS, 0.3)).toBe(target);
		expect(snap(target + 5 * DAY, SEASONS, 0.3)).toBe(target);
	});
});

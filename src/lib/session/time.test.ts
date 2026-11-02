import { describe, expect, it } from 'vitest';
import {
	MS_PER_DAY,
	advanceInstant,
	clampInstant,
	hasReachedEnd,
	instantAtRatio,
	ratioOfInstant,
	sandboxSpan,
	spanLabelKey,
	utcYear
} from './time';

const SPAN = { fromInstant: Date.parse('2025-01-01T00:00:00Z'), toInstant: Date.parse('2026-01-01T00:00:00Z') };

describe('the track ratio', () => {
	it('maps the span start to 0 and its end to 1', () => {
		expect(ratioOfInstant(SPAN.fromInstant, SPAN)).toBe(0);
		expect(ratioOfInstant(SPAN.toInstant, SPAN)).toBe(1);
	});

	it('maps 0 and 1 back to the span bounds', () => {
		expect(instantAtRatio(0, SPAN)).toBe(SPAN.fromInstant);
		expect(instantAtRatio(1, SPAN)).toBe(SPAN.toInstant);
	});

	it('round-trips every ratio it is given', () => {
		for (const ratio of [0, 0.1, 0.25, 0.5, 0.73, 1]) {
			expect(ratioOfInstant(instantAtRatio(ratio, SPAN), SPAN)).toBeCloseTo(ratio, 12);
		}
	});

	it('clamps ratios outside the track instead of extrapolating', () => {
		expect(instantAtRatio(-0.5, SPAN)).toBe(SPAN.fromInstant);
		expect(instantAtRatio(2, SPAN)).toBe(SPAN.toInstant);
		expect(instantAtRatio(Number.NaN, SPAN)).toBe(SPAN.fromInstant);
	});

	it('collapses a degenerate span onto its start', () => {
		const degenerate = { fromInstant: SPAN.fromInstant, toInstant: SPAN.fromInstant };

		expect(ratioOfInstant(SPAN.fromInstant + MS_PER_DAY, degenerate)).toBe(0);
		expect(instantAtRatio(0.5, degenerate)).toBe(degenerate.fromInstant);
	});
});

describe('clamping an instant', () => {
	it('keeps an instant inside the span unchanged', () => {
		const instant = Date.parse('2025-06-01T00:00:00Z');
		expect(clampInstant(instant, SPAN)).toBe(instant);
	});

	it('pulls instants outside the span back onto its bounds', () => {
		expect(clampInstant(SPAN.fromInstant - MS_PER_DAY, SPAN)).toBe(SPAN.fromInstant);
		expect(clampInstant(SPAN.toInstant + MS_PER_DAY, SPAN)).toBe(SPAN.toInstant);
	});
});

describe('a playback tick', () => {
	it('advances one simulated day per real second at the default speed', () => {
		const start = SPAN.fromInstant;
		const next = advanceInstant(start, 1000, 1, SPAN);

		expect(next - start).toBe(MS_PER_DAY);
	});

	it('advances further at a faster setting', () => {
		const slow = advanceInstant(SPAN.fromInstant, 1000, 1, SPAN) - SPAN.fromInstant;
		const fast = advanceInstant(SPAN.fromInstant, 1000, 4, SPAN) - SPAN.fromInstant;

		expect(fast).toBe(slow * 4);
	});

	it('stops at the end of the span rather than wrapping', () => {
		const nearEnd = SPAN.toInstant - 3_600_000;
		const next = advanceInstant(nearEnd, 1000, 30, SPAN);

		expect(next).toBe(SPAN.toInstant);
		expect(hasReachedEnd(next, SPAN)).toBe(true);
	});

	it('does not move on a zero, negative or non-finite elapsed time', () => {
		const start = Date.parse('2025-04-01T00:00:00Z');

		expect(advanceInstant(start, 0, 1, SPAN)).toBe(start);
		expect(advanceInstant(start, -16, 1, SPAN)).toBe(start);
		expect(advanceInstant(start, Number.NaN, 1, SPAN)).toBe(start);
		expect(advanceInstant(start, 16, 0, SPAN)).toBe(start);
	});
});

describe('the span in words', () => {
	it('names a year for a year-long span', () => {
		expect(spanLabelKey(sandboxSpan(2025))).toBe('time.span.year');
	});

	it('names a month for a 30-day span', () => {
		const from = SPAN.fromInstant;
		expect(spanLabelKey({ fromInstant: from, toInstant: from + 30 * MS_PER_DAY })).toBe(
			'time.span.month'
		);
	});

	it('names a week for a week', () => {
		const from = SPAN.fromInstant;
		expect(spanLabelKey({ fromInstant: from, toInstant: from + 7 * MS_PER_DAY })).toBe(
			'time.span.week'
		);
	});

	it('names a day and a half for a short span', () => {
		const from = SPAN.fromInstant;
		expect(spanLabelKey({ fromInstant: from, toInstant: from + 1.5 * MS_PER_DAY })).toBe(
			'time.span.dayAndHalf'
		);
	});

	it('builds a one-year sandbox span that starts and ends at midnight UTC', () => {
		const span = sandboxSpan(2025);

		expect(new Date(span.fromInstant).toISOString()).toBe('2025-01-01T00:00:00.000Z');
		expect(new Date(span.toInstant).toISOString()).toBe('2026-01-01T00:00:00.000Z');
	});
});


describe('the calendar year', () => {
	it('is derived from the instant, including across a year boundary', () => {
		expect(utcYear(Date.UTC(2025, 0, 1))).toBe(2025);
		expect(utcYear(Date.UTC(2025, 11, 31, 23, 59, 59))).toBe(2025);
		expect(utcYear(Date.UTC(2026, 0, 1))).toBe(2026);
		expect(utcYear(Date.UTC(2024, 1, 29))).toBe(2024);
		expect(utcYear(Date.UTC(2000, 2, 1))).toBe(2000);
	});
});

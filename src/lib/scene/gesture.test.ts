import { describe, expect, it } from 'vitest';
import {
	EMPTY_GESTURE,
	reduceGesture,
	type GestureDelta,
	type GestureState,
	type PointerInput
} from './gesture';

const ZERO: GestureDelta = { yaw: 0, pitch: 0, zoom: 1 };

function apply(state: GestureState, input: PointerInput) {
	return reduceGesture(state, input);
}

function down(state: GestureState, pointerId: number, x: number, y: number) {
	return apply(state, { phase: 'down', pointerId, position: { x, y } });
}

function move(state: GestureState, pointerId: number, x: number, y: number) {
	return apply(state, { phase: 'move', pointerId, position: { x, y } });
}

function up(state: GestureState, pointerId: number, x: number, y: number) {
	return apply(state, { phase: 'up', pointerId, position: { x, y } });
}

describe('one-finger drag', () => {
	it('turns the Earth in the direction the finger travels', () => {
		const pressed = down(EMPTY_GESTURE, 1, 100, 100).state;
		const dragged = move(pressed, 1, 140, 100);

		expect(dragged.delta.yaw).toBeGreaterThan(0);
		expect(dragged.delta.zoom).toBe(1);
	});

	it('turns twice as far when the finger travels twice as far', () => {
		const pressed = down(EMPTY_GESTURE, 1, 100, 100).state;
		const short = move(pressed, 1, 110, 100).delta.yaw;
		const long = move(pressed, 1, 120, 100).delta.yaw;

		expect(long).toBeCloseTo(short * 2);
	});

	it('pitches the Earth on a vertical drag and does not spin it', () => {
		const pressed = down(EMPTY_GESTURE, 1, 100, 100).state;
		const dragged = move(pressed, 1, 100, 130);

		expect(dragged.delta.pitch).toBeGreaterThan(0);
		expect(dragged.delta.yaw).toBe(0);
	});

	it('ignores a move from a pointer that was never pressed', () => {
		const result = move(EMPTY_GESTURE, 7, 50, 50);

		expect(result.state.pointers).toHaveLength(0);
		expect(result.delta).toEqual(ZERO);
	});
});

describe('two-finger pinch', () => {
	function twoFingers() {
		const first = down(EMPTY_GESTURE, 1, 100, 100).state;
		return down(first, 2, 200, 100).state;
	}

	it('does not move the Earth when the second finger lands', () => {
		const result = down(down(EMPTY_GESTURE, 1, 100, 100).state, 2, 200, 100);

		expect(result.delta).toEqual(ZERO);
	});

	it('reports no zoom until the pinch has a baseline to measure against', () => {
		const result = move(twoFingers(), 2, 250, 100);

		expect(result.delta.zoom).toBe(1);
		expect(result.delta.yaw).toBe(0);
	});

	it('zooms out when the fingers spread apart', () => {
		const firstMove = move(twoFingers(), 2, 200, 100).state;
		const spread = move(firstMove, 2, 300, 100);

		expect(spread.delta.zoom).toBeCloseTo(2);
		expect(spread.delta.yaw).toBe(0);
	});

	it('zooms in when the fingers come together', () => {
		const firstMove = move(twoFingers(), 2, 200, 100).state;
		const pinched = move(firstMove, 2, 150, 100);

		expect(pinched.delta.zoom).toBeCloseTo(0.5);
	});
});

describe('changing the number of fingers', () => {
	it('resumes one-finger rotation without a jump after the second finger lifts', () => {
		const pressed = down(EMPTY_GESTURE, 1, 100, 100).state;
		const pinching = down(pressed, 2, 200, 100).state;
		const lifted = up(pinching, 2, 200, 100).state;

		expect(lifted.pointers).toHaveLength(1);

		const dragged = move(lifted, 1, 110, 100);

		expect(dragged.delta.zoom).toBe(1);
		expect(dragged.delta.yaw).toBeGreaterThan(0);
	});

	it('forgets every pointer once all fingers have lifted', () => {
		const pressed = down(down(EMPTY_GESTURE, 1, 0, 0).state, 2, 50, 0).state;
		const one = up(pressed, 1, 0, 0).state;
		const none = up(one, 2, 50, 0).state;

		expect(none.pointers).toHaveLength(0);
	});

	it('treats a cancelled pointer as lifted', () => {
		const pressed = down(EMPTY_GESTURE, 1, 0, 0).state;
		const cancelled = apply(pressed, { phase: 'cancel', pointerId: 1, position: { x: 0, y: 0 } });

		expect(cancelled.state.pointers).toHaveLength(0);
	});
});

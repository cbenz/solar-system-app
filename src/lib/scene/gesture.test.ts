import { describe, expect, it } from 'vitest';
import {
	EMPTY_GESTURE,
	cameraControlsEnabled,
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

describe('placing an observer freezes the camera', () => {
	const ZERO_DELTA: GestureDelta = { yaw: 0, pitch: 0, zoom: 1 };
	const observerHit = { kind: 'observer' as const, observerId: 'pov-1' };
	const globeHit = (latitudeDeg: number) => ({ kind: 'globe' as const, latitudeDeg });

	function press(hit: { kind: 'observer'; observerId: string } | { kind: 'globe'; latitudeDeg: number } | { kind: 'miss' }, x = 100, y = 100) {
		return apply(EMPTY_GESTURE, { phase: 'down', pointerId: 1, position: { x, y }, hit });
	}

	function drag(state: GestureState, x: number, y: number, latitudeDeg?: number) {
		return apply(state, { phase: 'move', pointerId: 1, position: { x, y }, latitudeDeg });
	}

	function release(state: GestureState, x = 100, y = 100) {
		return apply(state, { phase: 'up', pointerId: 1, position: { x, y } });
	}

	it('suppresses orbit and zoom from the moment a tap starts', () => {
		const pressed = press(globeHit(12));

		expect(cameraControlsEnabled(pressed.state)).toBe(false);
		expect(pressed.delta).toEqual(ZERO_DELTA);
	});

	it('places once on release, at the latitude that was tapped', () => {
		const pressed = press(globeHit(12));
		const slid = drag(pressed.state, 102, 101);
		const released = release(slid.state, 102, 101);

		expect(slid.delta).toEqual(ZERO_DELTA);
		expect(slid.placement).toBeNull();
		expect(released.placement).toEqual({ kind: 'place', latitudeDeg: 12 });
		expect(cameraControlsEnabled(released.state)).toBe(true);
	});

	it('moves the grabbed observer along its meridian and never the camera', () => {
		const pressed = press(observerHit);
		expect(cameraControlsEnabled(pressed.state)).toBe(false);

		const first = drag(pressed.state, 100, 90, -5);
		const second = drag(first.state, 100, 140, 20);

		expect(first.delta).toEqual(ZERO_DELTA);
		expect(second.delta).toEqual(ZERO_DELTA);
		expect(first.placement).toEqual({ kind: 'drag', observerId: 'pov-1', latitudeDeg: -5 });
		expect(second.placement).toEqual({ kind: 'drag', observerId: 'pov-1', latitudeDeg: 20 });
		expect(cameraControlsEnabled(second.state)).toBe(false);

		const released = release(second.state, 100, 140);

		expect(released.delta).toEqual(ZERO_DELTA);
		expect(released.placement).toBeNull();
		expect(cameraControlsEnabled(released.state)).toBe(true);
	});

	it('ignores a move that leaves the globe, keeping the last latitude', () => {
		const pressed = press(observerHit);
		const offGlobe = drag(pressed.state, 400, 400, undefined);

		expect(offGlobe.placement).toBeNull();
		expect(offGlobe.delta).toEqual(ZERO_DELTA);
	});

	it('restores the camera and places nothing when the pointer is cancelled', () => {
		const pressed = press(observerHit);
		const moved = drag(pressed.state, 100, 140, 25);
		const cancelled = apply(moved.state, { phase: 'cancel', pointerId: 1, position: { x: 100, y: 140 } });

		expect(cancelled.placement).toBeNull();
		expect(cancelled.delta).toEqual(ZERO_DELTA);
		expect(cameraControlsEnabled(cancelled.state)).toBe(true);
	});

	it('does not place anything on a cancel of a tap', () => {
		const pressed = press(globeHit(12));
		const cancelled = apply(pressed.state, { phase: 'cancel', pointerId: 1, position: { x: 100, y: 100 } });

		expect(cancelled.placement).toBeNull();
		expect(cameraControlsEnabled(cancelled.state)).toBe(true);
	});

	it('still turns the Earth when a drag starts on the empty globe', () => {
		const pressed = press(globeHit(12));
		const dragged = drag(pressed.state, 160, 100);

		// Past the tap slop the gesture becomes ticket 01's rotation, and places nothing.
		expect(dragged.placement).toBeNull();
		expect(dragged.delta.yaw).toBeGreaterThan(0);
		expect(cameraControlsEnabled(dragged.state)).toBe(true);

		const released = release(dragged.state, 160, 100);
		expect(released.placement).toBeNull();
	});

	it('leaves a pointer that landed off the globe to ticket 01', () => {
		const pressed = press({ kind: 'miss' });
		const dragged = drag(pressed.state, 130, 100);

		expect(pressed.delta).toEqual(ZERO_DELTA);
		expect(dragged.delta.yaw).toBeGreaterThan(0);
		expect(dragged.placement).toBeNull();
		expect(cameraControlsEnabled(dragged.state)).toBe(true);
	});

	it('abandons a placement gesture when a second finger lands, so the pinch works', () => {
		const pressed = press(observerHit);
		const pinched = apply(pressed.state, {
			phase: 'down',
			pointerId: 2,
			position: { x: 200, y: 100 },
			hit: { kind: 'miss' }
		});

		expect(pinched.state.placement).toBeNull();
		expect(cameraControlsEnabled(pinched.state)).toBe(true);
		expect(pinched.placement).toBeNull();
	});
});

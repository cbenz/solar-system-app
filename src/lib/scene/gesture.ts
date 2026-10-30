/**
 * Pure pointer-gesture reducer.
 *
 * The Svelte page and the Three.js scene stay dumb: they feed pointer events in
 * and apply the deltas that come out. One pointer turns the Earth, two pointers
 * pinch to zoom. Switching between the two never produces a jump, because every
 * change in the number of pointers resets the pinch baseline.
 */

export type Vec2 = { x: number; y: number };

export type PointerPhase = 'down' | 'move' | 'up' | 'cancel';

export type PointerInput = {
	phase: PointerPhase;
	pointerId: number;
	position: Vec2;
};

export type GesturePointer = {
	id: number;
	position: Vec2;
};

export type GestureState = {
	pointers: readonly GesturePointer[];
	/** Distance between the first two pointers at the previous move, if pinching. */
	pinchDistance: number | null;
};

export type GestureDelta = {
	/** Rotation around the Earth's polar axis, in radians. */
	yaw: number;
	/** Rotation around the horizontal axis, in radians. */
	pitch: number;
	/** Multiplicative zoom factor; 1 means unchanged. */
	zoom: number;
};

export const ROTATE_RADIANS_PER_PIXEL = 0.005;

export const EMPTY_GESTURE: GestureState = {
	pointers: [],
	pinchDistance: null
};

const NO_MOVEMENT: GestureDelta = { yaw: 0, pitch: 0, zoom: 1 };

export type GestureResult = {
	state: GestureState;
	delta: GestureDelta;
};

function distanceBetween(a: Vec2, b: Vec2): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function unchanged(state: GestureState): GestureResult {
	return { state, delta: NO_MOVEMENT };
}

export function reduceGesture(state: GestureState, input: PointerInput): GestureResult {
	switch (input.phase) {
		case 'down': {
			if (state.pointers.some((pointer) => pointer.id === input.pointerId)) {
				return unchanged(state);
			}

			return {
				state: {
					pointers: [...state.pointers, { id: input.pointerId, position: input.position }],
					pinchDistance: null
				},
				delta: NO_MOVEMENT
			};
		}

		case 'up':
		case 'cancel': {
			const pointers = state.pointers.filter((pointer) => pointer.id !== input.pointerId);

			if (pointers.length === state.pointers.length) {
				return unchanged(state);
			}

			return { state: { pointers, pinchDistance: null }, delta: NO_MOVEMENT };
		}

		case 'move': {
			const index = state.pointers.findIndex((pointer) => pointer.id === input.pointerId);
			const previous = state.pointers[index];

			if (index === -1 || previous === undefined) {
				return unchanged(state);
			}

			const pointers = state.pointers.slice();
			pointers[index] = { id: input.pointerId, position: input.position };

			if (pointers.length === 1) {
				return {
					state: { pointers, pinchDistance: null },
					delta: {
						yaw: (input.position.x - previous.position.x) * ROTATE_RADIANS_PER_PIXEL,
						pitch: (input.position.y - previous.position.y) * ROTATE_RADIANS_PER_PIXEL,
						zoom: 1
					}
				};
			}

			const first = pointers[0];
			const second = pointers[1];

			if (first === undefined || second === undefined) {
				return { state: { pointers, pinchDistance: null }, delta: NO_MOVEMENT };
			}

			const current = distanceBetween(first.position, second.position);

			if (state.pinchDistance === null || state.pinchDistance === 0) {
				return { state: { pointers, pinchDistance: current }, delta: NO_MOVEMENT };
			}

			return {
				state: { pointers, pinchDistance: current },
				delta: { yaw: 0, pitch: 0, zoom: current / state.pinchDistance }
			};
		}
	}
}

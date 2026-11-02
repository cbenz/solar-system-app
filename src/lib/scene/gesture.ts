/**
 * Pure pointer-gesture reducer.
 *
 * The Svelte page and the Three.js scene stay dumb: they feed pointer events in
 * and apply the deltas that come out. One pointer turns the Earth, two pointers
 * pinch to zoom. Switching between the two never produces a jump, because every
 * change in the number of pointers resets the pinch baseline.
 *
 * ## Placement gestures (ticket 06)
 *
 * A pointer that lands on an observer dot, or on the visible globe, starts a
 * **placement gesture** instead of a camera gesture. While one is in flight the
 * reducer emits no yaw, no pitch and no zoom: the camera holds still for the
 * whole gesture, and only the wheel handler outside this module must respect
 * the same rule (`cameraControlsEnabled`).
 *
 * The caller does the geometry — it knows where the dots are on screen and
 * where the pointer ray meets the globe — and passes the result as `hit` on
 * `down`, and as `latitudeDeg` on each `move`. That keeps this module free of
 * Three.js and of the session module's projection helpers.
 *
 * A pointer that lands on the globe is only a *candidate* tap: past the slop it
 * becomes ticket 01's rotation and nothing is placed. A pointer on a dot is a
 * drag for its whole lifetime, so a long drag still moves the observer and
 * never the camera.
 */

export type Vec2 = { x: number; y: number };

export type PointerPhase = 'down' | 'move' | 'up' | 'cancel';

/** What the pointer landed on, picked by the caller on `down`. */
export type PlacementHit =
	| { kind: 'observer'; observerId: string }
	| { kind: 'globe'; latitudeDeg: number }
	| { kind: 'miss' };

export type PointerInput = {
	phase: PointerPhase;
	pointerId: number;
	position: Vec2;
	/** Only read on `down`. */
	hit?: PlacementHit;
	/** Latitude under the pointer on `move`, when a drag is in flight. */
	latitudeDeg?: number | null;
};

export type GesturePointer = {
	id: number;
	position: Vec2;
};

/** A placement gesture in flight. */
export type PlacementGesture = {
	pointerId: number;
	/** A candidate tap on the globe, or a drag of an existing dot. */
	kind: 'tap' | 'drag-observer';
	observerId: string | null;
	origin: Vec2;
	/** Target latitude: the tap's latitude, or the drag's latest one. */
	latitudeDeg: number | null;
	/** A tap that travelled past the slop is no longer a tap. */
	moved: boolean;
};

export type GestureState = {
	pointers: readonly GesturePointer[];
	/** Distance between the first two pointers at the previous move, if pinching. */
	pinchDistance: number | null;
	/** The placement gesture in flight, if any. */
	placement: PlacementGesture | null;
};

export type GestureDelta = {
	/** Rotation around the Earth's polar axis, in radians. */
	yaw: number;
	/** Rotation around the horizontal axis, in radians. */
	pitch: number;
	/** Multiplicative zoom factor; 1 means unchanged. */
	zoom: number;
};

/** What the session should do after this input, if anything. */
export type PlacementIntent =
	| { kind: 'place'; latitudeDeg: number }
	| { kind: 'drag'; observerId: string; latitudeDeg: number };

export const ROTATE_RADIANS_PER_PIXEL = 0.005;

/** A finger is never perfectly still; below this it is still a tap. */
export const TAP_SLOP_PX = 8;

export const EMPTY_GESTURE: GestureState = {
	pointers: [],
	pinchDistance: null,
	placement: null
};

const NO_MOVEMENT: GestureDelta = { yaw: 0, pitch: 0, zoom: 1 };

export type GestureResult = {
	state: GestureState;
	delta: GestureDelta;
	/** Raised on release / during a drag; `null` for camera gestures. */
	placement: PlacementIntent | null;
};

/** Orbit and zoom are held still while a placement gesture is in flight. */
export function cameraControlsEnabled(state: GestureState): boolean {
	return state.placement === null;
}

function distanceBetween(a: Vec2, b: Vec2): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function unchanged(state: GestureState): GestureResult {
	return { state, delta: NO_MOVEMENT, placement: null };
}

function placementFromHit(pointerId: number, position: Vec2, hit: PlacementHit | undefined): PlacementGesture | null {
	if (hit === undefined || hit.kind === 'miss') return null;

	if (hit.kind === 'observer') {
		return {
			pointerId,
			kind: 'drag-observer',
			observerId: hit.observerId,
			origin: position,
			latitudeDeg: null,
			moved: false
		};
	}

	return {
		pointerId,
		kind: 'tap',
		observerId: null,
		origin: position,
		latitudeDeg: hit.latitudeDeg,
		moved: false
	};
}

function movedFromOrigin(placement: PlacementGesture, position: Vec2): boolean {
	return distanceBetween(position, placement.origin) > TAP_SLOP_PX;
}

function rotationDelta(previous: Vec2, next: Vec2): GestureDelta {
	return {
		yaw: (next.x - previous.x) * ROTATE_RADIANS_PER_PIXEL,
		pitch: (next.y - previous.y) * ROTATE_RADIANS_PER_PIXEL,
		zoom: 1
	};
}

export function reduceGesture(state: GestureState, input: PointerInput): GestureResult {
	switch (input.phase) {
		case 'down': {
			if (state.pointers.some((pointer) => pointer.id === input.pointerId)) {
				return unchanged(state);
			}

			const pointers = [...state.pointers, { id: input.pointerId, position: input.position }];

			// A second finger always means a pinch: it abandons any placement
			// gesture, so the camera comes back with it.
			if (pointers.length > 1) {
				return {
					state: { pointers, pinchDistance: null, placement: null },
					delta: NO_MOVEMENT,
					placement: null
				};
			}

			return {
				state: {
					pointers,
					pinchDistance: null,
					placement: placementFromHit(input.pointerId, input.position, input.hit)
				},
				delta: NO_MOVEMENT,
				placement: null
			};
		}

		case 'up':
		case 'cancel': {
			const pointers = state.pointers.filter((pointer) => pointer.id !== input.pointerId);

			if (pointers.length === state.pointers.length) {
				return unchanged(state);
			}

			const placement = state.placement;
			const completes = placement !== null && placement.pointerId === input.pointerId;

			// A tap places on release; a drag has already placed on every move, and
			// a cancel places nothing. Either way the camera is released here.
			const intent: PlacementIntent | null =
				completes &&
				input.phase === 'up' &&
				placement.kind === 'tap' &&
				!placement.moved &&
				placement.latitudeDeg !== null
					? { kind: 'place', latitudeDeg: placement.latitudeDeg }
					: null;

			return {
				state: { pointers, pinchDistance: null, placement: completes ? null : placement },
				delta: NO_MOVEMENT,
				placement: intent
			};
		}

		case 'move': {
			const index = state.pointers.findIndex((pointer) => pointer.id === input.pointerId);
			const previous = state.pointers[index];

			if (index === -1 || previous === undefined) {
				return unchanged(state);
			}

			const pointers = state.pointers.slice();
			pointers[index] = { id: input.pointerId, position: input.position };

			const placement = state.placement;
			if (placement !== null && placement.pointerId === input.pointerId) {
				if (placement.kind === 'drag-observer') {
					const latitudeDeg = input.latitudeDeg ?? null;

					// Dragging off the globe keeps the last latitude: the observer
					// follows the same meridian, it never jumps to the far side.
					if (latitudeDeg === null || latitudeDeg === placement.latitudeDeg) {
						return {
							state: { pointers, pinchDistance: null, placement },
							delta: NO_MOVEMENT,
							placement: null
						};
					}

					return {
						state: {
							pointers,
							pinchDistance: null,
							placement: { ...placement, latitudeDeg, moved: true }
						},
						delta: NO_MOVEMENT,
						placement:
							placement.observerId === null
								? null
								: { kind: 'drag', observerId: placement.observerId, latitudeDeg }
					};
				}

				// A candidate tap that travels stays a tap while it is inside the slop.
				if (!placement.moved && !movedFromOrigin(placement, input.position)) {
					return {
						state: { pointers, pinchDistance: null, placement },
						delta: NO_MOVEMENT,
						placement: null
					};
				}

				// Past the slop this was never a tap: it is ticket 01's rotation.
				// The camera comes back on this very move, which is why it turns.
				return {
					state: { pointers, pinchDistance: null, placement: null },
					delta: rotationDelta(previous.position, input.position),
					placement: null
				};
			}

			if (pointers.length === 1) {
				return {
					state: { pointers, pinchDistance: null, placement: null },
					delta: rotationDelta(previous.position, input.position),
					placement: null
				};
			}

			const first = pointers[0];
			const second = pointers[1];

			if (first === undefined || second === undefined) {
				return {
					state: { pointers, pinchDistance: null, placement: null },
					delta: NO_MOVEMENT,
					placement: null
				};
			}

			const current = distanceBetween(first.position, second.position);

			if (state.pinchDistance === null || state.pinchDistance === 0) {
				return {
					state: { pointers, pinchDistance: current, placement: null },
					delta: NO_MOVEMENT,
					placement: null
				};
			}

			return {
				state: { pointers, pinchDistance: current, placement: null },
				delta: { yaw: 0, pitch: 0, zoom: current / state.pinchDistance },
				placement: null
			};
		}
	}
}

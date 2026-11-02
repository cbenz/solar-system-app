import { describe, expect, it } from 'vitest';
import {
	OBLIQUITY_DEG,
	applyEvent,
	createInitialState,
	pickLatitude,
	placeName,
	placementTargetId,
	type SessionState
} from './index';

/** A placement that looks straight at the sphere's centre from `origin`. */
function rayFrom(origin: { x: number; y: number; z: number }, target = { x: 0, y: 0, z: 0 }) {
	const direction = {
		x: target.x - origin.x,
		y: target.y - origin.y,
		z: target.z - origin.z
	};
	return { rayOrigin: origin, rayDirection: direction, bodyCenter: target, bodyRadius: 1 };
}

function hitPoint(result: { latitudeDeg: number } | null): number {
	if (result === null) throw new Error('expected a hit');
	return result.latitudeDeg;
}

describe('pickLatitude, the pure globe hit-test', () => {
	it('reads 0 on the equator-facing axis', () => {
		// The equatorial plane is z = 0, the north pole is +z (see pick.ts).
		expect(hitPoint(pickLatitude(rayFrom({ x: 5, y: 0, z: 0 })))).toBeCloseTo(0, 12);
		expect(hitPoint(pickLatitude(rayFrom({ x: 0, y: -5, z: 0 })))).toBeCloseTo(0, 12);
	});

	it('reads exactly 90 at the north pole and -90 at the south pole', () => {
		expect(hitPoint(pickLatitude(rayFrom({ x: 0, y: 0, z: 5 })))).toBeCloseTo(90, 12);
		expect(hitPoint(pickLatitude(rayFrom({ x: 0, y: 0, z: -5 })))).toBeCloseTo(-90, 12);
	});

	it('reads the latitude of an oblique hit', () => {
		// Look straight down at the surface point 30° above the equatorial plane,
		// so that point is the nearest intersection and the latitude is exact.
		const surface = { x: 0, y: Math.cos(Math.PI / 6), z: Math.sin(Math.PI / 6) };
		const origin = { x: surface.x * 5, y: surface.y * 5, z: surface.z * 5 };

		expect(hitPoint(pickLatitude(rayFrom(origin)))).toBeCloseTo(30, 9);
	});

	it('accepts an unnormalised direction and an offset body', () => {
		const result = pickLatitude({
			rayOrigin: { x: 3, y: 4, z: 5 },
			rayDirection: { x: 0, y: 0, z: -7 },
			bodyCenter: { x: 3, y: 4, z: 0 },
			bodyRadius: 2
		});

		expect(hitPoint(result)).toBeCloseTo(90, 12);
	});

	it('misses the sphere entirely', () => {
		expect(
			pickLatitude({
				rayOrigin: { x: 5, y: 2, z: 0 },
				rayDirection: { x: 0, y: 0, z: -1 },
				bodyCenter: { x: 0, y: 0, z: 0 },
				bodyRadius: 1
			})
		).toBeNull();
		// A ray pointing away from the sphere, even from inside its bounding box.
		expect(
			pickLatitude({
				rayOrigin: { x: 0, y: 0, z: 5 },
				rayDirection: { x: 0, y: 0, z: 1 },
				bodyCenter: { x: 0, y: 0, z: 0 },
				bodyRadius: 1
			})
		).toBeNull();
	});

	it('rejects a hit on the back side of the globe', () => {
		// Seen from inside (the camera is closer to the centre than the surface),
		// the only intersection ahead is the far side of the sphere.
		expect(
			pickLatitude({
				rayOrigin: { x: 0, y: 0, z: 0.5 },
				rayDirection: { x: 0, y: 0, z: 1 },
				bodyCenter: { x: 0, y: 0, z: 0 },
				bodyRadius: 1
			})
		).toBeNull();
	});

	it('is null for a degenerate sphere or direction', () => {
		expect(
			pickLatitude({
				rayOrigin: { x: 0, y: 0, z: 5 },
				rayDirection: { x: 0, y: 0, z: 0 },
				bodyCenter: { x: 0, y: 0, z: 0 },
				bodyRadius: 1
			})
		).toBeNull();
		expect(
			pickLatitude({
				rayOrigin: { x: 0, y: 0, z: 5 },
				rayDirection: { x: 0, y: 0, z: -1 },
				bodyCenter: { x: 0, y: 0, z: 0 },
				bodyRadius: 0
			})
		).toBeNull();
	});
});

describe('placeName, computed from the obliquity', () => {
	const epsilon = OBLIQUITY_DEG;
	const polar = 90 - OBLIQUITY_DEG;
	const step = 0.01;

	it.each([
		[0, 'place.name.equator'],
		[epsilon, 'place.name.tropicOfCancer'],
		[epsilon - step, 'place.name.northernTropics'],
		[epsilon + step, 'place.name.northernTemperate'],
		[polar - step, 'place.name.northernTemperate'],
		[polar, 'place.name.arcticCircle'],
		[polar + step, 'place.name.arctic'],
		[90, 'place.name.arctic'],
		[-epsilon, 'place.name.tropicOfCapricorn'],
		[-epsilon + step, 'place.name.southernTropics'],
		[-epsilon - step, 'place.name.southernTemperate'],
		[-polar + step, 'place.name.southernTemperate'],
		[-polar, 'place.name.antarcticCircle'],
		[-polar - step, 'place.name.antarctic'],
		[-90, 'place.name.antarctic']
	] as const)('names %s° as %s', (latitudeDeg, key) => {
		expect(placeName(latitudeDeg)).toBe(key);
	});

	it('derives its thresholds from the obliquity, not from literals', () => {
		// 23.44 is the model constant; 66.56 = 90 - 23.44 is the polar circle.
		expect(placeName(OBLIQUITY_DEG)).toBe('place.name.tropicOfCancer');
		expect(placeName(66.56)).toBe('place.name.arcticCircle');
	});

	it('clamps a latitude outside the planet to the poles', () => {
		expect(placeName(123)).toBe('place.name.arctic');
		expect(placeName(-123)).toBe('place.name.antarctic');
	});
});

describe('placing an observer', () => {
	function place(state: SessionState, povId: string, latitudeDeg: number): SessionState {
		return applyEvent(state, { type: 'place-observer', povId, latitudeDeg }).state;
	}

	function sandbox(): SessionState {
		return { ...createInitialState(), observers: [] };
	}

	it('puts the first observer at the tapped latitude, on the Earth', () => {
		const state = place(sandbox(), 'pov-1', 48.8566);
		const observer = state.observers[0];

		expect(observer?.latitudeDeg).toBe(48.8566);
		expect(observer?.bodyId).toBe('earth');
		expect(observer?.longitudeDeg).toBeUndefined();
	});

	it('clamps a latitude to the planet, never past the pole', () => {
		const north = place(sandbox(), 'pov-1', 123);
		const south = place(sandbox(), 'pov-1', -123);
		const notFinite = place(sandbox(), 'pov-1', Number.NaN);

		expect(north.observers[0]?.latitudeDeg).toBe(90);
		expect(south.observers[0]?.latitudeDeg).toBe(-90);
		expect(notFinite.observers[0]?.latitudeDeg).toBe(0);
	});

	it('treats a second placement at the same latitude as a no-op', () => {
		// Longitude is never stored, so the planet's rotation sweeps every
		// longitude and the second placement can only be the same place.
		const once = place(sandbox(), 'pov-1', 12.5);
		const twice = place(once, 'pov-1', 12.5);

		expect(twice).toBe(once);
	});

	it('moves one observer along its meridian and leaves everything else alone', () => {
		let state = sandbox();
		state = place(state, 'pov-1', 10);
		state = place(state, 'pov-2', -20);
		state = place(state, 'pov-3', 70);

		const before = state;
		const dragged = place(state, 'pov-2', -35);

		const moved = dragged.observers.find((observer) => observer.id === 'pov-2');
		const beforeMoved = before.observers.find((observer) => observer.id === 'pov-2');

		expect(moved?.latitudeDeg).toBe(-35);
		// Only the latitude changes: colour, body and the absent longitude survive.
		expect(moved).toEqual({ ...beforeMoved, latitudeDeg: -35 });
		expect(moved?.longitudeDeg).toBeUndefined();

		// The other observers are untouched, by identity as well as by value.
		expect(dragged.observers[0]).toBe(before.observers[0]);
		expect(dragged.observers[2]).toBe(before.observers[2]);
		expect(dragged.instant).toBe(before.instant);
	});

	it('keeps the selected POV as the placement target', () => {
		const state = place(sandbox(), 'pov-1', 9);
		expect(placementTargetId(state)).toBe('pov-1');
		expect(placementTargetId(sandbox())).toBe('pov-1');
	});
});

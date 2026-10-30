import * as THREE from 'three';
import {
	DRAWN_EARTH_RADIUS_AU,
	pickLatitude,
	trueRadiusAu,
	type Observer,
	type SceneBody,
	type SceneSnapshot
} from '$lib/session';
import { circlePoints, CIRCLE_RADIUS_FACTOR, DEFAULT_CIRCLES, type CircleSpec } from './circles';
import { createEarthTexture } from './earth-texture';
import { createStarfield } from './starfield';
import {
	EMPTY_GESTURE,
	cameraControlsEnabled,
	reduceGesture,
	type GestureState,
	type PlacementHit,
	type PlacementIntent
} from './gesture';
import { clampCameraDistance, clampPitch } from './view';

/**
 * The renderer seam.
 *
 * `+page.svelte` knows only this function: it hands over an element and gets a
 * handle it can destroy. Everything Three.js lives behind it, so later tickets
 * can grow the scene without teaching the Svelte layer about WebGL.
 */

/**
 * One scene unit is the Earth's radius in the readable default, so the camera
 * framing ticket 01 chose keeps working. Distances and radii are never
 * distorted here: the session's snapshot carries the two factors and this file
 * only multiplies (`src/lib/session/scale.ts`, ADR-0003).
 */
const UNITS_PER_AU = 1 / DRAWN_EARTH_RADIUS_AU;
const EARTH_RADIUS = 1;
const INITIAL_CAMERA_DISTANCE = 3.2;
const INITIAL_YAW = 0;
const INITIAL_PITCH = 0.1;

/** The globe's surface frame: `+y` is north, the sphere sits at the origin. */
const OBSERVER_DOT_RADIUS = EARTH_RADIUS * 0.025;
const OBSERVER_DOT_HEIGHT = EARTH_RADIUS * 1.01;

/** A finger needs a bigger target than a 2.5 % dot. */
const OBSERVER_TOUCH_RADIUS_PX = 28;

/** Screen position of one observer label, in viewport pixels. */
export type ObserverLabelPosition = {
	id: string;
	x: number;
	y: number;
	visible: boolean;
};

export type SceneOptions = {
	/**
	 * Latitude circles to draw. The Equator by default; ticket 11 passes the
	 * Tropics and the Polar Circles through the same input.
	 */
	circles?: readonly CircleSpec[];
	/** Called when a label's screen position or visibility changes. */
	onLabelsChange?: (labels: ObserverLabelPosition[]) => void;
	/** Called when a pointer gesture asks for an observer to be placed or moved. */
	onPlacement?: (intent: PlacementIntent) => void;
};

export type SceneHandle = {
	/** Apply a session snapshot. Renders; never computes. */
	update(snapshot: SceneSnapshot): void;
	destroy(): void;
};

export function createScene(host: HTMLElement, options: SceneOptions = {}): SceneHandle {
	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: false,
		powerPreference: 'high-performance'
	});
	renderer.setClearColor(0x000000, 1);
	renderer.outputColorSpace = THREE.SRGBColorSpace;

	const canvas = renderer.domElement;
	host.appendChild(canvas);

	const scene = new THREE.Scene();
	// Far enough for the Sun at its true distance (about 100 scene units) and the
	// decorative star shell (about 80).
	const camera = new THREE.PerspectiveCamera(45, 1, 0.02, 2000);

	const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 48);
	const earthTexture = createEarthTexture(renderer.capabilities.getMaxAnisotropy());
	const earthMaterial = new THREE.MeshStandardMaterial({
		map: earthTexture,
		roughness: 1,
		metalness: 0
	});
	const earth = new THREE.Mesh(earthGeometry, earthMaterial);
	earth.rotation.order = 'YXZ';
	scene.add(earth);

	// The surface frame holds what the app places on the globe: the latitude
	// circles and the observer dots. It is the frame `pickLatitude` works in
	// (converted to the session's z-up convention below), so a tap lands exactly
	// where the dot it places is drawn. It does not take the mesh's decorative
	// rotation from ticket 01: longitude is never stored, so an observer is
	// drawn on the meridian facing the camera, at its latitude.
	const surface = new THREE.Group();
	scene.add(surface);

	// The Sun: a plain glowing sphere, placed and sized from the snapshot's
	// factors. The camera orbits the Earth, so the Earth is the origin of the
	// drawn frame and the Sun sits at the opposite of the Earth's drawn offset.
	const sunGeometry = new THREE.SphereGeometry(1, 48, 32);
	const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2c4 });
	const sun = new THREE.Mesh(sunGeometry, sunMaterial);
	scene.add(sun);

	// Latitude circles: line loops on the sphere, slightly outside it so they do
	// not z-fight with the surface. The Equator is always drawn (ticket 06);
	// ticket 11 adds the rest through `options.circles`.
	const circleGeometries: THREE.BufferGeometry[] = [];
	const circleMaterials: THREE.LineBasicMaterial[] = [];
	for (const spec of options.circles ?? DEFAULT_CIRCLES) {
		const points = circlePoints(spec.latitudeDeg, EARTH_RADIUS * CIRCLE_RADIUS_FACTOR).map(
			(point) => new THREE.Vector3(point.x, point.y, point.z)
		);
		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const material = new THREE.LineBasicMaterial({
			color: spec.colour,
			transparent: true,
			opacity: spec.opacity,
			depthWrite: false
		});
		surface.add(new THREE.LineLoop(geometry, material));
		circleGeometries.push(geometry);
		circleMaterials.push(material);
	}

	// Observer dots. Only the latitude is stored, so the dot sits on the
	// camera-facing meridian; the session still owns its colour and its daylight.
	const observerGeometry = new THREE.SphereGeometry(OBSERVER_DOT_RADIUS, 16, 12);
	const observerMaterials = new Map<string, THREE.MeshBasicMaterial>();
	const observerDots = new Map<string, THREE.Mesh>();

	function observerMaterial(colour: string): THREE.MeshBasicMaterial {
		const cached = observerMaterials.get(colour);
		if (cached !== undefined) return cached;

		const material = new THREE.MeshBasicMaterial({ color: colour });
		observerMaterials.set(colour, material);
		return material;
	}

	// Light comes from the Sun's real position and nowhere else (ADR-0002,
	// ADR-0004). The distance factors move the Sun, never the light's source.
	const sunlight = new THREE.DirectionalLight(0xffffff, 2.4);
	sunlight.position.copy(sun.position);
	scene.add(sunlight);

	// Deliberately far below the directional light: the night half must be dark.
	scene.add(new THREE.AmbientLight(0xffffff, 0.04));

	const stars = createStarfield();
	scene.add(stars);

	let distance = INITIAL_CAMERA_DISTANCE;
	let yaw = INITIAL_YAW;
	let pitch = INITIAL_PITCH;
	let gesture: GestureState = EMPTY_GESTURE;
	let frame: number | null = null;
	let destroyed = false;
	let lastLabelSignature = '';

	function updateCamera(): void {
		camera.position.set(0, 0, distance);
		camera.lookAt(0, 0, 0);
	}

	function updateRotation(): void {
		earth.rotation.set(pitch, yaw, 0);
	}

	/** The drawn radius of a body, in scene units, from its true radius and factor. */
	function drawnRadius(body: SceneBody): number {
		return trueRadiusAu(body.id) * body.radiusFactor * UNITS_PER_AU;
	}

	/** Where a dot for this observer is drawn: its latitude, on the facing meridian. */
	function observerPosition(observer: Observer): THREE.Vector3 {
		const latitude = (observer.latitudeDeg * Math.PI) / 180;
		return new THREE.Vector3(
			0,
			Math.sin(latitude) * OBSERVER_DOT_HEIGHT,
			Math.cos(latitude) * OBSERVER_DOT_HEIGHT
		);
	}

	function applySnapshot(snapshot: SceneSnapshot): void {
		const earthBody = snapshot.bodies.find((body) => body.id === 'earth');
		if (earthBody === undefined) return;

		// The Earth is the origin of the drawn frame. Its position is true in the
		// snapshot, so the drawn Sun offset is that vector scaled by the Earth's
		// distance factor and flipped: the Sun is where the Earth is not.
		const { x, y, z } = earthBody.position;
		const offset = new THREE.Vector3(-x, -y, -z).multiplyScalar(
			earthBody.distanceFactor * UNITS_PER_AU
		);

		sun.position.copy(offset);
		sunlight.position.copy(offset);
		earth.scale.setScalar(drawnRadius(earthBody));

		const sunBody = snapshot.bodies.find((body) => body.id === 'sun');
		sun.visible = sunBody !== undefined;
		if (sunBody !== undefined) sun.scale.setScalar(drawnRadius(sunBody));

		const present = new Set<string>();
		for (const entry of snapshot.observers) {
			const { id, colour } = entry.observer;
			present.add(id);

			let dot = observerDots.get(id);
			if (dot === undefined) {
				dot = new THREE.Mesh(observerGeometry, observerMaterial(colour));
				observerDots.set(id, dot);
				surface.add(dot);
			}

			dot.material = observerMaterial(colour);
			dot.position.copy(observerPosition(entry.observer));
		}

		for (const [id, dot] of observerDots) {
			if (present.has(id)) continue;
			surface.remove(dot);
			observerDots.delete(id);
		}
	}

	// --- Picking ------------------------------------------------------------
	// The renderer owns the camera, so it owns the conversion from a screen point
	// to a ray. The rule that turns the ray into a latitude is the session
	// module's `pickLatitude`, tested there.

	const raycaster = new THREE.Raycaster();
	const pointerNdc = new THREE.Vector2();
	const scratch = new THREE.Vector3();

	/**
	 * The session's body frame is z-up (`+z` toward the north pole); the
	 * renderer's surface frame is y-up. `Rx(90°)` is the rotation between them.
	 */
	function toBodyFrame(vector: THREE.Vector3): { x: number; y: number; z: number } {
		return { x: vector.x, y: -vector.z, z: vector.y };
	}

	function rayAt(clientX: number, clientY: number): THREE.Ray {
		const rect = canvas.getBoundingClientRect();
		pointerNdc.set(
			((clientX - rect.left) / rect.width) * 2 - 1,
			-(((clientY - rect.top) / rect.height) * 2 - 1)
		);
		raycaster.setFromCamera(pointerNdc, camera);
		return raycaster.ray;
	}

	/** The latitude of the visible globe under the pointer, or `null`. */
	function latitudeAt(clientX: number, clientY: number): number | null {
		const ray = rayAt(clientX, clientY);
		const picked = pickLatitude({
			rayOrigin: toBodyFrame(ray.origin),
			rayDirection: toBodyFrame(ray.direction),
			bodyCenter: { x: 0, y: 0, z: 0 },
			// The placement sphere is the readable globe the dots and circles use,
			// not the (possibly tiny) true-size Earth: the child places on what
			// they see.
			bodyRadius: EARTH_RADIUS
		});

		return picked === null ? null : picked.latitudeDeg;
	}

	/** Whether the globe hides a point at this world position. */
	function hiddenByGlobe(point: THREE.Vector3): boolean {
		const direction = scratch.copy(point).sub(camera.position);
		const length = direction.length();
		if (length === 0) return false;

		direction.divideScalar(length);

		// The sphere is at the origin, so the ray's offset from it is the camera.
		const halfLinear = camera.position.dot(direction);
		const constant = camera.position.lengthSq() - EARTH_RADIUS * EARTH_RADIUS;
		const discriminant = halfLinear * halfLinear - constant;
		if (discriminant < 0) return false;

		const near = -halfLinear - Math.sqrt(discriminant);
		return near > 1e-4 && near < length - 1e-4;
	}

	/** The observer dot under the pointer, if it is visible and close enough. */
	function observerAt(clientX: number, clientY: number): string | null {
		const rect = canvas.getBoundingClientRect();
		let best: { id: string; distance: number } | null = null;
		const world = new THREE.Vector3();

		for (const [id, dot] of observerDots) {
			dot.getWorldPosition(world);
			if (hiddenByGlobe(world)) continue;

			const projected = world.clone().project(camera);
			const x = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
			const y = rect.top + (-projected.y * 0.5 + 0.5) * rect.height;
			const distance = Math.hypot(x - clientX, y - clientY);

			if (distance > OBSERVER_TOUCH_RADIUS_PX) continue;
			if (best === null || distance < best.distance) best = { id, distance };
		}

		return best?.id ?? null;
	}

	function pickHit(clientX: number, clientY: number): PlacementHit {
		const observerId = observerAt(clientX, clientY);
		if (observerId !== null) return { kind: 'observer', observerId };

		const latitudeDeg = latitudeAt(clientX, clientY);
		if (latitudeDeg !== null) return { kind: 'globe', latitudeDeg };

		// A tap on the far side of the globe lands here: nothing is placed.
		return { kind: 'miss' };
	}

	// --- Labels -------------------------------------------------------------
	// A label is DOM text (so it can be selected by the i18n layer and read at
	// any resolution); the renderer only says where the dot is on screen.

	let lastSnapshot: SceneSnapshot | null = null;

	function emitLabels(): void {
		const onLabelsChange = options.onLabelsChange;
		if (onLabelsChange === undefined || lastSnapshot === null) return;

		const width = host.clientWidth;
		const height = host.clientHeight;
		const labels: ObserverLabelPosition[] = [];
		const world = new THREE.Vector3();

		for (const entry of lastSnapshot.observers) {
			const dot = observerDots.get(entry.observer.id);
			if (dot === undefined) continue;

			dot.getWorldPosition(world);
			const hidden = hiddenByGlobe(world);
			const projected = world.clone().project(camera);

			labels.push({
				id: entry.observer.id,
				x: (projected.x * 0.5 + 0.5) * width,
				y: (-projected.y * 0.5 + 0.5) * height,
				visible: !hidden && projected.z <= 1
			});
		}

		const signature = JSON.stringify(labels);
		if (signature === lastLabelSignature) return;
		lastLabelSignature = signature;
		onLabelsChange(labels);
	}

	// --- Gestures -----------------------------------------------------------
	// Pointer events cover finger and mouse identically. Dragging turns the
	// Earth; two fingers pinch. The wheel is the desktop counterpart of the
	// pinch, and is the only desktop-only path: no UI is built for desktop.
	//
	// A pointer that lands on a dot or on the visible globe starts a placement
	// gesture instead, and the pure reducer freezes the camera for its whole
	// duration (ticket 06).

	function applyDelta(delta: { yaw: number; pitch: number; zoom: number }): void {
		if (delta.yaw !== 0 || delta.pitch !== 0) {
			yaw += delta.yaw;
			pitch = clampPitch(pitch + delta.pitch);
			updateRotation();
		}

		if (delta.zoom !== 1) {
			// Spreading the fingers zooms in, so the camera moves closer.
			distance = clampCameraDistance(distance / delta.zoom);
			updateCamera();
		}
	}

	function onPointerDown(event: PointerEvent): void {
		canvas.setPointerCapture(event.pointerId);
		gesture = reduceGesture(gesture, {
			phase: 'down',
			pointerId: event.pointerId,
			position: { x: event.clientX, y: event.clientY },
			hit: pickHit(event.clientX, event.clientY)
		}).state;
	}

	function onPointerMove(event: PointerEvent): void {
		const dragging = gesture.placement?.kind === 'drag-observer';
		const result = reduceGesture(gesture, {
			phase: 'move',
			pointerId: event.pointerId,
			position: { x: event.clientX, y: event.clientY },
			latitudeDeg: dragging ? latitudeAt(event.clientX, event.clientY) : undefined
		});
		gesture = result.state;

		if (result.placement !== null) options.onPlacement?.(result.placement);
		applyDelta(result.delta);
	}

	function endPointer(event: PointerEvent, phase: 'up' | 'cancel'): void {
		const result = reduceGesture(gesture, {
			phase,
			pointerId: event.pointerId,
			position: { x: event.clientX, y: event.clientY }
		});
		gesture = result.state;

		if (result.placement !== null) options.onPlacement?.(result.placement);

		if (canvas.hasPointerCapture(event.pointerId)) {
			canvas.releasePointerCapture(event.pointerId);
		}
	}

	function onPointerUp(event: PointerEvent): void {
		endPointer(event, 'up');
	}

	function onPointerCancel(event: PointerEvent): void {
		endPointer(event, 'cancel');
	}

	function onWheel(event: WheelEvent): void {
		event.preventDefault();
		if (!cameraControlsEnabled(gesture)) return;
		distance = clampCameraDistance(distance * Math.exp(event.deltaY * 0.001));
		updateCamera();
	}

	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointermove', onPointerMove);
	canvas.addEventListener('pointerup', onPointerUp);
	canvas.addEventListener('pointercancel', onPointerCancel);
	canvas.addEventListener('wheel', onWheel, { passive: false });

	// --- Size and frame loop ------------------------------------------------

	function resize(): void {
		const width = Math.max(1, host.clientWidth);
		const height = Math.max(1, host.clientHeight);

		// Cap the device pixel ratio at 2: a mid-range phone at 3x would shade
		// more than twice the pixels for no visible gain on this scene.
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.setSize(width, height, false);

		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(host);

	function tick(): void {
		frame = window.requestAnimationFrame(tick);
		renderer.render(scene, camera);
		emitLabels();
	}

	function start(): void {
		if (frame !== null || destroyed) return;
		frame = window.requestAnimationFrame(tick);
	}

	function stop(): void {
		if (frame === null) return;
		window.cancelAnimationFrame(frame);
		frame = null;
	}

	function onVisibilityChange(): void {
		if (document.hidden) stop();
		else start();
	}

	document.addEventListener('visibilitychange', onVisibilityChange);

	resize();
	updateCamera();
	updateRotation();
	start();

	return {
		update(snapshot: SceneSnapshot): void {
			if (destroyed) return;
			lastSnapshot = snapshot;
			applySnapshot(snapshot);
		},

		destroy(): void {
			if (destroyed) return;
			destroyed = true;

			stop();
			document.removeEventListener('visibilitychange', onVisibilityChange);
			resizeObserver.disconnect();

			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointermove', onPointerMove);
			canvas.removeEventListener('pointerup', onPointerUp);
			canvas.removeEventListener('pointercancel', onPointerCancel);
			canvas.removeEventListener('wheel', onWheel);

			scene.remove(earth);
			scene.remove(surface);
			scene.remove(sun);
			scene.remove(stars);
			for (const dot of observerDots.values()) surface.remove(dot);
			observerDots.clear();
			earthGeometry.dispose();
			earthMaterial.dispose();
			earthTexture.dispose();
			sunGeometry.dispose();
			sunMaterial.dispose();
			observerGeometry.dispose();
			for (const material of observerMaterials.values()) material.dispose();
			observerMaterials.clear();
			for (const geometry of circleGeometries) geometry.dispose();
			for (const material of circleMaterials) material.dispose();
			circleGeometries.length = 0;
			circleMaterials.length = 0;

			const starMaterial = stars.material;
			if (Array.isArray(starMaterial)) {
				starMaterial.forEach((material) => material.dispose());
			} else {
				starMaterial.dispose();
			}
			stars.geometry.dispose();

			renderer.dispose();
			renderer.forceContextLoss();
			canvas.remove();
		}
	};
}

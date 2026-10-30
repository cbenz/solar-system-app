import * as THREE from 'three';
import { DRAWN_EARTH_RADIUS_AU, trueRadiusAu, type SceneBody, type SceneSnapshot } from '$lib/session';
import { createEarthTexture } from './earth-texture';
import { createStarfield } from './starfield';
import { EMPTY_GESTURE, reduceGesture, type GestureState } from './gesture';
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

export type SceneHandle = {
	/** Apply a session snapshot. Renders; never computes. */
	update(snapshot: SceneSnapshot): void;
	destroy(): void;
};

export function createScene(host: HTMLElement): SceneHandle {
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

	// The Sun: a plain glowing sphere, placed and sized from the snapshot's
	// factors. The camera orbits the Earth, so the Earth is the origin of the
	// drawn frame and the Sun sits at the opposite of the Earth's drawn offset.
	const sunGeometry = new THREE.SphereGeometry(1, 48, 32);
	const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2c4 });
	const sun = new THREE.Mesh(sunGeometry, sunMaterial);
	scene.add(sun);

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
	}

	// --- Gestures -----------------------------------------------------------
	// Pointer events cover finger and mouse identically. Dragging turns the
	// Earth; two fingers pinch. The wheel is the desktop counterpart of the
	// pinch, and is the only desktop-only path: no UI is built for desktop.

	function onPointerDown(event: PointerEvent): void {
		canvas.setPointerCapture(event.pointerId);
		gesture = reduceGesture(gesture, {
			phase: 'down',
			pointerId: event.pointerId,
			position: { x: event.clientX, y: event.clientY }
		}).state;
	}

	function onPointerMove(event: PointerEvent): void {
		const result = reduceGesture(gesture, {
			phase: 'move',
			pointerId: event.pointerId,
			position: { x: event.clientX, y: event.clientY }
		});
		gesture = result.state;

		if (result.delta.yaw !== 0 || result.delta.pitch !== 0) {
			yaw += result.delta.yaw;
			pitch = clampPitch(pitch + result.delta.pitch);
			updateRotation();
		}

		if (result.delta.zoom !== 1) {
			// Spreading the fingers zooms in, so the camera moves closer.
			distance = clampCameraDistance(distance / result.delta.zoom);
			updateCamera();
		}
	}

	function endPointer(event: PointerEvent, phase: 'up' | 'cancel'): void {
		gesture = reduceGesture(gesture, {
			phase,
			pointerId: event.pointerId,
			position: { x: event.clientX, y: event.clientY }
		}).state;

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
			scene.remove(sun);
			scene.remove(stars);
			earthGeometry.dispose();
			earthMaterial.dispose();
			earthTexture.dispose();
			sunGeometry.dispose();
			sunMaterial.dispose();

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

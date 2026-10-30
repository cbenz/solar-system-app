import * as THREE from 'three';
import type { SceneSnapshot } from '$lib/session';
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
	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 250);

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

	// Stand-in Sun mesh, with its light coming from the Sun's real position. The
	// session snapshot carries where the Earth is; here the Earth is the origin,
	// so the Sun's direction is the opposite of the Earth's heliocentric vector.
	// Ticket 04 owns the distance scale that will move the Earth along its orbit.
	const sunlight = new THREE.DirectionalLight(0xffffff, 2.4);
	sunlight.position.set(-4, 2, 3);
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

	function applySnapshot(snapshot: SceneSnapshot): void {
		const earthBody = snapshot.bodies.find((body) => body.id === 'earth');
		if (earthBody === undefined) return;

		// The Sun sits at the origin in the ecliptic frame; the Earth's own vector
		// points away from it, so the light comes from the opposite direction.
		const { x, y, z } = earthBody.position;
		const length = Math.hypot(x, y, z) || 1;
		sunlight.position.set((-x / length) * 10, (-y / length) * 10, (-z / length) * 10);
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
			scene.remove(stars);
			earthGeometry.dispose();
			earthMaterial.dispose();
			earthTexture.dispose();

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

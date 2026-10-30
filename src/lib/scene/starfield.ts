import * as THREE from 'three';
import { mulberry32 } from './random';

/**
 * A decorative starfield: one Points object, therefore one draw call.
 *
 * The stars are not an astronomical sky. The night-sky ticket owns the real one
 * drawn above an observer; this is only the backdrop of the space view.
 */

const STAR_COUNT = 3000;

export function createStarfield(): THREE.Points {
	const random = mulberry32(0x57a2f1);
	const positions = new Float32Array(STAR_COUNT * 3);
	const colours = new Float32Array(STAR_COUNT * 3);
	const colour = new THREE.Color();

	for (let index = 0; index < STAR_COUNT; index += 1) {
		const z = random() * 2 - 1;
		const angle = random() * Math.PI * 2;
		const ring = Math.sqrt(1 - z * z);
		const radius = 45 + random() * 35;
		const offset = index * 3;

		positions[offset] = Math.cos(angle) * ring * radius;
		positions[offset + 1] = z * radius;
		positions[offset + 2] = Math.sin(angle) * ring * radius;

		// Mostly white, with a few cool and warm stars.
		const warmth = random();
		colour.setRGB(0.8 + warmth * 0.2, 0.85 + random() * 0.15, 0.9 + random() * 0.1);
		colours[offset] = colour.r;
		colours[offset + 1] = colour.g;
		colours[offset + 2] = colour.b;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));

	const material = new THREE.PointsMaterial({
		size: 0.16,
		sizeAttenuation: true,
		vertexColors: true,
		transparent: true,
		opacity: 0.9,
		depthWrite: false
	});

	return new THREE.Points(geometry, material);
}

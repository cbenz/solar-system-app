<script lang="ts">
	/**
	 * One POV: a 2D drawing of the observer's sky, never a second WebGL scene.
	 *
	 * It reads the observer's scene-snapshot entry and does no astronomy. The
	 * only geometry is `skyToScreen`, a pure mapper tested in the session module.
	 * Daylight, and therefore whether the whole panel is dark, comes from the
	 * snapshot's `daylight` boolean — the same sign of the same dot product that
	 * shades the globe. Never from a clock, never from a second lighting test.
	 */
	import { onMount } from 'svelte';
	import { skyToScreen, type SceneObserver } from '$lib/session';

	let { entry }: { entry: SceneObserver } = $props();

	let canvas: HTMLCanvasElement;
	let width = $state(0);
	let height = $state(0);

	// Decorative stars for the post-dark sky. Ticket 16 owns the real night sky
	// (the Moon, magnitudes, the visibility limit); this is the seam it replaces.
	const STARS = Array.from({ length: 48 }, (_, index) => {
		const noise = (value: number) => {
			const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
			return raw - Math.floor(raw);
		};
		return { x: noise(index + 1), y: noise(index + 97) * 0.92, size: 0.6 + noise(index + 31) * 1.4 };
	});

	function draw(): void {
		if (canvas === undefined || width <= 0 || height <= 0) return;

		const context = canvas.getContext('2d');
		if (context === null) return;

		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const pixelWidth = Math.round(width * ratio);
		const pixelHeight = Math.round(height * ratio);
		if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
			canvas.width = pixelWidth;
			canvas.height = pixelHeight;
		}

		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, width, height);

		const horizon = height * 0.68;
		const daylight = entry.daylight;

		const sky = context.createLinearGradient(0, 0, 0, horizon);
		if (daylight) {
			sky.addColorStop(0, '#2f7dc0');
			sky.addColorStop(1, '#c6e5fb');
		} else {
			sky.addColorStop(0, '#02050f');
			sky.addColorStop(1, '#101d3c');
		}
		context.fillStyle = sky;
		context.fillRect(0, 0, width, horizon);

		if (!daylight) {
			context.fillStyle = 'rgba(255, 255, 255, 0.85)';
			for (const star of STARS) {
				context.beginPath();
				context.arc(star.x * width, star.y * horizon, star.size, 0, Math.PI * 2);
				context.fill();
			}
		}

		const ground = context.createLinearGradient(0, horizon, 0, height);
		if (daylight) {
			ground.addColorStop(0, '#536046');
			ground.addColorStop(1, '#242c1f');
		} else {
			ground.addColorStop(0, '#151810');
			ground.addColorStop(1, '#050604');
		}
		context.fillStyle = ground;
		context.fillRect(0, horizon, width, height - horizon);

		context.strokeStyle = daylight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.25)';
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo(0, horizon);
		context.lineTo(width, horizon);
		context.stroke();

		const sun = skyToScreen(entry.sunElevationDeg, entry.sunAzimuthDeg, { width, height });
		const radius = Math.max(5, Math.min(width, height) * 0.055);

		if (daylight && entry.sunElevationDeg > 0) {
			const glow = context.createRadialGradient(sun.x, sun.y, radius * 0.2, sun.x, sun.y, radius * 3);
			glow.addColorStop(0, 'rgba(255, 238, 170, 0.75)');
			glow.addColorStop(1, 'rgba(255, 238, 170, 0)');
			context.fillStyle = glow;
			context.beginPath();
			context.arc(sun.x, sun.y, radius * 3, 0, Math.PI * 2);
			context.fill();
		}

		// A Sun below the horizon stays drawn, dimmed, over the ground: the point
		// of the panel after dark is that the Sun is visibly down there.
		context.globalAlpha = daylight ? 1 : 0.5;
		context.fillStyle = daylight ? '#fff3b0' : '#e0903a';
		context.beginPath();
		context.arc(sun.x, sun.y, radius, 0, Math.PI * 2);
		context.fill();
		context.globalAlpha = 1;
	}

	onMount(() => {
		const measure = () => {
			const bounds = canvas.getBoundingClientRect();
			width = bounds.width;
			height = bounds.height;
		};

		const observer = new ResizeObserver(measure);
		observer.observe(canvas);
		measure();

		return () => observer.disconnect();
	});

	$effect(() => {
		// Reading these makes the effect run when the snapshot or the panel size moves.
		entry;
		width;
		height;
		draw();
	});
</script>

<div class="pov" style:--observer-colour={entry.observer.colour}>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
	.pov {
		box-sizing: border-box;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border: 2px solid var(--observer-colour);
		background: #000;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>

<script lang="ts">
	/**
	 * One POV: a 2D drawing of the observer's sky, never a second WebGL scene.
	 *
	 * It reads the observer's scene-snapshot entry and does no astronomy. The
	 * only geometry is `skyToScreen`, a pure mapper tested in the session module.
	 * Daylight, and therefore whether the whole panel is dark, comes from the
	 * snapshot's `daylight` boolean — the same sign of the same dot product that
	 * shades the globe. Never from a clock, never from a second lighting test.
	 *
	 * The night sky is two things (ticket 16): a decorative star field and the
	 * real Moon. The stars come from the session's seeded `starField`, so they
	 * never shimmer between renders, and they claim nothing — no constellation,
	 * no named star. The Moon is drawn where the snapshot puts it, at the phase
	 * and size the model gives, its lit limb turned toward its `litLimbAngleDeg`.
	 * Everything the POV draws is either in `visibleBodies` or decorative.
	 */
	import { onMount } from 'svelte';
	import { skyToScreen, starField, NIGHT_SKY_SEED, type SceneObserver } from '$lib/session';

	let { entry }: { entry: SceneObserver } = $props();

	let canvas: HTMLCanvasElement;
	let width = $state(0);
	let height = $state(0);

	// Generated once, from a fixed seed: the same sky on every render.
	const STARS = starField(NIGHT_SKY_SEED);

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
		const viewport = { width, height };

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
			for (const star of STARS) {
				const point = skyToScreen(star.altitudeDeg, star.azimuthDeg, viewport);
				context.fillStyle = `rgba(255, 255, 255, ${0.25 + star.brightness * 0.65})`;
				context.beginPath();
				context.arc(point.x, point.y, 0.5 + star.brightness * 1.3, 0, Math.PI * 2);
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

		// The Sun is drawn while it is in `visibleBodies`, or — with the limit off
		// — always, so the panel can show it just under the horizon after dark.
		const sunVisible =
			entry.visibleBodies.includes('sun') || (!entry.visibilityLimit && !daylight);
		const sun = skyToScreen(entry.sunElevationDeg, entry.sunAzimuthDeg, viewport);
		const radius = Math.max(5, Math.min(width, height) * 0.055);

		if (sunVisible) {
			if (daylight && entry.sunElevationDeg > 0) {
				const glow = context.createRadialGradient(
					sun.x,
					sun.y,
					radius * 0.2,
					sun.x,
					sun.y,
					radius * 3
				);
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

		const moon = entry.moon;
		if (moon !== null && moon.altitudeDeg > 0 && entry.visibleBodies.includes('moon')) {
			drawMoon(context, moon);
		}
	}

	/**
	 * A lit-limb disc: a half circle closed by a half ellipse whose width is
	 * `cos α`. At α = 0 it is the full circle (full moon), at α = 90° a straight
	 * terminator (quarter), at α = 180° nothing (new moon). The whole drawing is
	 * turned so the lit limb faces the Sun, which is what puts the crescent on
	 * the correct side.
	 */
	function drawMoon(
		context: CanvasRenderingContext2D,
		moon: NonNullable<SceneObserver['moon']>
	): void {
		const point = skyToScreen(moon.altitudeDeg, moon.azimuthDeg, { width, height });
		// The true diameter is about half a degree — a pixel here. Drawn bigger so
		// the phase is readable, never at its true size (the app says so elsewhere).
		const discRadius = Math.max(7, Math.min(width, height) * 0.06);
		const cosPhase = Math.cos((moon.phaseAngleDeg * Math.PI) / 180);
		const terminator = Math.abs(cosPhase) < 1e-3 ? (cosPhase < 0 ? -1e-3 : 1e-3) : cosPhase;

		context.save();
		context.translate(point.x, point.y);
		// Canvas +y points down, the snapshot's limb angle counts +y up.
		context.rotate((-moon.litLimbAngleDeg * Math.PI) / 180);

		context.beginPath();
		context.arc(0, 0, discRadius, 0, Math.PI * 2);
		context.fillStyle = 'rgba(28, 34, 48, 0.95)';
		context.fill();
		context.strokeStyle = 'rgba(200, 210, 230, 0.3)';
		context.lineWidth = 1;
		context.stroke();

		context.beginPath();
		context.arc(0, 0, discRadius, -Math.PI / 2, Math.PI / 2);
		context.save();
		context.scale(terminator, 1);
		context.arc(0, 0, discRadius, Math.PI / 2, -Math.PI / 2);
		context.restore();
		context.closePath();
		context.fillStyle = '#eef1f7';
		context.fill();

		context.restore();
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

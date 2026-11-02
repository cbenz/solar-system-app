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
	 * real Moon. The stars come from the session's seeded `decorativeStars`, so they
	 * never shimmer between renders, and they claim nothing — no constellation,
	 * no named star. The Moon is drawn where the snapshot puts it, at the phase
	 * and size the model gives, its lit limb turned toward its `litLimbAngleDeg`.
	 * Everything the POV draws is either in `visibleBodies` or decorative.
	 */
	import { onMount } from 'svelte';
	import { translate } from '$lib/i18n/translate';
	import type { Locale } from '$lib/i18n/locale';
	import {
		gnomonScreen,
		placeName,
		skyToScreen,
		decorativeStars,
		DECORATIVE_STAR_SEED,
		type SceneObserver
	} from '$lib/session';

	let { entry, locale }: { entry: SceneObserver; locale: Locale } = $props();

	let canvas: HTMLCanvasElement;
	let width = $state(0);
	let height = $state(0);

	// Generated once, from a fixed seed: the same sky on every render.
	const STARS = decorativeStars(DECORATIVE_STAR_SEED);

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

		// The gnomon belongs to the Shadows activity only (story 43). Every other
		// activity's POV shows a clean horizon: the flag is the activity's data,
		// not a component switch.
		if (entry.gnomon) {
			// A stick standing on the ground and the shadow it casts. Both positions
			// come from the session's pure geometry; this only strokes them.
			const glyph = gnomonScreen(entry.shadow, viewport);

			if (glyph.shadow !== null && daylight) {
				const shadow = glyph.shadow;
				context.beginPath();
				context.moveTo(shadow.baseLeft.x, shadow.baseLeft.y);
				context.lineTo(shadow.baseRight.x, shadow.baseRight.y);
				context.lineTo(shadow.tipRight.x, shadow.tipRight.y);
				context.lineTo(shadow.tipLeft.x, shadow.tipLeft.y);
				context.closePath();
				context.fillStyle = 'rgba(10, 14, 8, 0.55)';
				context.fill();
			}

			const stick = glyph.stick;
			context.fillStyle = daylight ? '#8a6a3f' : '#3a3024';
			context.fillRect(
				stick.x - stick.halfWidth,
				stick.topY,
				stick.halfWidth * 2,
				stick.baseY - stick.topY
			);
			// A lit edge, so the stick reads as a solid object rather than a line.
			context.fillStyle = daylight ? '#d8b07a' : '#5b4a33';
			context.fillRect(
				stick.x - stick.halfWidth,
				stick.topY,
				Math.max(0.5, stick.halfWidth * 0.7),
				stick.baseY - stick.topY
			);
		}

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

		// An eclipse dims the panel by the session's number: totality is darker than
		// partiality, and plain sunlight leaves the panel alone (ticket 14).
		if (entry.eclipse.darkening > 0) {
			context.fillStyle = `rgba(2, 3, 8, ${Math.min(0.92, 0.9 * entry.eclipse.darkening)})`;
			context.fillRect(0, 0, width, height);
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

		// The Earth's shadow reddens and darkens the lit disc. `moon.eclipse` is the
		// session's own number; nothing here decides what phase or eclipse it is.
		const shadowed = 1 - 0.85 * (moon.eclipse?.darkening ?? 0);
		const litColour =
			moon.eclipse?.kind === 'total'
				? `rgba(140, 60, 34, ${0.9 * shadowed + 0.08})`
				: `rgba(238, 241, 247, ${shadowed})`;

		context.beginPath();
		context.arc(0, 0, discRadius, -Math.PI / 2, Math.PI / 2);
		context.save();
		context.scale(terminator, 1);
		context.arc(0, 0, discRadius, Math.PI / 2, -Math.PI / 2);
		context.restore();
		context.closePath();
		context.fillStyle = litColour;
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
	<span class="pov-label">{translate(locale, placeName(entry.observer.latitudeDeg))}</span>
	<span class="sun-height">
		{translate(locale, 'pov.sunHeight', { height: Math.round(entry.sunElevationDeg) })}
	</span>
</div>

<style>
	.pov {
		box-sizing: border-box;
		position: relative;
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

	.pov-label,
	.sun-height {
		position: absolute;
		left: 0.35rem;
		max-width: calc(100% - 0.7rem);
		color: #fff;
		font-size: clamp(0.6rem, 2.2vw, 0.8rem);
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-shadow: 0 1px 2px #000;
		pointer-events: none;
	}

	.pov-label {
		top: 0.3rem;
	}

	.sun-height {
		bottom: 0.3rem;
		font-variant-numeric: tabular-nums;
	}
</style>

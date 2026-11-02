<script lang="ts">
	/**
	 * The timeline: a dumb renderer over session state.
	 *
	 * It holds no authority over the instant. Dragging computes an instant,
	 * snaps it to an interesting one and dispatches `scrub-to`; playback is a rAF
	 * loop that asks `time.ts` for the next instant and dispatches the same event.
	 * Playback speed is the session's `settings.playbackSpeed`, never a control on
	 * this bar.
	 */
	import { onDestroy } from 'svelte';
	import { translate } from '$lib/i18n/translate';
	import { formatDate, formatTime } from '$lib/i18n/format';
	import {
		DEFAULT_PLAYBACK_SPEED,
		DEFAULT_SNAP_RATIO,
		MS_PER_DAY,
		advanceInstant,
		clampInstant,
		hasReachedEnd,
		instantAtRatio,
		ratioOfInstant,
		snap,
		snapPointsFor,
		spanLabelKey,
		startOfDay,
		type SessionEvent,
		type SessionState
	} from '$lib/session';

	// `session` rather than `state`: a prop called `state` would shadow the
	// `$state` rune and turn every rune call into a store subscription.
	let {
		session,
		dispatch
	}: { session: SessionState; dispatch: (event: SessionEvent) => void } = $props();

	let track: HTMLDivElement;
	let dragging = $state(false);
	let playing = $state(false);
	let frame: number | null = null;
	let lastFrameAt: number | null = null;

	const ratio = $derived(ratioOfInstant(session.instant, session.timeSpan));
	const playbackSpeed = $derived(
		typeof session.settings.playbackSpeed === 'number'
			? session.settings.playbackSpeed
			: DEFAULT_PLAYBACK_SPEED
	);

	// Snap points only change with the span, the observers or the day, so the
	// bisections under `snapPointsFor` never run on every animation frame.
	const dayStart = $derived(startOfDay(session.instant));
	const snapPoints = $derived.by(() =>
		snapPointsFor(session.timeSpan, session.observers, dayStart)
	);

	const dateText = $derived(formatDate(session.instant, session.locale));
	const timeText = $derived(formatTime(session.instant, session.locale));
	const spanWords = $derived(translate(session.locale, spanLabelKey(session.timeSpan)));

	function scrubTo(instant: number): void {
		const clamped = clampInstant(instant, session.timeSpan);
		if (clamped === session.instant) return;
		dispatch({ type: 'scrub-to', instant: clamped });
	}

	function instantAtPointer(event: PointerEvent): number {
		const bounds = track.getBoundingClientRect();
		if (bounds.width <= 0) return session.instant;
		return instantAtRatio((event.clientX - bounds.left) / bounds.width, session.timeSpan);
	}

	function scrubFromPointer(event: PointerEvent): void {
		scrubTo(snap(instantAtPointer(event), snapPoints, DEFAULT_SNAP_RATIO));
	}

	function onPointerDown(event: PointerEvent): void {
		stopPlayback();
		dragging = true;
		track.setPointerCapture(event.pointerId);
		scrubFromPointer(event);
	}

	function onPointerMove(event: PointerEvent): void {
		if (!dragging) return;
		scrubFromPointer(event);
	}

	function endDrag(event: PointerEvent): void {
		dragging = false;
		if (track.hasPointerCapture(event.pointerId)) {
			track.releasePointerCapture(event.pointerId);
		}
	}

	function onKeyDown(event: KeyboardEvent): void {
		const step = event.shiftKey ? 10 * MS_PER_DAY : MS_PER_DAY;

		if (event.key === 'ArrowLeft') scrubTo(session.instant - step);
		else if (event.key === 'ArrowRight') scrubTo(session.instant + step);
		else if (event.key === 'Home') scrubTo(session.timeSpan.fromInstant);
		else if (event.key === 'End') scrubTo(session.timeSpan.toInstant);
		else return;

		event.preventDefault();
	}

	function tick(now: number): void {
		if (!playing) return;

		const elapsed = lastFrameAt === null ? 0 : now - lastFrameAt;
		lastFrameAt = now;

		if (elapsed > 0) {
			const next = advanceInstant(session.instant, elapsed, playbackSpeed, session.timeSpan);
			if (next !== session.instant) dispatch({ type: 'scrub-to', instant: next });

			if (hasReachedEnd(next, session.timeSpan)) {
				stopPlayback();
				return;
			}
		}

		frame = requestAnimationFrame(tick);
	}

	function startPlayback(): void {
		if (playing) return;
		if (hasReachedEnd(session.instant, session.timeSpan)) {
			dispatch({ type: 'scrub-to', instant: session.timeSpan.fromInstant });
		}
		playing = true;
		lastFrameAt = null;
		frame = requestAnimationFrame(tick);
	}

	function stopPlayback(): void {
		playing = false;
		lastFrameAt = null;
		if (frame !== null) {
			cancelAnimationFrame(frame);
			frame = null;
		}
	}

	function togglePlayback(): void {
		if (playing) stopPlayback();
		else startPlayback();
	}

	onDestroy(stopPlayback);
</script>

<div class="timeline">
	<div class="readout">
		<span class="date">{dateText}</span>
		<span class="time">{timeText}</span>
		<button
			class="playback"
			type="button"
			aria-label={translate(session.locale, playing ? 'time.pause' : 'time.play')}
			onclick={togglePlayback}
		>
			<span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
		</button>
	</div>

	<div
		class="track"
		bind:this={track}
		role="slider"
		tabindex="0"
		aria-label={translate(session.locale, 'time.timeline')}
		aria-valuemin={session.timeSpan.fromInstant}
		aria-valuemax={session.timeSpan.toInstant}
		aria-valuenow={session.instant}
		aria-valuetext="{dateText} {timeText}"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		onkeydown={onKeyDown}
	>
		<!-- The span in words: decoration, never selectable, never focusable. -->
		<span class="span-words" aria-hidden="true">{spanWords}</span>
		<div class="rail"></div>
		{#each snapPoints as point (point.instant)}
			<span
				class="snap-tick"
				class:minor={point.kind === 'sunrise' || point.kind === 'sunset'}
				style:left="{ratioOfInstant(point.instant, session.timeSpan) * 100}%"
				aria-hidden="true"
			></span>
		{/each}
		<div class="thumb" style:left="{ratio * 100}%" aria-hidden="true"></div>
	</div>
</div>

<style>
	.timeline {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		/* The left gutter holds the sidebar control (44 px + margins), so the
		   scrubber always starts where a finger can reach it, not under a button. */
		padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom))
			calc(0.5rem + 3.5rem + env(safe-area-inset-left));
		background: linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0));
		color: #fff;
		font-size: 1rem;
		pointer-events: none;
		z-index: 10;
	}

	.readout,
	.track {
		pointer-events: auto;
	}

	.readout {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 1px 2px rgb(0 0 0 / 0.8);
	}

	.date {
		font-weight: 600;
	}

	.time {
		opacity: 0.85;
	}

	.playback {
		margin-inline-start: auto;
		display: grid;
		place-items: center;
		/* One thumb, big enough for a finger without a missed press. */
		width: 3rem;
		height: 3rem;
		border: 1px solid rgb(255 255 255 / 0.28);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.08);
		color: inherit;
		font-size: 1rem;
		cursor: pointer;
		touch-action: manipulation;
	}

	.playback:focus-visible,
	.track:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	.track {
		position: relative;
		/* Tall hit area around a thin visible rail: the rail is 6px, the finger
		   target is 44px. */
		height: 2.75rem;
		border-radius: 0.5rem;
		touch-action: none;
		cursor: pointer;
	}

	.rail {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 6px;
		transform: translateY(-50%);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.22);
	}

	.span-words {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgb(255 255 255 / 0.34);
		/* The ghost text is behind the track and cannot be selected or touched. */
		user-select: none;
		-webkit-user-select: none;
		pointer-events: none;
	}

	.snap-tick {
		position: absolute;
		top: 50%;
		width: 2px;
		height: 1rem;
		transform: translate(-50%, -50%);
		border-radius: 1px;
		background: rgb(255 255 255 / 0.45);
		pointer-events: none;
	}

	.snap-tick.minor {
		height: 0.6rem;
		opacity: 0.6;
	}

	.thumb {
		position: absolute;
		top: 50%;
		width: 2.75rem;
		height: 2.75rem;
		transform: translate(-50%, -50%);
		border-radius: 999px;
		background: #fff;
		box-shadow:
			0 0 0 3px rgb(125 211 252 / 0.55),
			0 2px 8px rgb(0 0 0 / 0.6);
		pointer-events: none;
	}

	/* Landscape phone: the bar keeps its height low so the space view keeps room. */
	@media (orientation: landscape) and (max-height: 30rem) {
		.timeline {
			padding-block: 0.35rem calc(0.35rem + env(safe-area-inset-bottom));
			gap: 0.25rem;
			font-size: 0.9rem;
		}

		.playback {
			width: 2.5rem;
			height: 2.5rem;
		}

		.track {
			height: 2.25rem;
		}
	}
</style>

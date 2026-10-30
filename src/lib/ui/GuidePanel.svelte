<script lang="ts">
	/**
	 * The guide panel: the written narration, the spoken sentence highlighted,
	 * one next button and one mute toggle.
	 *
	 * A dumb renderer. It dispatches `next-guide-step`; the session applies the
	 * step's camera preset, instant, tilt and POV set, and the scene and timeline
	 * obey the resulting state. The guide never drives the camera from here.
	 *
	 * Muting only silences the voice: the narration text is resolved from the
	 * catalogue when the component renders and does not depend on `muted`. The
	 * speech decisions themselves live in `speech.ts` and are tested there.
	 */
	import { translate } from '$lib/i18n/translate';
	import {
		currentActivity,
		currentGuideStep,
		type SessionEvent,
		type SessionState
	} from '$lib/session';
	import { narrationFor } from './narration';
	import { createSpeech } from './speech';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	let muted = $state(false);
	/** The sentence the voice is on, or null when it is silent. */
	let spokenIndex = $state<number | null>(null);

	const activity = $derived(currentActivity(session));
	const guide = $derived(activity?.guide ?? []);
	const step = $derived(currentGuideStep(session));
	const narration = $derived(narrationFor(session, session.locale));

	const started = $derived(session.phase === 'guide' && step !== undefined);
	const atEnd = $derived(started && session.guideStep === guide.length - 1);
	const visible = $derived(activity !== undefined && guide.length > 0 && session.phase !== 'mission');

	const speech = createSpeech();

	// Re-runs when the step, the locale or the mute toggle changes. The cleanup
	// stops the voice, which is also what stops it on unmount and when leaving
	// the guide (narration becomes null).
	$effect(() => {
		const sentences = narration?.sentences.map((sentence) => sentence.text) ?? [];
		const locale = session.locale;
		const silent = muted || !speech.supported || sentences.length === 0;

		if (silent) {
			speech.cancel();
			spokenIndex = null;
			return;
		}

		speech.speak({ sentences, locale, muted }, (index) => {
			spokenIndex = index;
		});

		return () => {
			speech.cancel();
			spokenIndex = null;
		};
	});
</script>

{#if visible}
	<div class="guide-panel" role="region" aria-label={translate(session.locale, 'term.guide')}>
		{#if narration !== null}
			<p class="narration">
				{#each narration.sentences as sentence, index (index)}<span
						class="sentence"
						class:speaking={spokenIndex === index}>{sentence.text}</span
					>{/each}
			</p>
		{/if}

		<div class="controls">
			<button
				type="button"
				class="next"
				disabled={atEnd}
				aria-label={translate(session.locale, started ? 'guide.next' : 'guide.start')}
				onclick={() => dispatch({ type: 'next-guide-step' })}
			>
				<!-- A chevron, not a word: the control stays readable without reading. -->
				<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M9 5 L17 12 L9 19" />
				</svg>
			</button>

			<button
				type="button"
				class="mute"
				aria-pressed={muted}
				onclick={() => (muted = !muted)}
			>
				{translate(session.locale, muted ? 'guide.unmute' : 'guide.mute')}
			</button>
		</div>
	</div>
{/if}

<style>
	.guide-panel {
		position: fixed;
		top: calc(4.75rem + env(safe-area-inset-top));
		left: calc(1rem + env(safe-area-inset-left));
		z-index: 9;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-width: min(26rem, calc(100vw - 2rem));
		padding: 0.75rem 0.9rem;
		border-radius: 1rem;
		background: rgb(0 0 0 / 0.66);
		color: #fff;
		font-size: 1rem;
		line-height: 1.35;
	}

	.narration {
		margin: 0;
		/* The spans carry the sentence whitespace; keep it visible without
		   letting the panel grow a horizontal scrollbar. */
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.sentence {
		transition: background-color 120ms ease-in-out;
	}

	/* The sentence being spoken reads as the one the voice is on; the words do
	   not move, so a child following along is not lost. */
	.sentence.speaking {
		background: rgb(125 211 252 / 0.35);
		border-radius: 0.25rem;
		box-shadow: 0 0 0 2px rgb(125 211 252 / 0.35);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.next,
	.mute {
		/* One thumb, big enough for a finger. */
		min-height: 44px;
		min-width: 44px;
		padding: 0 1rem;
		border: 1px solid rgb(255 255 255 / 0.45);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.08);
		color: #fff;
		font: inherit;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.next {
		border-color: rgb(125 211 252 / 0.7);
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.75rem;
	}

	.chevron {
		width: 1.5rem;
		height: 1.5rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.next:disabled {
		opacity: 0.45;
		cursor: default;
	}

	/* Muted is carried by more than colour: the label switches too. */
	.mute[aria-pressed='true'] {
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
	}

	.next:focus-visible,
	.mute:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	@media (orientation: landscape) and (max-height: 30rem) {
		.guide-panel {
			max-width: min(22rem, 45vw);
			font-size: 0.9rem;
		}
	}
</style>

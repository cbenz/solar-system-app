<script lang="ts">
	/**
	 * The mission panel: the brief, the phase's prompt and the child's recorded
	 * claim. It never shows an answer, a score or a verdict — the answer is the
	 * scene, so in the observe phase this panel says what to look at.
	 *
	 * Dumb renderer. Every word is a message key, every phase comes from the
	 * session snapshot, and the only things it can do are dispatch the mission
	 * events. The forward control for a phase is shown only when the session
	 * would accept it: `reveal-mission` appears when the success predicate is
	 * already satisfied, so a wrong attempt can never leave the mission stuck in
	 * the observe phase.
	 */
	import type { MessageKey } from '$lib/i18n/messages';
	import { translate } from '$lib/i18n/translate';
	import type { Locale } from '$lib/i18n/locale';
	import type { MissionPhase, SceneMission, SessionEvent } from '$lib/session';

	let {
		mission,
		locale,
		dispatch
	}: {
		mission: SceneMission | null;
		locale: Locale;
		dispatch: (event: SessionEvent) => void;
	} = $props();

	const PHASE_LABEL: Record<MissionPhase, MessageKey> = {
		predict: 'mission.phase.predict',
		manipulate: 'mission.phase.manipulate',
		observe: 'mission.phase.observe',
		explain: 'mission.phase.explain'
	};
</script>

{#if mission !== null}
	<section
		class="mission-panel"
		aria-live="polite"
		aria-label={translate(locale, 'term.mission')}
	>
		<header>
			<span class="phase">{translate(locale, PHASE_LABEL[mission.phase])}</span>
			<span class="name">{translate(locale, mission.label)}</span>
		</header>

		<div class="brief-row">
			{#if mission.motif !== null}
				<!-- The brief's picture, derived from the scene: no words needed to read it. -->
				<svg class="motif" viewBox="0 0 48 36" aria-hidden="true">
					<line class="horizon" x1="2" y1="24" x2="46" y2="24" />
					{#if mission.motif === 'sun-high'}
						<circle class="sun" cx="24" cy="8" r="5" />
					{:else if mission.motif === 'sun-on-horizon'}
						<circle class="sun" cx="24" cy="24" r="5" />
					{:else}
						<circle class="sun" cx="24" cy="34" r="5" />
					{/if}
				</svg>
			{/if}
			<p class="brief">{translate(locale, mission.brief)}</p>
		</div>

		<!-- In the manipulate phase the prompt is the brief; say it once. -->
		{#if mission.prompt !== mission.brief}
			<p class="prompt">{translate(locale, mission.prompt)}</p>
		{/if}

		{#if mission.prediction !== null}
			<p class="prediction">
				{translate(locale, 'mission.prediction.recorded', {
					statement: translate(locale, mission.prediction.statement)
				})}
			</p>
		{/if}

		{#if mission.feedback !== null}
			<p class="feedback">{translate(locale, mission.feedback)}</p>
		{/if}

		{#if mission.phase === 'predict'}
			<button type="button" class="action" onclick={() => dispatch({ type: 'record-prediction' })}>
				{translate(locale, 'mission.prediction.commit')}
			</button>
		{:else if mission.phase === 'manipulate'}
			{#if mission.outcome?.state === 'right'}
				<button type="button" class="action" onclick={() => dispatch({ type: 'reveal-mission' })}>
					{translate(locale, 'mission.look')}
				</button>
			{/if}
		{:else if mission.phase === 'observe'}
			<button type="button" class="action" onclick={() => dispatch({ type: 'explain-mission' })}>
				{translate(locale, 'mission.explain')}
			</button>
		{:else}
			<button type="button" class="action" onclick={() => dispatch({ type: 'finish-mission' })}>
				{translate(locale, 'mission.finish')}
			</button>
		{/if}

		<button type="button" class="abandon" onclick={() => dispatch({ type: 'abandon-mission' })}>
			{translate(locale, 'mission.abandon')}
		</button>
	</section>
{/if}

<style>
	/* One thumb: above the toolbar, which is itself above the POV strip. */
	.mission-panel {
		position: fixed;
		bottom: calc(
			var(--timeline-height, 8rem) + clamp(9rem, 28vh, 16rem) + 4.5rem +
				env(safe-area-inset-bottom)
		);
		left: calc(1rem + env(safe-area-inset-left));
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: min(20rem, calc(100vw - 2rem));
		padding: 0.8rem 0.9rem;
		border: 1px solid rgb(255 255 255 / 0.22);
		border-radius: 1rem;
		background: rgb(0 0 0 / 0.68);
		color: #fff;
		font-size: 0.95rem;
		line-height: 1.35;
	}

	header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.phase {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.name {
		font-weight: 600;
	}

	p {
		margin: 0;
	}

	.brief-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.brief {
		font-weight: 600;
	}

	.motif {
		flex: none;
		width: 2.6rem;
		height: auto;
	}

	.motif .horizon {
		stroke: rgb(255 255 255 / 0.65);
		stroke-width: 2;
		stroke-linecap: round;
	}

	.motif .sun {
		fill: #fde68a;
	}

	.prompt {
		opacity: 0.9;
	}

	.prediction {
		font-style: italic;
		opacity: 0.85;
	}

	/* "Almost": words the child can correct from, never a number or a score. */
	.feedback {
		color: #fde68a;
	}

	.action,
	.abandon {
		/* One thumb, big enough for a finger. */
		min-height: 44px;
		padding: 0 0.9rem;
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

	.action {
		align-self: flex-start;
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
		font-weight: 600;
	}

	.abandon {
		align-self: flex-start;
		border-color: rgb(125 211 252 / 0.7);
		opacity: 0.85;
	}

	.action:focus-visible,
	.abandon:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	@media (orientation: landscape) {
		.mission-panel {
			bottom: calc(var(--timeline-height, 6rem) + 0.5rem + env(safe-area-inset-bottom));
			max-width: min(20rem, 45vw);
		}
	}
</style>

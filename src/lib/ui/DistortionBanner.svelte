<script lang="ts">
	/**
	 * The settings banner: which distortion is active, the two scale switches
	 * (ADR-0003) and the visibility limit (ticket 16).
	 *
	 * Dumb renderer. The session decides which sentence to show
	 * (`distortionNotice`) and owns every switch; this component only resolves
	 * the message keys through `t()` and dispatches the settings events. It covers
	 * no part of the scene the child might want to touch: the container ignores
	 * pointer events, only the switches take them.
	 */
	import { translate } from '$lib/i18n/translate';
	import {
		distortionNotice,
		type SessionEvent,
		type SessionState
	} from '$lib/session';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	// The keys come from the session; the words come from the catalogue.
	const notice = $derived(distortionNotice(session));
	const visibilityLimit = $derived(session.settings.visibilityLimit === true);
	const switches = $derived([
		{ pressed: session.trueDistance, label: 'term.true-distance' as const, event: { type: 'toggle-true-distance' as const } },
		{ pressed: session.trueSize, label: 'term.true-size' as const, event: { type: 'toggle-true-size' as const } },
		{
			pressed: visibilityLimit,
			label: 'term.visibility-limit' as const,
			event: { type: 'set-setting' as const, key: 'visibilityLimit', value: !visibilityLimit }
		}
	]);
</script>

<div class="scale-banner">
	{#if notice.length > 0}
		<ul class="notice" aria-live="polite">
			{#each notice as key (key)}
				<li>{translate(session.locale, key)}</li>
			{/each}
		</ul>
	{/if}

	<div class="switches">
		{#each switches as control (control.label)}
			<button
				type="button"
				class="switch"
				aria-pressed={control.pressed}
				onclick={() => dispatch(control.event)}
			>
				{translate(session.locale, control.label)}
			</button>
		{/each}
	</div>
</div>

<style>
	.scale-banner {
		position: fixed;
		left: calc(1rem + env(safe-area-inset-left));
		bottom: calc(7.5rem + env(safe-area-inset-bottom));
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: min(22rem, calc(100vw - 2rem));
		/* The words never block the scene: only the switches are touchable. */
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.notice {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		color: #fff;
		font-size: 0.9rem;
		line-height: 1.3;
		text-shadow: 0 1px 3px rgb(0 0 0 / 0.9);
	}

	.switches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.switch {
		/* One thumb, big enough for a finger: 44px minimum in both directions. */
		min-height: 44px;
		min-width: 44px;
		padding: 0 0.9rem;
		pointer-events: auto;
		border: 1px solid rgb(255 255 255 / 0.45);
		border-radius: 999px;
		background: rgb(0 0 0 / 0.55);
		color: #fff;
		font: inherit;
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	/* The pressed state is carried by more than colour. */
	.switch[aria-pressed='true'] {
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
		font-weight: 600;
	}

	.switch:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	/* Landscape phone: the timeline is shorter, so the banner drops with it. */
	@media (orientation: landscape) and (max-height: 30rem) {
		.scale-banner {
			bottom: calc(5.5rem + env(safe-area-inset-bottom));
			font-size: 0.85rem;
		}
	}
</style>

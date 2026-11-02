<script lang="ts">
	/**
	 * The sandbox toolbar: one button per body, opening that body's properties
	 * card. Dumb renderer — the selected body lives in session state.
	 */
	import { translate } from '$lib/i18n/translate';
	import type { BodyId, SessionEvent, SessionState } from '$lib/session';
	import { BODY_LABEL_KEY } from './body-label';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	// The planets are in the map and can be tapped, but only the Sun, the Earth
	// and the Moon have editable properties; listing all ten would crowd the
	// toolbar on a phone.
	const EDITABLE_BODIES: readonly BodyId[] = ['sun', 'earth', 'moon'];
	const bodies = $derived(session.subsystem.filter((id) => EDITABLE_BODIES.includes(id)));
</script>

{#if session.mode === 'sandbox'}
	<div class="sandbox-toolbar" role="toolbar" aria-label={translate(session.locale, 'term.sandbox')}>
		{#each bodies as bodyId (bodyId)}
			{@const label = translate(session.locale, BODY_LABEL_KEY[bodyId as BodyId])}
			<button
				type="button"
				class="body"
				aria-pressed={session.sandbox.selectedBodyId === bodyId}
				aria-label={translate(session.locale, 'sandbox.properties.open', { body: label })}
				onclick={() =>
					dispatch({
						type: 'select-body',
						bodyId: session.sandbox.selectedBodyId === bodyId ? null : bodyId
					})}
			>
				{label}
			</button>
		{/each}

		<button
			type="button"
			class="recenter"
			onclick={() => dispatch({ type: 'reset-camera' })}
		>
			{translate(session.locale, 'camera.reset')}
		</button>
	</div>
{/if}

<style>
	.sandbox-toolbar {
		position: fixed;
		top: calc(0.75rem + env(safe-area-inset-top));
		left: 0.75rem;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		max-width: calc(100vw - 8rem);
		padding: 0.35rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.62);
		color: #fff;
		font-size: 0.95rem;
	}

	.body,
	.recenter {
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

	.recenter {
		border-color: rgb(125 211 252 / 0.7);
		background: transparent;
	}

	.body[aria-pressed='true'] {
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
		font-weight: 600;
	}

	.body:focus-visible,
	.recenter:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	@media (max-width: 34rem) {
		.sandbox-toolbar {
			max-width: calc(100vw - 5rem);
			flex-wrap: wrap;
			border-radius: 1rem;
		}
	}
</style>

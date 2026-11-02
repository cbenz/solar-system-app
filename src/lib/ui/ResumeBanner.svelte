<script lang="ts">
	/**
	 * The resume affordance: what "the last activity comes back" looks like.
	 *
	 * The app opens on the Earth, as on a first visit — it does not jump back into
	 * an activity, and it cannot restore the instant the child left at, because
	 * only four fields are ever stored (`$lib/persist/storage.ts`). What comes
	 * back is one visible control naming the last activity; one tap dispatches the
	 * ordinary `open-activity`, the same event a marker tap or a sidebar row does.
	 *
	 * It sits centred near the top, below the sandbox toolbar, in the sandbox
	 * only. It is not the only way to that activity: the bottom-left sidebar
	 * lists it too, so no destination lives only in a top corner. The page hides
	 * it once the child has opened anything, so leaving an activity does not
	 * immediately offer to reopen it.
	 */
	import { translate } from '$lib/i18n/translate';
	import type { SessionState } from '$lib/session';
	import type { Activity } from '../../activities/types';

	let {
		session,
		activity,
		onTake
	}: { session: SessionState; activity: Activity; onTake: () => void } = $props();

	const label = $derived(
		translate(session.locale, 'sidebar.resume', {
			activity: translate(session.locale, activity.title)
		})
	);
</script>

<button type="button" class="resume" onclick={onTake}>
	<span class="arrow" aria-hidden="true">▶</span>
	<span class="label">{label}</span>
</button>

<style>
	.resume {
		position: fixed;
		top: calc(4.5rem + env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 11;
		min-height: 44px;
		min-width: 44px;
		max-width: calc(100vw - 2rem);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 1rem;
		border: 1px solid rgb(125 211 252 / 0.7);
		border-radius: 999px;
		background: rgb(0 0 0 / 0.72);
		color: #fff;
		font: inherit;
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.resume:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>

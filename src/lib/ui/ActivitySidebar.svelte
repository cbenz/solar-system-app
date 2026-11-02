<script lang="ts">
	/**
	 * The activity sidebar: every activity in the registry, with its level.
	 *
	 * This is the parent's list ("hand my child the one that matches what they
	 * just asked about"), not a mission control: one row per activity, one tap to
	 * open it, no progress and no scores. Opening a row dispatches the same
	 * `open-activity` event a marker tap does, so the sandbox state saving rule is
	 * unchanged.
	 *
	 * Closed by default: the app opens on the Earth and nothing else. Closed, the
	 * only thing on screen is one 44 px control at the bottom left, inside the
	 * timeline's gutter, so it never covers the space view. On a phone in
	 * landscape the open list becomes a left column and gives the space view its
	 * height back.
	 *
	 * The list itself is derived (`activity-list.ts`), sorted by level then title
	 * key. The component resolves the title and the level through the catalogue;
	 * a level is printed as a number, never as an age or a grade (GLOSSARY).
	 */
	import { translate } from '$lib/i18n/translate';
	import type { SessionEvent, SessionState } from '$lib/session';
	import { activityList } from './activity-list';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	let open = $state(false);

	const items = $derived(activityList(session.activities));

	function choose(activityId: string): void {
		open = false;
		dispatch({ type: 'open-activity', activityId });
	}
</script>

<svelte:window onkeydown={(event) => (event.key === 'Escape' ? (open = false) : undefined)} />

{#if session.mode === 'sandbox'}
	<button
		type="button"
		class="sidebar-toggle"
		aria-expanded={open}
		aria-controls="activity-sidebar"
		aria-label={translate(session.locale, 'sidebar.open')}
		title={translate(session.locale, 'sidebar.open')}
		onclick={() => (open = !open)}
	>
		<span aria-hidden="true">☰</span>
	</button>

	{#if open}
		<nav id="activity-sidebar" class="sidebar" aria-label={translate(session.locale, 'sidebar.title')}>
			<div class="sidebar-head">
				<h2>{translate(session.locale, 'sidebar.title')}</h2>
				<button
					type="button"
					class="close"
					aria-label={translate(session.locale, 'sidebar.close')}
					onclick={() => (open = false)}
				>
					<span aria-hidden="true">✕</span>
				</button>
			</div>

			<ul class="activities">
				{#each items as item (item.id)}
					<li>
						<button type="button" class="activity" onclick={() => choose(item.id)}>
							<span
								class="level"
								aria-label={translate(session.locale, 'sidebar.level', { level: item.level })}
								>{translate(session.locale, 'sidebar.level.badge', { level: item.level })}</span
							>
							<span class="title">{translate(session.locale, item.titleKey)}</span>
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
{/if}

<style>
	/*
	 * The one visible control. Bottom left, inside the timeline's left gutter (see
	 * `Timeline.svelte`), 44 × 44 px: one thumb, in portrait and in landscape.
	 */
	.sidebar-toggle {
		position: fixed;
		left: calc(0.5rem + env(safe-area-inset-left));
		bottom: calc(0.5rem + env(safe-area-inset-bottom));
		z-index: 12;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 1px solid rgb(255 255 255 / 0.45);
		border-radius: 0.75rem;
		background: rgb(0 0 0 / 0.72);
		color: #fff;
		font: inherit;
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.sidebar-toggle:focus-visible,
	.close:focus-visible,
	.activity:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	/*
	 * Portrait: a sheet above the toggle, full width, at most 55 % of the height.
	 * Landscape: a left column, so the list takes width and gives the space view
	 * its height back. Both stop above the toggle, which stays tappable.
	 */
	.sidebar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(3.5rem + env(safe-area-inset-bottom));
		z-index: 11;
		max-height: min(55vh, 26rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.75rem 0.75rem 0.5rem;
		background: rgb(0 0 0 / 0.86);
		color: #fff;
		border-radius: 1rem 1rem 0 0;
		font-size: 1rem;
	}

	@media (orientation: landscape) {
		.sidebar {
			right: auto;
			top: 0;
			bottom: calc(3.5rem + env(safe-area-inset-bottom));
			width: min(20rem, 45vw);
			max-height: none;
			border-radius: 0 1rem 1rem 0;
		}
	}

	.sidebar-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-inline-start: 0.25rem;
	}

	.sidebar-head h2 {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.close {
		min-width: 44px;
		min-height: 44px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 1px solid rgb(255 255 255 / 0.35);
		border-radius: 0.75rem;
		background: rgb(255 255 255 / 0.08);
		color: #fff;
		font: inherit;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.activities {
		margin: 0.25rem 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.activity {
		width: 100%;
		min-height: 48px;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.35rem 0.75rem;
		border: 1px solid rgb(255 255 255 / 0.22);
		border-radius: 0.75rem;
		background: rgb(255 255 255 / 0.06);
		color: #fff;
		font: inherit;
		text-align: start;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.activity:active {
		background: rgb(255 255 255 / 0.2);
	}

	/* The level is a number in a badge, never an age and never a grade. */
	.level {
		flex: 0 0 auto;
		min-width: 2rem;
		padding: 0.2rem 0.35rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.14);
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	.title {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>

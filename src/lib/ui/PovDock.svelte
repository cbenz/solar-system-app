<script lang="ts">
	/**
	 * The tiled strip of POV panels, flush with the edge of the screen.
	 *
	 * Portrait: a row above the timeline, full width. Landscape: a column on the
	 * right, above the timeline, so the space view keeps its width. The grid takes
	 * two and three observers without a rewrite (ticket 11 depends on that).
	 */
	import PovPanel from './PovPanel.svelte';
	import type { Locale } from '$lib/i18n/locale';
	import type { SceneObserver } from '$lib/session';

	let { observers, locale }: { observers: SceneObserver[]; locale: Locale } = $props();
</script>

{#if observers.length > 0}
	<div class="pov-dock">
		{#each observers as entry (entry.observer.id)}
			<PovPanel {entry} {locale} />
		{/each}
	</div>
{/if}

<style>
	/*
	 * Flush tiling: no gap, no margin, no rounded corner, no shadow. The panels
	 * are the edge of the screen, not cards floating above it (GLOSSARY, POV).
	 */
	.pov-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: var(--timeline-height, 8rem);
		height: clamp(9rem, 28vh, 16rem);
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
		gap: 0;
		z-index: 5;
	}

	/*
	 * Landscape on a phone: a side column, so the space view keeps the width it
	 * needs. At 568×320 the column is 32 % wide and the space view keeps 68 %;
	 * at 320×568 portrait the strip is 28 % of the height. The space view stays
	 * the largest area in both (ticket 11).
	 */
	@media (orientation: landscape) {
		.pov-dock {
			left: auto;
			top: 0;
			bottom: var(--timeline-height, 6rem);
			width: min(32vw, 22rem);
			height: auto;
			grid-template-columns: 1fr;
			grid-auto-rows: 1fr;
		}
	}
</style>

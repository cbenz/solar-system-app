<script lang="ts">
	/**
	 * The name of the place each observer stands on, near its dot.
	 *
	 * The name is computed from the latitude by the session module (`placeName`)
	 * and resolved in the child's language here (ADR-0006); the renderer only
	 * says where the dot is on screen. The label must not grab pointer events —
	 * it floats over the globe and the child keeps dragging underneath it — nor
	 * be selectable.
	 */
	import type { Locale } from '$lib/i18n/locale';
	import { translate } from '$lib/i18n/translate';
	import type { ObserverLabelPosition } from '$lib/scene/scene';
	import { placeName, type SceneObserver } from '$lib/session';

	let {
		entries,
		positions,
		locale
	}: {
		entries: SceneObserver[];
		positions: Record<string, ObserverLabelPosition>;
		locale: Locale;
	} = $props();
</script>

{#each entries as entry (entry.observer.id)}
	{@const position = positions[entry.observer.id]}
	{#if position !== undefined && position.visible}
		<span
			class="observer-label"
			style:left="{position.x}px"
			style:top="{position.y}px"
			style:color={entry.observer.colour}
		>
			{translate(locale, placeName(entry.observer.latitudeDeg))}
		</span>
	{/if}
{/each}

<style>
	.observer-label {
		position: fixed;
		z-index: 3;
		transform: translate(-50%, -180%);
		max-width: 12rem;
		padding: 0.1rem 0.35rem;
		border-radius: 0.35rem;
		background: rgba(0, 0, 0, 0.55);
		font-size: clamp(0.7rem, 2.6vw, 0.95rem);
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		text-align: center;
		text-shadow: 0 1px 2px #000;
		pointer-events: none;
		user-select: none;
	}
</style>

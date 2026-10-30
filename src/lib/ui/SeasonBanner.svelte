<script lang="ts">
	/**
	 * The seasons measurement panel: the Earth–Sun distance right now, and the
	 * one sentence that keeps the exaggerated shape honest. Dumb renderer — the
	 * distance and the flag come from the session's `season` snapshot.
	 */
	import { translate } from '$lib/i18n/translate';
	import type { Locale } from '$lib/i18n/locale';
	import type { SeasonScene } from '$lib/session';

	let { season, locale }: { season: SeasonScene | null; locale: Locale } = $props();

	const millionKm = $derived(
		season === null
			? ''
			: new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
					minimumFractionDigits: 1,
					maximumFractionDigits: 1
				}).format(season.earthSunDistanceKm / 1_000_000)
	);
</script>

{#if season !== null}
	<div class="season-banner" aria-live="polite">
		<p class="distance">
			{translate(locale, 'activity.seasons.scene.distance', { distance: millionKm })}
		</p>
		{#if season.exaggeratedOrbit}
			<p class="hypothesis">{translate(locale, 'activity.seasons.scene.notRealOrbit')}</p>
		{/if}
	</div>
{/if}

<style>
	.season-banner {
		position: fixed;
		bottom: calc(6.5rem + env(safe-area-inset-bottom));
		left: 0.75rem;
		z-index: 9;
		max-width: min(22rem, calc(100vw - 1.5rem));
		padding: 0.55rem 0.8rem;
		border-radius: 0.9rem;
		background: rgb(0 0 0 / 0.66);
		color: #fff;
		font-size: 0.85rem;
		pointer-events: none;
	}

	.distance {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.hypothesis {
		margin: 0.35rem 0 0;
		color: #fde68a;
	}
</style>

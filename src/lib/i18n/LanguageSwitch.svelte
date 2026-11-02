<script lang="ts">
	/**
	 * The language switch: a dumb control. The session owns the active locale, so
	 * this component only reports the language the child picked and shows the one
	 * it would switch to, in that language's own words.
	 */
	import { nativeNameKey } from './messages';
	import { translate } from './translate';
	import type { Locale } from './locale';

	let { locale, onSelect }: { locale: Locale; onSelect: (locale: Locale) => void } = $props();

	// The button shows the language it switches to, in that language's own words.
	const target = $derived<Locale>(locale === 'fr' ? 'en' : 'fr');
	const label = $derived(translate(target, nativeNameKey[target]));
	const action = $derived(translate(locale, 'language.switch.action', { language: label }));
</script>

<button
	type="button"
	class="language-switch"
	lang={target}
	aria-label={action}
	title={action}
	onclick={() => onSelect(target)}
>
	{label}
</button>

<style>
	.language-switch {
		position: fixed;
		right: calc(1rem + env(safe-area-inset-right));
		bottom: calc(1rem + env(safe-area-inset-bottom));
		z-index: 10;
		min-width: 44px;
		min-height: 44px;
		padding: 0 1rem;
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

	.language-switch:active {
		background: rgb(255 255 255 / 0.2);
	}
</style>

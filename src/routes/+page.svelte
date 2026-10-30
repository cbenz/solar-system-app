<script lang="ts">
	import { onMount } from 'svelte';
	import { createScene } from '$lib/scene/scene';
	import LanguageSwitch from '$lib/i18n/LanguageSwitch.svelte';
	import { t } from '$lib/i18n/store.svelte';

	let host: HTMLDivElement;

	onMount(() => {
		const scene = createScene(host);
		return () => scene.destroy();
	});
</script>

<svelte:head>
	<title>{t('app.title')}</title>
</svelte:head>

<!-- The scene is the app: no chrome, no text, no controls beyond the language switch. -->
<div class="scene" bind:this={host}></div>
<LanguageSwitch />

<style>
	.scene {
		position: fixed;
		inset: 0;
		touch-action: none;
	}
</style>

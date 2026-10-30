<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { getLocale, initLocale } from '$lib/i18n/store.svelte';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	// The device language decides the first screen; later switches leave it alone.
	if (browser) initLocale();

	$effect(() => {
		document.documentElement.lang = getLocale();
	});
</script>

{@render children()}

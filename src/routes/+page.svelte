<script lang="ts">
	import { onMount } from 'svelte';
	import { createScene } from '$lib/scene/scene';

	let host: HTMLDivElement;

	onMount(() => {
		const scene = createScene(host);
		return () => scene.destroy();
	});
</script>

<!-- The scene is the app: no chrome, no text, no controls. -->
<div class="scene" bind:this={host}></div>

<style>
	.scene {
		position: fixed;
		inset: 0;
		touch-action: none;
	}
</style>

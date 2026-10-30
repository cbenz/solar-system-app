<script lang="ts">
	import { onMount } from 'svelte';
	import { detectLocale } from '$lib/i18n/locale';
	import { createScene, type SceneHandle } from '$lib/scene/scene';
	import {
		applyEvent,
		buildScene,
		createInitialState,
		type SessionEvent,
		type SessionState
	} from '$lib/session';
	import Timeline from '$lib/ui/Timeline.svelte';

	let host: HTMLDivElement;
	let scene: SceneHandle | null = null;
	let state = $state<SessionState>(createInitialState({ locale: detectLocale() }));

	function dispatch(event: SessionEvent): void {
		const result = applyEvent(state, event);
		state = result.state;
		scene?.update(result.scene);
	}

	onMount(() => {
		const created = createScene(host);
		created.update(buildScene(state));
		scene = created;
		return () => {
			created.destroy();
			scene = null;
		};
	});
</script>

<!-- The scene is the app: the timeline is the only chrome on top of it. -->
<div class="scene" bind:this={host}></div>
<Timeline session={state} {dispatch} />

<style>
	.scene {
		position: fixed;
		inset: 0;
		touch-action: none;
	}
</style>

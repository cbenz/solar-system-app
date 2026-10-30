<script lang="ts">
	/**
	 * The one page. It owns the session state, wires the three renderers to it,
	 * and dispatches events. No behaviour lives here: every rule is in
	 * `$lib/session`, every string is in `$lib/i18n`.
	 */
	import { onMount } from 'svelte';
	import LanguageSwitch from '$lib/i18n/LanguageSwitch.svelte';
	import { resolveLocale } from '$lib/i18n/detect';
	import { translate } from '$lib/i18n/translate';
	import { createScene, type SceneHandle } from '$lib/scene/scene';
	import {
		applyEvent,
		buildScene,
		createInitialState,
		type SessionEvent,
		type SessionState
	} from '$lib/session';
	import ScaleBanner from '$lib/ui/ScaleBanner.svelte';
	import Timeline from '$lib/ui/Timeline.svelte';

	// The device language decides the first screen (ADR-0006); switching is an event.
	const deviceLanguage = typeof navigator === 'undefined' ? undefined : navigator.language;

	let host: HTMLDivElement;
	let scene: SceneHandle | null = null;
	let state = $state<SessionState>(createInitialState({ locale: resolveLocale(deviceLanguage) }));

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

<svelte:head>
	<title>{translate(state.locale, 'app.title')}</title>
</svelte:head>

<div class="scene" bind:this={host}></div>
<ScaleBanner session={state} {dispatch} />
<Timeline session={state} {dispatch} />
<LanguageSwitch locale={state.locale} onSelect={(locale) => dispatch({ type: 'set-locale', locale })} />

<style>
	.scene {
		position: fixed;
		inset: 0;
		touch-action: none;
	}
</style>

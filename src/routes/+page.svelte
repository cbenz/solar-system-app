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
	import type { PlacementIntent } from '$lib/scene/gesture';
	import { createScene, type ObserverLabelPosition, type SceneHandle } from '$lib/scene/scene';
	import {
		applyEvent,
		bodyPositionAu,
		buildScene,
		clampCamera,
		createInitialState,
		placementTargetId,
		type BodyId,
		type SceneSnapshot,
		type SessionEvent,
		type SessionState,
		type Vec3
	} from '$lib/session';
	import ObserverLabels from '$lib/ui/ObserverLabels.svelte';
	import ActivityToolbar from '$lib/ui/ActivityToolbar.svelte';
	import MissionPanel from '$lib/ui/MissionPanel.svelte';
	import BodyPropertiesCard from '$lib/ui/BodyPropertiesCard.svelte';
	import SandboxToolbar from '$lib/ui/SandboxToolbar.svelte';
	import PovDock from '$lib/ui/PovDock.svelte';
	import ScaleBanner from '$lib/ui/ScaleBanner.svelte';
	import Timeline from '$lib/ui/Timeline.svelte';

	// The device language decides the first screen (ADR-0006); switching is an event.
	const deviceLanguage = typeof navigator === 'undefined' ? undefined : navigator.language;

	let host: HTMLDivElement;
	let scene: SceneHandle | null = null;
	let session = $state<SessionState>(createInitialState({ locale: resolveLocale(deviceLanguage) }));
	let labelPositions = $state<Record<string, ObserverLabelPosition>>({});
	const snapshot = $derived<SceneSnapshot>(buildScene(session));

	function dispatch(event: SessionEvent): void {
		const result = applyEvent(session, event);
		session = result.state;
		scene?.update(result.scene);
	}

	/**
	 * A placement gesture names the POV it lands on: a drag keeps the dot the
	 * child grabbed, a tap goes to the selected POV (the first one, for now).
	 */
	function placeObserver(intent: PlacementIntent): void {
		const povId = intent.kind === 'drag' ? intent.observerId : placementTargetId(session);
		dispatch({ type: 'place-observer', povId, latitudeDeg: intent.latitudeDeg });
	}

	/**
	 * A dragged body arrives relative to the Earth, the drawn frame's origin. The
	 * Sun's event wants an absolute sandbox position, so the Earth is added back;
	 * a dropped moon already speaks relative to its primary.
	 */
	function dropBody(bodyId: BodyId, position: Vec3): void {
		if (bodyId === 'sun') {
			const earth = bodyPositionAu(session, 'earth', session.instant);
			dispatch({
				type: 'move-body',
				bodyId: 'sun',
				position: { x: earth.x + position.x, y: earth.y + position.y, z: earth.z + position.z }
			});
			return;
		}

		// A drag-and-release is a drop with no velocity: the session's documented
		// convention (circular at the drop radius) supplies the orbit.
		dispatch({ type: 'drop-body', bodyId, position, velocity: null });
	}

	onMount(() => {
		const created = createScene(host, {
			// The renderer asks; the session decides where the camera may go.
			clampCamera: (requested) => clampCamera(session, requested),
			onCameraChange: (camera) => dispatch({ type: 'set-camera', camera }),
			onOpenActivity: (activityId) => dispatch({ type: 'open-activity', activityId }),
			onPlacement: placeObserver,
			canDragBodies: () => session.mode === 'sandbox',
			onBodyDrop: dropBody,
			onLabelsChange: (labels) => {
				labelPositions = Object.fromEntries(labels.map((label) => [label.id, label]));
			}
		});
		created.update(buildScene(session));
		scene = created;
		return () => {
			created.destroy();
			scene = null;
		};
	});
</script>

<svelte:head>
	<title>{translate(session.locale, 'app.title')}</title>
</svelte:head>

<div class="scene" bind:this={host}></div>
<ObserverLabels entries={snapshot.observers} positions={labelPositions} locale={session.locale} />
<ActivityToolbar session={session} {dispatch} />
<MissionPanel mission={snapshot.mission} locale={session.locale} {dispatch} />
<SandboxToolbar session={session} {dispatch} />
<BodyPropertiesCard session={session} {dispatch} />
<PovDock observers={snapshot.observers} />
<ScaleBanner session={session} {dispatch} />
<Timeline session={session} {dispatch} />
<LanguageSwitch locale={session.locale} onSelect={(locale) => dispatch({ type: 'set-locale', locale })} />

<style>
	.scene {
		position: fixed;
		inset: 0;
		touch-action: none;
	}
</style>

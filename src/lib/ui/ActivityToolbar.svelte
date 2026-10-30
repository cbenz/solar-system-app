<script lang="ts">
	/**
	 * The activity toolbar: the activity's camera presets and the way out.
	 *
	 * Dumb renderer. The presets come from the open activity's data, never from a
	 * hard-coded list; the session validates the selection and owns the camera.
	 */
	import { translate } from '$lib/i18n/translate';
	import { currentActivity, type SessionEvent, type SessionState } from '$lib/session';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	const activity = $derived(currentActivity(session));
</script>

{#if activity !== undefined}
	<div class="activity-toolbar" role="toolbar" aria-label={translate(session.locale, 'term.activity')}>
		<span class="activity-name">{translate(session.locale, 'term.activity')}</span>

		{#each activity.cameraPresets as preset (preset.id)}
			<button
				type="button"
				class="preset"
				aria-pressed={session.camera.distance === preset.distance &&
					session.camera.pitch === preset.pitch}
				onclick={() => dispatch({ type: 'select-camera-preset', presetId: preset.id })}
			>
				{translate(session.locale, preset.label)}
			</button>
		{/each}

		{#if session.phase === 'sandbox'}
			{#each activity.missions as mission (mission.id)}
				<button
					type="button"
					class="mission"
					onclick={() => dispatch({ type: 'start-mission', missionId: mission.id })}
				>
					{translate(session.locale, mission.label)}
				</button>
			{/each}
		{/if}

		<button
			type="button"
			class="leave"
			onclick={() => dispatch({ type: 'leave-activity' })}
		>
			{translate(session.locale, 'activity.leave')}
		</button>
	</div>
{/if}

<style>
	.activity-toolbar {
		position: fixed;
		top: calc(0.75rem + env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: calc(100vw - 1.5rem);
		padding: 0.35rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.62);
		color: #fff;
		font-size: 0.95rem;
	}

	.activity-name {
		padding-inline: 0.65rem;
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.75rem;
	}

	.preset,
	.mission,
	.leave {
		/* One thumb, big enough for a finger. */
		min-height: 44px;
		padding: 0 0.9rem;
		border: 1px solid rgb(255 255 255 / 0.45);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.08);
		color: #fff;
		font: inherit;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.preset[aria-pressed='true'] {
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
		font-weight: 600;
	}

	.leave {
		border-color: rgb(125 211 252 / 0.7);
	}

	.preset:focus-visible,
	.mission:focus-visible,
	.leave:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	@media (max-width: 34rem) {
		.activity-toolbar {
			flex-wrap: wrap;
			border-radius: 1rem;
		}

		.activity-name {
			display: none;
		}
	}
</style>

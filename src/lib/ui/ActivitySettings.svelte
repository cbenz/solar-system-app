<script lang="ts">
	/**
	 * The open activity's own settings: a slider for each number, a two-state
	 * button for each boolean. Dumb renderer — the activity declares the settings
	 * and their ranges, the session validates every value.
	 *
	 * `playbackSpeed` is omitted here because the timeline already owns that
	 * control; showing it twice would be two ways to set one value. Everything
	 * else an activity declares is surfaced, which is what puts the seasons tilt
	 * and the exaggerated-orbit hypothesis within the child's reach.
	 */
	import { translate } from '$lib/i18n/translate';
	import { currentActivity, type SessionEvent, type SessionState } from '$lib/session';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	const activity = $derived(currentActivity(session));
	const controls = $derived(
		(activity?.settings ?? []).filter((setting) => setting.key !== 'playbackSpeed')
	);
	const visible = $derived(activity !== undefined && controls.length > 0 && session.phase !== 'mission');

	function valueOf(key: string): number | boolean {
		const value = session.settings[key];
		return typeof value === 'boolean' ? value : typeof value === 'number' ? value : 0;
	}

	function numberValue(key: string): number {
		const value = valueOf(key);
		return typeof value === 'number' ? value : 0;
	}

	function displayNumber(value: number): string {
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	}
</script>

{#if visible && activity !== undefined}
	<div class="activity-settings" role="group" aria-label={translate(session.locale, 'term.activity')}>
		{#each controls as setting (setting.key)}
			{#if setting.kind === 'number'}
				<label class="row">
					<span class="name">
						{translate(session.locale, setting.label)}
						<span class="value">{displayNumber(numberValue(setting.key))}</span>
					</span>
					<input
						type="range"
						min={setting.min}
						max={setting.max}
						step={setting.step ?? 0.1}
						value={numberValue(setting.key)}
						oninput={(event) =>
							dispatch({
								type: 'set-setting',
								key: setting.key,
								value: Number(event.currentTarget.value)
							})}
					/>
				</label>
			{:else}
				<button
					type="button"
					class="toggle"
					aria-pressed={valueOf(setting.key) === true}
					onclick={() =>
						dispatch({
							type: 'set-setting',
							key: setting.key,
							value: valueOf(setting.key) !== true
						})}
				>
					{translate(session.locale, setting.label)}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.activity-settings {
		position: fixed;
		top: calc(4.5rem + env(safe-area-inset-top));
		right: 0.75rem;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: min(17rem, calc(100vw - 1.5rem));
		padding: 0.55rem 0.7rem;
		border-radius: 1rem;
		background: rgb(0 0 0 / 0.66);
		color: #fff;
		font-size: 0.85rem;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.name {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		opacity: 0.9;
	}

	.value {
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}

	input[type='range'] {
		width: 100%;
		min-height: 44px;
		accent-color: #7dd3fc;
		touch-action: manipulation;
	}

	.toggle {
		min-height: 44px;
		padding: 0 0.8rem;
		border: 1px solid rgb(255 255 255 / 0.45);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.08);
		color: inherit;
		font: inherit;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.toggle[aria-pressed='true'] {
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
		font-weight: 600;
	}

	input[type='range']:focus-visible,
	.toggle:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}
</style>

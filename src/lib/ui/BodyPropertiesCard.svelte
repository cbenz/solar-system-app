<script lang="ts">
	/**
	 * The properties card for one body.
	 *
	 * It SHOWS values by default. Editing is a deliberate act: the pencil (a real
	 * ≥44 px control, `aria-pressed`) starts a session edit, the sliders dispatch
	 * `set-body-parameter` live, and the confirm/cancel pair ends it. Cancelling
	 * restores the values the card showed when the pencil was pressed — the
	 * session owns that baseline, not this component.
	 *
	 * Sliders only: there is no free-text number field anywhere (ticket 09's
	 * no-form guard).
	 */
	import { translate } from '$lib/i18n/translate';
	import { formatNumber } from '$lib/i18n/format';
	import {
		bodyParameterLimits,
		bodyParameters,
		type BodyId,
		type ParameterLimit,
		type SandboxParameter,
		type SessionEvent,
		type SessionState
	} from '$lib/session';
	import { BODY_LABEL_KEY } from './body-label';

	let { session, dispatch }: { session: SessionState; dispatch: (event: SessionEvent) => void } =
		$props();

	const bodyId = $derived(session.sandbox.selectedBodyId);
	const editing = $derived(session.sandbox.editBaseline !== null);
	const parameters = $derived(bodyId === null ? null : bodyParameters(session, bodyId));
	const limits = $derived(bodyId === null ? null : bodyParameterLimits(bodyId));

	function setParameter(parameter: SandboxParameter, value: number): void {
		if (bodyId === null) return;
		dispatch({ type: 'set-body-parameter', bodyId, parameter, value });
	}

	/** A logarithmic slider position, 0…1, for a value inside a log limit. */
	function logPosition(value: number, limit: ParameterLimit): number {
		const low = Math.log10(limit.min);
		const high = Math.log10(limit.max);
		return Math.min(1, Math.max(0, (Math.log10(value) - low) / (high - low)));
	}

	function logValue(position: number, limit: ParameterLimit): number {
		const low = Math.log10(limit.min);
		const high = Math.log10(limit.max);
		return 10 ** (low + position * (high - low));
	}

	function sliderValue(value: number, limit: ParameterLimit): number {
		return limit.scale === 'log' ? logPosition(value, limit) : value;
	}

	function fromSlider(raw: string, limit: ParameterLimit): number {
		const position = Number(raw);
		return limit.scale === 'log' ? logValue(position, limit) : position;
	}

	function formatMass(kg: number): string {
		return kg.toExponential(2);
	}

	function formatDistance(au: number, locale: SessionState['locale']): string {
		return formatNumber(Number(au.toFixed(3)), locale);
	}

	function formatSpeed(kmPerS: number, locale: SessionState['locale']): string {
		return formatNumber(Number(kmPerS.toFixed(2)), locale);
	}
</script>

{#if bodyId !== null && parameters !== null && limits !== null}
	<div
		class="properties-card"
		role="dialog"
		aria-label={translate(session.locale, 'sandbox.properties')}
	>
		<header>
			<h2>{translate(session.locale, BODY_LABEL_KEY[bodyId as BodyId])}</h2>
			<button
				type="button"
				class="close"
				aria-label={translate(session.locale, 'sandbox.close')}
				onclick={() => dispatch({ type: 'select-body', bodyId: null })}
			>
				<span aria-hidden="true">×</span>
			</button>
		</header>

		<dl>
			<div class="row">
				<dt>{translate(session.locale, 'sandbox.properties.mass')}</dt>
				<dd>
					{formatMass(parameters.massKg)}
					{translate(session.locale, 'unit.kg')}
				</dd>
			</div>

			{#if parameters.distanceAu !== null}
				<div class="row">
					<dt>{translate(session.locale, 'sandbox.properties.distance')}</dt>
					<dd>
						{formatDistance(parameters.distanceAu, session.locale)}
						{translate(session.locale, 'unit.au')}
					</dd>
				</div>
			{/if}

			{#if parameters.speedKmPerS !== null}
				<div class="row">
					<dt>{translate(session.locale, 'sandbox.properties.speed')}</dt>
					<dd>
						{formatSpeed(parameters.speedKmPerS, session.locale)}
						{translate(session.locale, 'unit.kmPerS')}
					</dd>
				</div>
			{/if}

			{#if parameters.periodDays !== null}
				<div class="row">
					<dt>{translate(session.locale, 'sandbox.properties.period')}</dt>
					<dd>
						{formatNumber(Math.round(parameters.periodDays), session.locale)}
						{translate(session.locale, 'unit.days')}
					</dd>
				</div>
			{/if}
		</dl>

		{#if parameters.escaped}
			<p class="escaped">{translate(session.locale, 'sandbox.properties.escaped')}</p>
		{/if}

		{#if editing}
			<div class="fields">
				<label>
					<span>{translate(session.locale, 'sandbox.properties.mass')}</span>
					<input
						type="range"
						min={limits.mass.scale === 'log' ? 0 : limits.mass.min}
						max={limits.mass.scale === 'log' ? 1 : limits.mass.max}
						step={limits.mass.scale === 'log' ? 0.01 : limits.mass.step}
						value={sliderValue(parameters.massKg, limits.mass)}
						oninput={(event) => setParameter('mass', fromSlider(event.currentTarget.value, limits.mass))}
					/>
				</label>

				{#if parameters.distanceAu !== null}
					<label>
						<span>{translate(session.locale, 'sandbox.properties.distance')}</span>
						<input
							type="range"
							min={limits.distance.min}
							max={limits.distance.max}
							step={limits.distance.step}
							value={parameters.distanceAu}
							oninput={(event) =>
								setParameter('distance', fromSlider(event.currentTarget.value, limits.distance))}
						/>
					</label>
				{/if}

				{#if parameters.speedKmPerS !== null}
					<label>
						<span>{translate(session.locale, 'sandbox.properties.speed')}</span>
						<input
							type="range"
							min={limits.speed.min}
							max={limits.speed.max}
							step={limits.speed.step}
							value={parameters.speedKmPerS}
							oninput={(event) =>
								setParameter('speed', fromSlider(event.currentTarget.value, limits.speed))}
						/>
					</label>
				{/if}
			</div>
		{/if}

		<div class="actions">
			<button
				type="button"
				class="pencil"
				aria-pressed={editing}
				aria-label={translate(session.locale, 'sandbox.edit')}
				onclick={() => dispatch({ type: 'begin-body-edit', bodyId })}
			>
				<span aria-hidden="true">✎</span>
			</button>

			{#if editing}
				<button type="button" class="confirm" onclick={() => dispatch({ type: 'confirm-body-edit' })}>
					{translate(session.locale, 'sandbox.confirm')}
				</button>
				<button type="button" class="cancel" onclick={() => dispatch({ type: 'cancel-body-edit' })}>
					{translate(session.locale, 'sandbox.cancel')}
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.properties-card {
		position: fixed;
		top: calc(4.25rem + env(safe-area-inset-top));
		left: 0.75rem;
		right: 0.75rem;
		/* Never over the timeline: the bar keeps its own strip at the bottom. */
		bottom: calc(var(--timeline-height, 8.5rem) + 0.5rem);
		max-width: 22rem;
		z-index: 9;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.85rem;
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 1rem;
		background: rgb(8 12 20 / 0.9);
		color: #fff;
		font-size: 0.95rem;
		overflow-y: auto;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.close {
		margin-inline-start: auto;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 1px solid rgb(255 255 255 / 0.28);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.08);
		color: inherit;
		font-size: 1.25rem;
		cursor: pointer;
		touch-action: manipulation;
	}

	dl {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}

	dt {
		opacity: 0.72;
	}

	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
		text-align: end;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	label span {
		opacity: 0.72;
	}

	input[type='range'] {
		width: 100%;
		height: 44px;
		accent-color: #7dd3fc;
		touch-action: manipulation;
	}

	.escaped {
		margin: 0;
		padding: 0.5rem 0.65rem;
		border-radius: 0.6rem;
		background: rgb(251 191 36 / 0.16);
		border: 1px solid rgb(251 191 36 / 0.5);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pencil,
	.confirm,
	.cancel {
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
	}

	.pencil {
		display: grid;
		place-items: center;
		width: 44px;
		padding: 0;
		font-size: 1.15rem;
	}

	.pencil[aria-pressed='true'] {
		background: #f1f5f9;
		border-color: #f1f5f9;
		color: #0b1220;
	}

	.confirm {
		background: #7dd3fc;
		border-color: #7dd3fc;
		color: #0b1220;
		font-weight: 600;
	}

	.pencil:focus-visible,
	.close:focus-visible,
	.confirm:focus-visible,
	.cancel:focus-visible,
	input:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
	}

	@media (orientation: landscape) and (max-height: 30rem) {
		.properties-card {
			top: 3.75rem;
			max-width: 18rem;
			font-size: 0.88rem;
		}
	}
</style>

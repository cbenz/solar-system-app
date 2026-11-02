/**
 * `select-body` and the sandbox editing family.
 *
 * The pencil is a session fact, not a component-local one: `begin-body-edit`
 * captures a baseline, every `set-body-parameter` applies live (so the orbit
 * moves under the child's finger), `confirm-body-edit` drops the baseline and
 * `cancel-body-edit` restores it exactly. `set-body-parameter` is refused while
 * no baseline exists, which is how "editing is a deliberate act" is enforced
 * below the UI.
 *
 * `drop-body` and `move-body` are the drag path; `move-body` exists for the Sun
 * (ADR-0004 rule 2) and is refused in an activity by `sandbox.ts`.
 */

import {
	dropBody,
	moveSun,
	setBodyParameter,
	type SandboxParameter
} from '../sandbox';
import type { SessionEvent, SessionState } from '../types';

function handleSelectBody(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'select-body') return null;
	if (state.mode !== 'sandbox') return state;

	if (state.sandbox.selectedBodyId === event.bodyId && state.sandbox.editBaseline === null) {
		return state;
	}

	return {
		...state,
		sandbox: {
			...state.sandbox,
			selectedBodyId: event.bodyId,
			// Opening a different card abandons an edit in flight, exactly as a
			// cancel would: the values shown are always a committed set.
			editBaseline: null
		}
	};
}

function handleBeginBodyEdit(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'begin-body-edit') return null;
	if (state.mode !== 'sandbox') return state;
	if (event.bodyId !== state.sandbox.selectedBodyId) return state;
	if (state.sandbox.editBaseline !== null) return state;

	return {
		...state,
		sandbox: {
			...state.sandbox,
			editBaseline: {
				orbits: state.sandbox.orbits,
				masses: state.sandbox.masses,
				sunPositionAu: state.sandbox.sunPositionAu
			}
		}
	};
}

function handleSetBodyParameter(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'set-body-parameter') return null;
	if (state.mode !== 'sandbox') return state;
	if (event.bodyId !== state.sandbox.selectedBodyId) return state;

	const parameters: readonly SandboxParameter[] = ['mass', 'distance', 'speed'];
	if (!parameters.includes(event.parameter)) return state;

	return setBodyParameter(state, event.bodyId, event.parameter, event.value);
}

function handleConfirmBodyEdit(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'confirm-body-edit') return null;
	if (state.sandbox.editBaseline === null) return state;

	return { ...state, sandbox: { ...state.sandbox, editBaseline: null } };
}

function handleCancelBodyEdit(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'cancel-body-edit') return null;

	const baseline = state.sandbox.editBaseline;
	if (baseline === null) return state;

	return {
		...state,
		sandbox: {
			...state.sandbox,
			orbits: baseline.orbits,
			masses: baseline.masses,
			sunPositionAu: baseline.sunPositionAu,
			editBaseline: null
		}
	};
}

function handleDropBody(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'drop-body') return null;
	return dropBody(state, event.bodyId, event.position, event.velocity);
}

function handleMoveBody(state: SessionState, event: SessionEvent): SessionState | null {
	if (event.type !== 'move-body') return null;
	if (event.bodyId !== 'sun') return state;
	return moveSun(state, event.position);
}

export function handleSandboxEditing(
	state: SessionState,
	event: SessionEvent
): SessionState | null {
	return (
		handleSelectBody(state, event) ??
		handleBeginBodyEdit(state, event) ??
		handleSetBodyParameter(state, event) ??
		handleConfirmBodyEdit(state, event) ??
		handleCancelBodyEdit(state, event) ??
		handleDropBody(state, event) ??
		handleMoveBody(state, event)
	);
}

/**
 * Missions: the predict → manipulate → observe → explain rules, in the pure.
 *
 * A mission is never a form (ADR-0004). The child produces a scene state, the
 * session records the proposition that state expresses, the child manipulates
 * the model, and the model's answer is what the scene shows. Everything here is
 * a pure function of `SessionState`: no Three.js, no DOM, no Svelte.
 *
 * The success predicate is the mission's own `SuccessSpec`, evaluated over the
 * child-manipulable scene. `evaluateSuccess` grades it; `isSatisfied` answers
 * the only question that opens the reveal: has the child produced the
 * phenomenon?
 */

import type {
	MissionScene,
	MissionSpec,
	PredictionProposition,
	PredictionSpec,
	SuccessSpec
} from '../../activities/types';
import type { MessageKey } from '$lib/i18n/messages';
import { currentActivity } from './camera';
import type {
	MissionPhase,
	SceneMission,
	SessionState,
	SuccessOutcome
} from './types';

/** Every mission phase, in the order the mission walks them. */
export const MISSION_PHASES: readonly MissionPhase[] = [
	'predict',
	'manipulate',
	'observe',
	'explain'
];

/**
 * Grade a continuous attempt against its two bands.
 *
 * `right` is `|measure| <= tolerance`. `close` is the band just outside it,
 * `tolerance < |measure| <= closeTolerance`, where the child is near enough to
 * correct from and the panel says "almost". Anything further is `far`. The
 * returned `measure` is the absolute distance, so a caller never has to know
 * which side of the target the child is on.
 */
export function graded(measure: number, tolerance: number, closeTolerance: number): SuccessOutcome {
	const distance = Math.abs(measure);

	// A predicate that divides by zero or reads a missing body reports a miss,
	// never a false success.
	if (!Number.isFinite(distance)) return { state: 'far', measure: distance };
	if (distance <= tolerance) return { state: 'right', measure: distance };
	if (distance <= closeTolerance) return { state: 'close', measure: distance };
	return { state: 'far', measure: distance };
}

/**
 * The mission's answer to "has the child produced the phenomenon".
 *
 * A discrete task reports `measure` 0 when it holds and 1 when it does not:
 * there is no distance to report, and the number is only ever read by tests.
 */
export function evaluateSuccess(spec: SuccessSpec, scene: MissionScene): SuccessOutcome {
	if (spec.kind === 'discrete') {
		const holds = spec.holds(scene);
		return { state: holds ? 'right' : 'far', measure: holds ? 0 : 1 };
	}

	return graded(spec.measure(scene), spec.tolerance, spec.closeTolerance);
}

/** True only when the scene shows the phenomenon: the reveal's one condition. */
export function isSatisfied(spec: SuccessSpec, scene: MissionScene): boolean {
	return evaluateSuccess(spec, scene).state === 'right';
}

/**
 * The proposition the current scene expresses, if any.
 *
 * The child picks a proposition by producing it, not by choosing a row: the
 * first proposition that holds is what the mission records. No match means the
 * child has not stated anything the mission can recognise yet, and the session
 * leaves the prediction unrecorded.
 */
export function matchPrediction(
	spec: PredictionSpec,
	scene: MissionScene
): PredictionProposition | undefined {
	return spec.propositions.find((proposition) => proposition.holds(scene));
}

/** The mission a state's progress refers to, resolved from the activity data. */
export function missionOf(state: SessionState, missionId: string): MissionSpec | undefined {
	return currentActivity(state)?.missions.find((mission) => mission.id === missionId);
}

/** The mission currently running, if any. */
export function currentMission(state: SessionState): MissionSpec | undefined {
	const progress = state.mission;
	if (progress === null) return undefined;
	return missionOf(state, progress.missionId);
}

/**
 * The words for the current phase.
 *
 * The brief is the standing sentence and is shown in every phase, so the
 * manipulate phase needs no prompt of its own: the brief is what to do.
 */
export function promptFor(mission: MissionSpec, phase: MissionPhase): MessageKey {
	switch (phase) {
		case 'predict':
			return mission.prediction.prompt;
		case 'manipulate':
			return mission.brief;
		case 'observe':
			return mission.observe;
		case 'explain':
			return mission.explain;
	}
}

/**
 * The mission as the panel draws it, derived from the state on every event.
 *
 * `outcome` is null during the predict phase: the success predicate is about
 * the scene the child manipulates, and asking it before the prediction is
 * recorded would answer a question the mission has not asked yet.
 */
export function sceneMission(state: SessionState): SceneMission | null {
	const progress = state.mission;
	if (progress === null) return null;

	const mission = missionOf(state, progress.missionId);
	if (mission === undefined) return null;

	const outcome = progress.phase === 'predict' ? null : evaluateSuccess(mission.success, state);
	const feedback =
		progress.phase === 'manipulate' && outcome?.state === 'close' ? mission.feedback.close : null;

	return {
		id: mission.id,
		phase: progress.phase,
		label: mission.label,
		brief: mission.brief,
		prompt: promptFor(mission, progress.phase),
		prediction: progress.prediction,
		outcome,
		feedback
	};
}

/**
 * The mission state machine: start → predict → manipulate → observe → explain.
 *
 * Transitions are forward only. The reveal (`observe`) is refused unless the
 * child has recorded a prediction and the model's success predicate is
 * satisfied: a mission is not a quiz, so a wrong attempt never ends it — the
 * child keeps manipulating the scene, and the snapshot tells them "almost" when
 * they are close.
 *
 * Abandoning clears the mission and returns to the activity's sandbox with the
 * instant and camera exactly where the child left them; the saved
 * pre-activity view is untouched, so `leave-activity` still goes all the way
 * home.
 */

import {
	currentMission,
	freezeMissionScene,
	isSatisfied,
	matchPrediction,
	missionOf
} from '../missions';
import type { SessionEvent, SessionState } from '../types';

export function handleMission(state: SessionState, event: SessionEvent): SessionState | null {
	switch (event.type) {
		case 'start-mission': {
			// A mission starts from the activity's sandbox, with nothing already
			// running: never from inside another mission, never from the guide.
			if (state.mode !== 'activity' || state.phase !== 'sandbox') return state;
			if (state.mission !== null) return state;

			const mission = missionOf(state, event.missionId);
			if (mission === undefined) return state;

			return {
				...state,
				phase: 'mission',
				mission: {
					missionId: mission.id,
					phase: 'predict',
					// Freeze the starting view now: the prediction is evaluated
					// against it, never against what the child does afterwards.
					predictionScene: freezeMissionScene(state),
					prediction: null
				}
			};
		}

		case 'record-prediction': {
			const progress = state.mission;
			if (progress === null || progress.phase !== 'predict') return state;

			const mission = currentMission(state);
			if (mission === undefined) return state;

			const proposition = matchPrediction(mission.prediction, progress.predictionScene);
			// The child has not produced a state the mission can recognise. The
			// scene shows nothing yet; the prediction is not recorded.
			if (proposition === undefined) return state;

			return {
				...state,
				mission: {
					...progress,
					phase: 'manipulate',
					// Copies, so later manipulation cannot rewrite what was said.
					prediction: {
						missionId: mission.id,
						propositionId: proposition.id,
						statement: proposition.statement,
						instant: progress.predictionScene.instant,
						settings: { ...progress.predictionScene.settings }
					}
				}
			};
		}

		case 'reveal-mission': {
			const progress = state.mission;
			if (progress === null || progress.phase !== 'manipulate') return state;
			if (progress.prediction === null) return state;

			const mission = currentMission(state);
			if (mission === undefined || !isSatisfied(mission.success, state)) return state;

			return { ...state, mission: { ...progress, phase: 'observe' } };
		}

		case 'explain-mission': {
			const progress = state.mission;
			if (progress === null || progress.phase !== 'observe') return state;

			return { ...state, mission: { ...progress, phase: 'explain' } };
		}

		case 'finish-mission': {
			const progress = state.mission;
			if (progress === null || progress.phase !== 'explain') return state;

			return { ...state, phase: 'sandbox', mission: null };
		}

		case 'abandon-mission': {
			// From any phase, with nothing lost: the instant, the camera, the
			// observers and the settings stay exactly where the child left them.
			if (state.mission === null) return state;

			return { ...state, phase: 'sandbox', mission: null };
		}

		default:
			return null;
	}
}

/**
 * The resume offer: what "the last activity comes back" means.
 *
 * The app does **not** jump straight back into the activity, and it does not
 * replay the instant it was left at — the instant is not persisted (see
 * `$lib/persist/storage.ts`: four fields, no scene state). Instead a return
 * visit opens on the Earth, exactly as a first visit does, and offers the last
 * activity as one visible control. Taking it is the ordinary `open-activity`
 * event, the same one the sidebar and a marker dispatch, so the sandbox state
 * saving rule is unchanged and the activity opens in its sandbox phase.
 *
 * That is why this module holds a rule and no state: which activity may be
 * offered is a question about the session's catalogue and mode, answerable from
 * the state alone.
 */

import type { Activity } from '../../activities/types';
import type { SessionState } from './types';

/**
 * The activity to offer as "resume", or `null`.
 *
 * Nothing is offered while an activity is open (there is nothing to resume),
 * when nothing was remembered, or when the remembered id is no longer in the
 * catalogue — a stale value must never offer a dead end.
 */
export function resumeOffer(state: SessionState, rememberedActivityId: string | null): Activity | null {
	if (state.mode !== 'sandbox' || state.activityId !== null) return null;
	if (rememberedActivityId === null) return null;

	return state.activities.find((activity) => activity.id === rememberedActivityId) ?? null;
}

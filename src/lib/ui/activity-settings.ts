/**
 * Which activity settings the panel surfaces. A pure rule so the component
 * stays a dumb renderer and the test can state the behaviour: every declared
 * setting is shown in the activity's sandbox, playback speed included; the
 * guide and the mission have their own panels.
 */

import type { Activity, SettingSpec } from '../../activities/types';
import type { SessionPhase } from '$lib/session/types';

export function visibleActivitySettings(
	activity: Activity | undefined,
	phase: SessionPhase
): readonly SettingSpec[] {
	if (activity === undefined) return [];
	if (phase === 'mission' || phase === 'guide') return [];
	return activity.settings;
}

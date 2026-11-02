/**
 * The sidebar's model: every activity in the registry, with its level and its
 * title key.
 *
 * Pure and derived, never a hand-kept list: dropping an `*.activity.ts` module
 * into `src/activities/` makes it appear here with no other change. The sort is
 * by level (easiest first), then by title key, so the order is the same in every
 * locale and never depends on the order Vite happened to import the modules in.
 *
 * The component resolves `titleKey` through the catalogue and renders the level
 * as a number; a level is never shown as an age or a grade (GLOSSARY, Level).
 */

import type { MessageKey } from '$lib/i18n/messages';
import type { Level } from '../../activities';

/** One row: the id the event carries, the level and the catalogue key. */
export type ActivityListItem = {
	id: string;
	level: Level;
	titleKey: MessageKey;
};

export type ActivityListSource = {
	id: string;
	level: Level;
	title: MessageKey;
};

/**
 * The sidebar's rows, sorted by level then title key.
 *
 * Ties keep a stable order because the sort key is the id-free pair
 * (level, title key): two activities with the same level and the same title are
 * still ordered by id, which keeps the list deterministic without making the
 * title the sort's only tiebreaker.
 */
export function activityList(activities: readonly ActivityListSource[]): ActivityListItem[] {
	return activities
		.map((activity) => ({
			id: activity.id,
			level: activity.level,
			titleKey: activity.title
		}))
		.sort((a, b) => {
			if (a.level !== b.level) return a.level - b.level;
			if (a.titleKey !== b.titleKey) return a.titleKey < b.titleKey ? -1 : 1;
			return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		});
}

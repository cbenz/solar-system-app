/**
 * The activity registry: lookup by id and by body.
 *
 * The registry is built from the activity modules themselves (see `index.ts`),
 * so there is no manual list to edit. `createActivityRegistry` is exported so a
 * test can register a fixture without touching the production modules.
 */

import type { Activity } from './types';
import type { BodyId } from '$lib/session/types';

export type ActivityRegistry = {
	readonly all: readonly Activity[];
	get(id: string): Activity | undefined;
	forBody(bodyId: BodyId): readonly Activity[];
};

export function createActivityRegistry(activities: readonly Activity[]): ActivityRegistry {
	const byId = new Map<string, Activity>();

	for (const activity of activities) {
		if (byId.has(activity.id)) {
			throw new Error(`Duplicate activity id: ${activity.id}`);
		}
		byId.set(activity.id, activity);
	}

	const all = [...byId.values()];
	// Freeze the list so a later mutation cannot make the registry and the
	// snapshot disagree about what exists.
	Object.freeze(all);

	return {
		all,
		get(id: string): Activity | undefined {
			return byId.get(id);
		},
		forBody(bodyId: BodyId): readonly Activity[] {
			return all.filter((activity) => activity.subsystem.includes(bodyId));
		}
	};
}

/**
 * POV specs → observers.
 *
 * One function decides how an activity's declared POVs become observers, so the
 * guide applying a new POV set (ticket 08) and the activity opening with its
 * first set (ticket 07) assign the same colours in the same order.
 */

import type { PovSpec } from '../../activities/types';
import { nextObserverColour } from './observer-colour';
import type { Observer } from './types';

export function observersFromPovs(povs: readonly PovSpec[]): Observer[] {
	const used: string[] = [];
	return povs.map((pov) => {
		const colour = nextObserverColour(used);
		used.push(colour);
		return {
			id: pov.id,
			bodyId: pov.bodyId,
			latitudeDeg: pov.latitudeDeg,
			...(pov.longitudeDeg === undefined ? {} : { longitudeDeg: pov.longitudeDeg }),
			colour
		};
	});
}

/**
 * State → scene. The snapshot is derived, never stored: positions are a pure
 * function of the instant, which is what makes scrubbing reversible.
 */

import { BODY_CONTRIBUTORS } from './scene-bodies';
import { OBSERVER_CONTRIBUTORS } from './scene-observers';
import type { SceneSnapshot, SessionState } from './types';

export function buildScene(state: SessionState): SceneSnapshot {
	const bodies = BODY_CONTRIBUTORS.flatMap((contributor) => {
		const body = contributor(state);
		return body === null ? [] : [body];
	});

	const observers = OBSERVER_CONTRIBUTORS.flatMap((contributor) => contributor(state));

	return { bodies, observers };
}

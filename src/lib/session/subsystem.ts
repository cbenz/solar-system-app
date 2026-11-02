/**
 * The subsystem invariant (ADR-0002): the Sun is in every subsystem, because it
 * is the light and every activity is about light.
 *
 * `Subsystem` is a tuple whose first member is the Sun, so a subsystem that
 * omits it is a type error. `withSun` is the only runtime way to build one: it
 * normalises a declared body list by adding the Sun and removing duplicates.
 */

import type { BodyId } from './types';

export type Subsystem = readonly ['sun', ...BodyId[]];

/** Normalise any declared body list into a subsystem that contains the Sun. */
export function withSun(bodies: readonly BodyId[]): Subsystem {
	const others = bodies.filter((body, index) => body !== 'sun' && bodies.indexOf(body) === index);
	return ['sun', ...others];
}

/** Runtime guard for state that crossed a boundary where types are not checked. */
export function isSubsystem(bodies: readonly BodyId[]): bodies is Subsystem {
	return bodies[0] === 'sun';
}

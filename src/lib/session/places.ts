/**
 * The name of a place, computed from its latitude.
 *
 * The child never chooses from a list: tapping anywhere on the globe names the
 * band the tap landed in. The bands are the ones the app teaches, and every
 * threshold is derived from the obliquity of the ecliptic rather than written as
 * a number of its own:
 *
 * | band                     | latitude                          |
 * |--------------------------|-----------------------------------|
 * | Equator                  | 0°                                |
 * | Tropic of Cancer         | +ε                                |
 * | Tropic of Capricorn      | −ε                                |
 * | Arctic Circle            | +(90° − ε)                        |
 * | Antarctic Circle         | −(90° − ε)                        |
 *
 * `ε` is the model's obliquity (`OBLIQUITY_DEG`), so a sandbox that changes the
 * tilt moves the circles with it (tickets 52–54) without touching this file.
 *
 * The result is a message key (ADR-0006): no user-visible string leaves here.
 * The catalogue resolves it in the child's language.
 */

import type { MessageKey } from '$lib/i18n/messages';
import { OBLIQUITY_DEG } from './ephemeris';

/** The latitude of the polar circles: 90° − ε. */
export const POLAR_CIRCLE_DEG = 90 - OBLIQUITY_DEG;

function clampLatitude(latitudeDeg: number): number {
	if (!Number.isFinite(latitudeDeg)) return 0;
	return Math.min(Math.max(latitudeDeg, -90), 90);
}

/**
 * The geographic name of a latitude, as a message key.
 *
 * A latitude exactly on a circle gets the circle's name; a hair inside or
 * outside gets the band on that side. Southern latitudes mirror the northern
 * names rather than reusing them.
 */
export function placeName(latitudeDeg: number): MessageKey {
	const latitude = clampLatitude(latitudeDeg);
	const magnitude = Math.abs(latitude);
	const northern = latitude >= 0;

	if (magnitude === 0) return 'place.name.equator';

	if (magnitude === OBLIQUITY_DEG) {
		return northern ? 'place.name.tropicOfCancer' : 'place.name.tropicOfCapricorn';
	}

	if (magnitude < OBLIQUITY_DEG) {
		return northern ? 'place.name.northernTropics' : 'place.name.southernTropics';
	}

	if (magnitude === POLAR_CIRCLE_DEG) {
		return northern ? 'place.name.arcticCircle' : 'place.name.antarcticCircle';
	}

	if (magnitude > POLAR_CIRCLE_DEG) {
		return northern ? 'place.name.arctic' : 'place.name.antarctic';
	}

	return northern ? 'place.name.northernTemperate' : 'place.name.southernTemperate';
}

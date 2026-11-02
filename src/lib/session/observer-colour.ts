/**
 * The observer palette: three colours, fixed by the session, never chosen by a
 * component. Okabe–Ito hues stay distinguishable by hue at dot size and through
 * the common forms of colour blindness.
 */
export const OBSERVER_COLOURS = ['#e69f00', '#56b4e9', '#f0e442'] as const;

/** The colour for a new observer: the first palette entry still unused. */
export function nextObserverColour(used: readonly string[]): string {
	return OBSERVER_COLOURS.find((colour) => !used.includes(colour)) ?? OBSERVER_COLOURS[0];
}

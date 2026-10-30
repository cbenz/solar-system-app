/**
 * The locales the app speaks. Ticket 03's session module owns this type's
 * currency too, so this file stays dependency-free.
 */
export type Locale = 'fr' | 'en';

export const LOCALES: readonly Locale[] = ['fr', 'en'];

export const DEFAULT_LOCALE: Locale = 'en';

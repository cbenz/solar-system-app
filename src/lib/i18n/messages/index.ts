import type { Locale } from '../locale';
import { en, type MessageKey } from './en';
import { fr } from './fr';

export type { MessageKey };

/** Every locale answers the same key set; the compiler enforces it. */
export const catalogues: Record<Locale, Record<MessageKey, string>> = { en, fr };

/** The key of each language's name in its own words. */
export const nativeNameKey: Record<Locale, MessageKey> = {
	en: 'language.name.en',
	fr: 'language.name.fr'
};

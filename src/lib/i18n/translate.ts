import { catalogues, type MessageKey } from './messages';
import { interpolate, type MessageParams } from './interpolate';
import type { Locale } from './locale';

/** Resolves a message key in a locale, interpolating its parameters. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
	return interpolate(catalogues[locale][key], params ?? {}, locale);
}

import { DEFAULT_LOCALE, type Locale } from './locale';

/**
 * Picks the interface language from a BCP 47 tag such as `navigator.language`.
 * Any French tag (`fr`, `fr-FR`, `fr-CA`) opens in French; everything else
 * falls back to English.
 */
export function resolveLocale(language: string | null | undefined): Locale {
	if (!language) return DEFAULT_LOCALE;

	const primary = language.trim().toLowerCase().split(/[-_]/)[0];

	return primary === 'fr' ? 'fr' : DEFAULT_LOCALE;
}

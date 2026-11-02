import { formatDate, formatNumber } from './format';
import type { Locale } from './locale';

/** A value a message may interpolate. Numbers and dates go through `Intl`. */
export type MessageParam = string | number | Date;

export type MessageParams = Record<string, MessageParam>;

const PLACEHOLDER = /\{(\w+)\}/g;

function render(value: MessageParam, locale: Locale): string {
	if (typeof value === 'number') return formatNumber(value, locale);
	if (value instanceof Date) return formatDate(value.getTime(), locale);
	return value;
}

/**
 * Fills `{name}` placeholders in a message. An unknown placeholder is left
 * visible rather than swallowed, so a typo shows up in the interface.
 */
export function interpolate(template: string, params: MessageParams, locale: Locale): string {
	return template.replace(PLACEHOLDER, (placeholder, name: string) =>
		name in params ? render(params[name] as MessageParam, locale) : placeholder
	);
}

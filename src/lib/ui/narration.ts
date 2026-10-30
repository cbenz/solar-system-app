/**
 * The guide's narration, resolved to text and to sentences.
 *
 * Pure: the catalogue holds the words, `translate` resolves them for a locale,
 * and `splitSentences` cuts the resolved text into the spans the panel
 * highlights while the voice speaks one of them. No DOM, no speech here — the
 * adapter in `speech.ts` only carries the decisions out.
 */

import type { Locale } from '$lib/i18n/locale';
import type { MessageKey } from '$lib/i18n/messages';
import { translate } from '$lib/i18n/translate';
import { currentGuideStep, type SessionState } from '$lib/session';

/**
 * One spoken sentence and the span it covers in the full narration.
 *
 * `start` and `end` are UTF-16 character indices into the narration text, and
 * the spans partition it: `text.slice(start, end)` for every sentence, joined,
 * is the whole narration again. A span keeps the whitespace that follows its
 * sentence, so highlighting never makes the text jump.
 */
export type NarrationSentence = {
	text: string;
	start: number;
	end: number;
};

export type GuideNarration = {
	key: MessageKey;
	text: string;
	sentences: readonly NarrationSentence[];
};

/**
 * A sentence ends at `.`/`!`/`?`/`…` (with any closing quote or bracket) and the
 * whitespace after it, or at a line break. Narration for children is short and
 * plain, so this is deliberately not an abbreviation-aware tokeniser.
 */
const SENTENCE_BOUNDARY = /[.!?…]+["'»”’)\]]*\s+|\n+/g;

/** Split a text into sentences, with char spans that cover every character. */
export function splitSentences(text: string): NarrationSentence[] {
	if (text.length === 0) return [];

	const sentences: NarrationSentence[] = [];
	let start = 0;

	for (const match of text.matchAll(SENTENCE_BOUNDARY)) {
		const end = match.index + match[0].length;
		if (end <= start) continue;
		sentences.push({ text: text.slice(start, end), start, end });
		start = end;
	}

	if (start < text.length) {
		sentences.push({ text: text.slice(start), start, end: text.length });
	}

	return sentences;
}

/** The current step's narration in a locale, or null when no step is running. */
export function narrationFor(state: SessionState, locale: Locale): GuideNarration | null {
	const step = currentGuideStep(state);
	if (step === undefined) return null;

	const text = translate(locale, step.narration);
	return { key: step.narration, text, sentences: splitSentences(text) };
}

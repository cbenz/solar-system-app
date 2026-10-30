import { describe, expect, it } from 'vitest';
import { guideActivity } from '../../activities/__fixtures__/guide.activity';
import { applyEvent, createInitialState, type SessionState } from '$lib/session';
import { narrationFor, splitSentences } from './narration';

const from = guideActivity.timeSpan.from;

function start(): SessionState {
	const state = createInitialState({
		activities: [guideActivity],
		instant: Date.UTC(2025, 0, 1)
	});
	const opened = applyEvent(state, { type: 'open-activity', activityId: guideActivity.id }).state;
	return applyEvent(opened, { type: 'next-guide-step' }).state;
}

describe('splitting narration into sentences', () => {
	it('cuts after the punctuation that ends a sentence', () => {
		const sentences = splitSentences('One. Two! Three?');

		expect(sentences).toEqual([
			{ text: 'One. ', start: 0, end: 5 },
			{ text: 'Two! ', start: 5, end: 10 },
			{ text: 'Three?', start: 10, end: 16 }
		]);
	});

	it('keeps every character inside exactly one span, so the text is reproduced', () => {
		const text = 'La Terre tourne sur elle-même. En un jour, elle fait un tour ! Vraiment ?';
		const sentences = splitSentences(text);

		expect(sentences.length).toBe(3);
		expect(sentences.map((sentence) => text.slice(sentence.start, sentence.end)).join('')).toBe(
			text
		);
	});

	it('treats a line break as a boundary and keeps the space that follows it', () => {
		const text = 'First line\nSecond line';
		const sentences = splitSentences(text);

		expect(sentences.map((sentence) => sentence.text)).toEqual(['First line\n', 'Second line']);
		expect(sentences.map((sentence) => text.slice(sentence.start, sentence.end)).join('')).toBe(
			text
		);
	});

	it('has one sentence when there is no punctuation, and none for empty text', () => {
		expect(splitSentences('No full stop here')).toEqual([
			{ text: 'No full stop here', start: 0, end: 17 }
		]);
		expect(splitSentences('')).toEqual([]);
	});
});

describe('resolving the current step’s narration', () => {
	it('is null outside a running guide', () => {
		const state = createInitialState({ activities: [guideActivity] });

		expect(narrationFor(state, 'en')).toBeNull();
	});

	it('returns the text for the current step in the active locale', () => {
		const guided = applyEvent(start(), { type: 'next-guide-step' }).state;
		const guidedOnceMore = applyEvent(guided, { type: 'next-guide-step' }).state;

		expect(narrationFor(guided, 'en')?.text).toBe('Mission');
		expect(narrationFor(guidedOnceMore, 'en')?.text).toBe('Sandbox');
		expect(narrationFor(guidedOnceMore, 'fr')?.text).toBe('Bac à sable');
	});

	it('carries the sentence list with its char spans', () => {
		const narration = narrationFor(start(), 'en');

		expect(narration?.sentences).toEqual([{ text: 'Guide', start: 0, end: 5 }]);
		expect(narration?.sentences.map((sentence) => narration.text.slice(sentence.start, sentence.end)).join('')).toBe(
			narration?.text
		);
	});
});

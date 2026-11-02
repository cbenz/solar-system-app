import { describe, expect, it, vi } from 'vitest';
import type { Locale } from '$lib/i18n/locale';import { createSpeech, planSpeech, speechLang, type SpeechRequest } from './speech';

function request(overrides: Partial<SpeechRequest> = {}): SpeechRequest {
	return { sentences: ['One. ', 'Two.'], locale: 'en', muted: false, ...overrides };
}

describe('the speech tag', () => {
	it('derives the BCP 47 tag from the locale, never by concatenation in a component', () => {
		expect(speechLang('fr')).toBe('fr-FR');
		expect(speechLang('en')).toBe('en-US');
	});
});

describe('the pure speech plan', () => {
	it('speaks every sentence in the active locale', () => {
		const plan = planSpeech(null, request({ locale: 'fr' }));

		expect(plan).toEqual({
			cancel: false,
			utterances: [
				{ text: 'One. ', lang: 'fr-FR' },
				{ text: 'Two.', lang: 'fr-FR' }
			]
		});
	});

	it('stays silent when muted, and cancels whatever was playing', () => {
		const playing = { lang: 'en-US', sentences: ['One. ', 'Two.'] };

		expect(planSpeech(playing, request({ muted: true }))).toEqual({
			cancel: true,
			utterances: []
		});
	});

	it('stays silent when the browser has no speech synthesis', () => {
		expect(planSpeech(null, request({ supported: false }))).toEqual({
			cancel: false,
			utterances: []
		});
	});

	it('cancels the previous voice before speaking another locale', () => {
		const playing = { lang: 'fr-FR', sentences: ['One. ', 'Two.'] };
		const plan = planSpeech(playing, request({ locale: 'en' }));

		expect(plan.cancel).toBe(true);
		expect(plan.utterances.map((utterance) => utterance.lang)).toEqual(['en-US', 'en-US']);
	});

	it('does not restart a narration that is already playing unchanged', () => {
		const playing = { lang: 'en-US', sentences: ['One. ', 'Two.'] };

		expect(planSpeech(playing, request())).toEqual({ cancel: false, utterances: [] });
	});
});

type FakeUtterance = {
	text: string;
	lang: string;
	onstart: (() => void) | null;
	onend: (() => void) | null;
};

function fakeEnvironment() {
	const spoken: FakeUtterance[] = [];
	const synth = {
		speak: vi.fn((utterance: FakeUtterance) => {
			spoken.push(utterance);
			utterance.onstart?.();
			utterance.onend?.();
		}),
		cancel: vi.fn()
	};

	class Utterance implements FakeUtterance {
		text = '';
		lang = '';
		onstart: (() => void) | null = null;
		onend: (() => void) | null = null;
	}

	const speech = createSpeech({
		synth: synth as unknown as Pick<SpeechSynthesis, 'speak' | 'cancel'>,
		Utterance: Utterance as unknown as typeof SpeechSynthesisUtterance
	});

	return { speech, synth, spoken };
}

describe('the speech adapter', () => {
	it('speaks each sentence as its own utterance and reports which one started', () => {
		const { speech, synth, spoken } = fakeEnvironment();
		const starts: number[] = [];

		speech.speak(request({ locale: 'fr' }), (index) => starts.push(index));

		expect(synth.speak).toHaveBeenCalledTimes(2);
		expect(spoken.map((utterance) => utterance.lang)).toEqual(['fr-FR', 'fr-FR']);
		expect(starts).toEqual([0, 1]);
	});

	it('cancels rather than speaking when muted, and the narration text is untouched', () => {
		const { speech, synth, spoken } = fakeEnvironment();
		const sentences = ['Le texte reste. ', 'Rien ne se dit.'];

		// Speak once, then mute: the voice stops and nothing new is spoken.
		speech.speak({ sentences, locale: 'fr', muted: false });
		synth.cancel.mockClear();
		synth.speak.mockClear();
		spoken.length = 0;

		speech.speak({ sentences, locale: 'fr', muted: true });

		expect(synth.cancel).toHaveBeenCalledTimes(1);
		expect(synth.speak).not.toHaveBeenCalled();
		expect(spoken).toEqual([]);
		// Muting is a choice about the voice, never about the words.
		expect(sentences.join('')).toBe('Le texte reste. Rien ne se dit.');
	});

	it('cancels on a locale change and does not restart an unchanged narration', () => {
		const { speech, synth } = fakeEnvironment();

		speech.speak({ sentences: ['Un.'], locale: 'fr', muted: false });
		synth.cancel.mockClear();
		synth.speak.mockClear();

		// Same step, same locale: the panel re-rendering is not a reason to talk again.
		speech.speak({ sentences: ['Un.'], locale: 'fr', muted: false });
		expect(synth.cancel).not.toHaveBeenCalled();
		expect(synth.speak).not.toHaveBeenCalled();

		// Locale switch: the old voice stops, the new one starts.
		speech.speak({ sentences: ['Un.'], locale: 'en', muted: false });
		expect(synth.cancel).toHaveBeenCalledTimes(1);
		expect(synth.speak).toHaveBeenCalledTimes(1);
	});

	it('forgets what it was playing once cancelled, so the same text can play again', () => {
		const { speech, synth } = fakeEnvironment();

		speech.speak({ sentences: ['Un.'], locale: 'fr', muted: false });
		speech.cancel();
		synth.speak.mockClear();

		speech.speak({ sentences: ['Un.'], locale: 'fr', muted: false });
		expect(synth.speak).toHaveBeenCalledTimes(1);
	});
});

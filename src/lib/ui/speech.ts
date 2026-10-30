/**
 * The guide's voice: a thin adapter over `window.speechSynthesis`.
 *
 * Every decision worth testing is in `planSpeech`, a pure function: whether to
 * speak at all (muted or unsupported means no), which BCP 47 tag the active
 * locale speaks, and whether the previous narration must be cancelled before
 * the next one starts. `createSpeech` only carries those decisions out against
 * a synthesiser it is handed, so a test can hand it a fake.
 *
 * The words never depend on the voice: muting stops speech and leaves the
 * written narration exactly where it was (ticket 08).
 */

import { SPEECH_LOCALE_TAG, type Locale } from '$lib/i18n/locale';

/** What a guide step asks the voice to say. */
export type SpeechRequest = {
	/** One entry per sentence, so the panel can highlight the one being spoken. */
	sentences: readonly string[];
	locale: Locale;
	muted: boolean;
	/** False when the browser has no `speechSynthesis`; the panel still shows text. */
	supported?: boolean;
};

export type PlannedUtterance = {
	text: string;
	lang: string;
};

export type SpeechPlan = {
	/** Stop whatever is playing before enqueuing `utterances`. */
	cancel: boolean;
	utterances: readonly PlannedUtterance[];
};

/** What the adapter believes it is currently playing. */
export type PlayingSpeech = {
	lang: string;
	sentences: readonly string[];
};

/** The BCP 47 tag a locale speaks. */
export function speechLang(locale: Locale): string {
	return SPEECH_LOCALE_TAG[locale];
}

function sameNarration(playing: PlayingSpeech | null, request: SpeechRequest): boolean {
	if (playing === null) return false;
	if (playing.lang !== speechLang(request.locale)) return false;
	if (playing.sentences.length !== request.sentences.length) return false;
	return playing.sentences.every((sentence, index) => sentence === request.sentences[index]);
}

/**
 * Decide what the voice should do for a request, given what it is doing now.
 *
 * Muted, empty or unsupported requests are silent and stop the current voice.
 * A request identical to the one playing is a no-op, so a re-render cannot
 * restart the sentence. Anything else cancels the old voice and speaks every
 * sentence in order.
 */
export function planSpeech(playing: PlayingSpeech | null, request: SpeechRequest): SpeechPlan {
	const supported = request.supported ?? true;
	const empty = request.sentences.length === 0;

	if (!supported || request.muted || empty) {
		return { cancel: playing !== null, utterances: [] };
	}

	if (sameNarration(playing, request)) {
		return { cancel: false, utterances: [] };
	}

	const lang = speechLang(request.locale);
	return {
		cancel: playing !== null,
		utterances: request.sentences.map((text) => ({ text, lang }))
	};
}

export type SpeechSink = {
	/** False when the browser has no speech synthesis; the panel shows text only. */
	supported: boolean;
	/** Speak `request`, reporting the index of each sentence as it starts. */
	speak(request: SpeechRequest, onSentenceStart?: (index: number) => void): void;
	cancel(): void;
};

type SpeechDependencies = {
	synth?: Pick<SpeechSynthesis, 'speak' | 'cancel'> | null;
	Utterance?: typeof SpeechSynthesisUtterance | null;
};

function browserSynth(): Pick<SpeechSynthesis, 'speak' | 'cancel'> | null {
	if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
	return window.speechSynthesis;
}

function browserUtterance(): typeof SpeechSynthesisUtterance | null {
	if (typeof window === 'undefined' || !('SpeechSynthesisUtterance' in window)) return null;
	return window.SpeechSynthesisUtterance;
}

/**
 * A small stateful wrapper. `speak` consults `planSpeech`; the caller cancels on
 * unmount, on a locale change and when leaving the guide.
 */
export function createSpeech(dependencies: SpeechDependencies = {}): SpeechSink {
	const synth = dependencies.synth === undefined ? browserSynth() : dependencies.synth;
	const Utterance = dependencies.Utterance === undefined ? browserUtterance() : dependencies.Utterance;

	let playing: PlayingSpeech | null = null;
	const supported = synth !== null && synth !== undefined && Utterance !== null;

	function cancel(): void {
		playing = null;
		synth?.cancel();
	}

	function speak(request: SpeechRequest, onSentenceStart?: (index: number) => void): void {
		const plan = planSpeech(playing, request);

		if (plan.cancel) cancel();
		if (plan.utterances.length === 0 || !supported) {
			// Remember that a silent request is not playing, so unmuting can speak
			// the same narration again.
			if (plan.utterances.length > 0 || request.muted || !supported) playing = null;
			return;
		}

		playing = { lang: speechLang(request.locale), sentences: [...request.sentences] };

		plan.utterances.forEach((planned, index) => {
			const utterance = new Utterance!();
			utterance.text = planned.text;
			utterance.lang = planned.lang;
			utterance.onstart = () => onSentenceStart?.(index);
			synth!.speak(utterance);
		});
	}

	return { supported, speak, cancel };
}

/**
 * The no-form guard (ticket 09, ADR-0004).
 *
 * A mission is never a form. The child acts on the model — moves time, moves a
 * body, tilts a thing — and the model's answer is what the scene shows. There is
 * no multiple-choice question, no free-text field, no score and no verdict
 * screen anywhere in the app, so this test greps every Svelte component for the
 * controls that would turn a mission into a quiz:
 *
 * - `<input type="text">` (and any `<input>` whose type is text)
 * - `<textarea>`
 * - `<select>`
 * - a radio or a checkbox (`<input type="radio">`, `type="checkbox"`), and the
 *   ARIA roles that would stand in for one (`radio`, `radiogroup`, `checkbox`,
 *   `textbox`, `combobox`)
 *
 * A slider (`<input type="range">`) is not forbidden: it manipulates the model —
 * ticket 13's tilt, for instance — and never records an answer.
 *
 * ## Exempting a legitimate control
 *
 * There is no exemption in the codebase today, and there should never be one for
 * an answer control. If a component genuinely needs one of these elements for
 * something that is not an answer, put this comment at the top of that file:
 *
 *     <!-- no-form-guard: exempt — <reason> -->
 *
 * with a real reason after the dash. The guard skips a file only when that
 * comment is present and non-empty; a reviewer then asks whether the control is
 * an answer control. The default answer is no: move the behaviour into the
 * session and let the scene answer.
 */

import { describe, expect, it } from 'vitest';

/**
 * The components themselves, read through Vite rather than the filesystem: the
 * test needs no Node types and sees exactly the files the build sees.
 */
const components = import.meta.glob('/src/**/*.svelte', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

/** The escape hatch, spelled out: `exempt`, a dash, and a reason. */
const EXEMPTION = /<!--\s*no-form-guard:\s*exempt\s*[—:-]\s*\S[\s\S]*?-->/;

const FORBIDDEN: readonly { pattern: RegExp; what: string }[] = [
	{ pattern: /<input\b[^>]*\btype\s*=\s*["']?text\b/i, what: '<input type="text">' },
	{ pattern: /<textarea\b/i, what: '<textarea>' },
	{ pattern: /<select\b/i, what: '<select>' },
	{ pattern: /\btype\s*=\s*["']?(?:radio|checkbox)\b/i, what: 'a radio or checkbox' },
	{
		pattern: /\brole\s*=\s*["'](?:radio|radiogroup|checkbox|textbox|combobox)["']/i,
		what: 'an ARIA role that stands in for an answer control'
	}
];

describe('the no-form guard', () => {
	it('finds no answer control in any Svelte component', () => {
		const entries = Object.entries(components);

		// A broken glob would make the whole guard vacuous.
		expect(entries.length).toBeGreaterThan(5);

		const violations = entries.flatMap(([path, source]) => {
			if (EXEMPTION.test(source)) return [];
			return FORBIDDEN.filter(({ pattern }) => pattern.test(source)).map(
				({ what }) => `${path}: ${what}`
			);
		});

		expect(violations).toEqual([]);
	});
});

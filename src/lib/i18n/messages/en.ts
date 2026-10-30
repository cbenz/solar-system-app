/**
 * The English catalogue is the source of truth for the key set:
 * `MessageKey` is derived from it. French is typed as a record over that key
 * set, so a missing — or extra — French key is a compile error.
 */
export const en = {
	'app.title': 'Solar system',

	'language.name.en': 'English',
	'language.name.fr': 'Français',
	'language.switch.action': 'Change language: {language}',

	'time.timeline': 'Timeline',
	'time.play': 'Play',
	'time.pause': 'Pause',
	'time.span.dayAndHalf': 'a day and a half',
	'time.span.week': 'a week',
	'time.span.month': 'a month',
	'time.span.year': 'a year',

	'term.activity': 'Activity',
	'term.camera-preset': 'Camera preset',
	'term.guide': 'Guide',
	'term.level': 'Level',
	'term.mission': 'Mission',
	'term.night-sky': 'Night sky',
	'term.observer': 'Observer',
	'term.pov': 'POV',
	'term.sandbox': 'Sandbox',
	'term.space-view': 'Space view',
	'term.subsystem': 'Subsystem',
	'term.true-distance': 'True distance',
	'term.visibility-limit': 'Visibility limit'
} as const;

export type MessageKey = keyof typeof en;

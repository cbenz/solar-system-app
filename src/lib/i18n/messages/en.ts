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
	'term.true-size': 'True size',
	'term.visibility-limit': 'Visibility limit',

	'body.sun': 'Sun',
	'body.earth': 'Earth',
	'body.moon': 'Moon',

	'sandbox.properties': 'Properties',
	'sandbox.properties.open': 'Properties of {body}',
	'sandbox.properties.mass': 'Mass',
	'sandbox.properties.distance': 'Distance',
	'sandbox.properties.speed': 'Speed',
	'sandbox.properties.period': 'Orbit period',
	'sandbox.properties.escaped': 'Left its orbit',
	'sandbox.edit': 'Edit',
	'sandbox.confirm': 'Apply',
	'sandbox.cancel': 'Cancel',
	'sandbox.close': 'Close',

	'unit.kg': 'kg',
	'unit.au': 'AU',
	'unit.kmPerS': 'km/s',
	'unit.days': 'days',

	'place.name.equator': 'Equator',
	'place.name.tropicOfCancer': 'Tropic of Cancer',
	'place.name.tropicOfCapricorn': 'Tropic of Capricorn',
	'place.name.northernTropics': 'Northern tropics',
	'place.name.southernTropics': 'Southern tropics',
	'place.name.northernTemperate': 'Northern temperate zone',
	'place.name.southernTemperate': 'Southern temperate zone',
	'place.name.arcticCircle': 'Arctic Circle',
	'place.name.antarcticCircle': 'Antarctic Circle',
	'place.name.arctic': 'Arctic',
	'place.name.antarctic': 'Antarctic',

	'activity.leave': 'Leave activity',
	'activity.day-and-night.camera.overview': 'Whole Earth',
	'activity.day-and-night.camera.side': 'From the side',
	'activity.day-and-night.camera.close': 'Close up',
	'activity.day-and-night.setting.rotation': 'Rotation speed',

	'mission.phase.predict': 'Predict',
	'mission.phase.manipulate': 'Try it',
	'mission.phase.observe': 'Look',
	'mission.phase.explain': 'Explain',
	'mission.abandon': 'Leave this mission',
	'mission.prediction.commit': 'This is what I think',
	'mission.prediction.recorded': 'You said: {statement}',
	'mission.look': 'Look at the model',
	'mission.explain': 'What happened',
	'mission.finish': 'Back to the sandbox',

	'scale.distancesNotToScale': 'The distances between them are shortened so you can see everything.',
	'scale.sizesNotToScale': 'The Earth, the Moon and the Sun are drawn bigger than they really are.'
} as const;

export type MessageKey = keyof typeof en;

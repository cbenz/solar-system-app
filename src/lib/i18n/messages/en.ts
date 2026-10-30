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

	'guide.start': 'Start the guide',
	'guide.next': 'Next',
	'guide.mute': 'Mute the voice',
	'guide.unmute': 'Turn the voice back on',

	'activity.latitudes.camera.overview': 'The whole Earth',
	'activity.latitudes.camera.sunlit': 'From the Sun side',
	'activity.latitudes.camera.abovePole': 'From above the pole',
	'activity.latitudes.setting.playback': 'Year speed',
	'activity.latitudes.guide.equator':
		'Three places on the same planet. At the Equator every day lasts twelve hours.',
	'activity.latitudes.guide.june':
		'In June the Sun never sets at the Arctic Circle, and it stands straight overhead at the Tropic of Cancer.',
	'activity.latitudes.guide.december':
		'In December the Arctic Circle has no day at all, while the Equator keeps its twelve hours.',
	'activity.latitudes.guide.above':
		'From above the pole, follow the line between day and night through the year.',
	'activity.latitudes.mission.zenith.label': 'The zenith day',
	'activity.latitudes.mission.zenith.claim.june': 'In June, the Sun stands overhead there.',
	'activity.latitudes.mission.zenith.claim.december':
		'In December, the Sun stands overhead there.',
	'activity.latitudes.mission.zenith.observe': 'Look at the Sun in the Tropic panel.',
	'activity.latitudes.mission.zenith.explain':
		'Only at the June solstice does the Sun climb straight overhead at the Tropic of Cancer.',
	'activity.latitudes.mission.zenith.prompt':
		'Find the day the Sun stands straight overhead at the Tropic of Cancer.',
	'activity.latitudes.mission.zenith.prediction': 'Guess first: which month?',
	'activity.latitudes.mission.zenith.close': 'A few days away. Keep looking.',
	'activity.latitudes.mission.zenith.right':
		'That is the June solstice: the only day the Sun reaches the zenith there.',

	'pov.sunHeight': 'Sun height: {height}°',

	'scale.distancesNotToScale': 'The distances between them are shortened so you can see everything.',
	'scale.sizesNotToScale': 'The Earth, the Moon and the Sun are drawn bigger than they really are.'
} as const;

export type MessageKey = keyof typeof en;

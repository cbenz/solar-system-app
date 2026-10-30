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

	'activity.shadows.camera.ground': 'At the ground',
	'activity.shadows.camera.top': 'Above the stick',
	'activity.shadows.camera.wide': 'Whole Earth',
	'activity.shadows.setting.speed': 'Time speed',
	'activity.shadows.guide.watchTheStick':
		'This stick is you, standing up. Its shadow is the ground the Sun cannot reach.',
	'activity.shadows.guide.runTheDay':
		'Run the day. The shadow is long in the morning, and long again in the evening.',
	'activity.shadows.guide.aYear':
		'Now watch noon for a year. The same stick casts a longer shadow in winter.',
	'activity.shadows.guide.otherHalf':
		'At noon in June the shadow points one way. In December it points the other.',

	'mission.shadows.shortest.label': 'Shortest shadow',
	'mission.shadows.shortest.brief': 'Find the moment when the shadow is shortest.',
	'mission.shadows.shortest.predict':
		'Leave time where you think the shortest shadow is, then lock in your guess.',
	'mission.shadows.shortest.claim.morning': 'The shadow is shortest in the morning.',
	'mission.shadows.shortest.claim.afternoon': 'The shadow is shortest in the afternoon.',
	'mission.shadows.shortest.observe':
		'Look at the shadow now. It is as short as it gets today.',
	'mission.shadows.shortest.explain':
		'The shortest shadow is at solar noon, when the Sun is highest.',
	'mission.shadows.shortest.almost': 'Almost. Run a little closer to noon.',
	'mission.shadows.shortest.right': 'There it is: the shortest shadow of the day.',

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

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

	'activity.eclipses.camera.overview': 'Whole scene',
	'activity.eclipses.camera.aboveEcliptic': 'Above the orbits',
	'activity.eclipses.camera.alongTheLine': 'Along the Sun–Earth line',
	'activity.eclipses.setting.moonPlacement': 'Place the Moon',
	'activity.eclipses.guide.alignment':
		'Drag the Moon along its grey ring. Only one place on that ring puts it in front of the Sun.',
	'activity.eclipses.guide.threeViews':
		'Look at the three views. The same instant, three places: one in the full shadow, one in the half shadow, one in plain sunlight.',
	'activity.eclipses.guide.mostMonths':
		'A month later the Moon lines up again, and nothing happens: it passes above the Sun, off the edge of its ring.',
	'activity.eclipses.guide.earthShadow':
		'Now the other way round. The Moon slides into the Earth’s shadow, and everyone on the night side sees the same thing.',
	'activity.eclipses.guide.earthShadowTotal':
		'Fully inside the shadow, the Moon goes dim and red. Nothing hides the Sun this time: the Earth is doing the hiding.',

	'activity.eclipses.mission.lineUp.label': 'Line them up',
	'activity.eclipses.mission.lineUp.brief':
		'Place the Moon so that it hides the Sun from the first observer.',
	'activity.eclipses.mission.lineUp.prediction':
		'Put the Moon where you think it has to be, then lock in your guess.',
	'activity.eclipses.mission.lineUp.claim.moonInFront':
		'The Moon has to be between the Earth and the Sun.',
	'activity.eclipses.mission.lineUp.claim.earthInFront':
		'The Earth has to be between the Moon and the Sun.',
	'activity.eclipses.mission.lineUp.observe':
		'Look at the first view: the Moon’s disc sits over the Sun’s.',
	'activity.eclipses.mission.lineUp.explain':
		'A solar eclipse is the Moon passing in front of the Sun. That needs the right month as well as the right place on the ring.',
	'activity.eclipses.mission.lineUp.close':
		'Almost. Slide the Moon a little further along its ring.',
	'activity.eclipses.mission.lineUp.right': 'There it is: the Sun is covered.',

	'pov.sunHeight': 'Sun height: {height}°',

	'scale.distancesNotToScale': 'The distances between them are shortened so you can see everything.',
	'scale.sizesNotToScale': 'The Earth, the Moon and the Sun are drawn bigger than they really are.'
} as const;

export type MessageKey = keyof typeof en;

import type { MessageKey } from './en';

export const fr: Record<MessageKey, string> = {
	'app.title': 'Système solaire',

	'language.name.en': 'English',
	'language.name.fr': 'Français',
	'language.switch.action': 'Changer de langue : {language}',

	'time.timeline': 'Chronologie',
	'time.play': 'Lecture',
	'time.pause': 'Pause',
	'time.span.dayAndHalf': 'un jour et demi',
	'time.span.week': 'une semaine',
	'time.span.month': 'un mois',
	'time.span.year': 'un an',

	'term.activity': 'Activité',
	'term.camera-preset': 'Preset de caméra',
	'term.guide': 'Guide',
	'term.level': 'Niveau',
	'term.mission': 'Mission',
	'term.night-sky': 'Ciel de nuit',
	'term.observer': 'Observateur',
	'term.pov': 'Vue subjective',
	'term.sandbox': 'Bac à sable',
	'term.space-view': "Vue de l'espace",
	'term.subsystem': 'Sous-système',
	'term.true-distance': 'Distance réelle',
	'term.true-size': 'Taille réelle',
	'term.visibility-limit': 'Limite de visibilité',

	'body.sun': 'Soleil',
	'body.earth': 'Terre',
	'body.moon': 'Lune',

	'sandbox.properties': 'Propriétés',
	'sandbox.properties.open': 'Propriétés de : {body}',
	'sandbox.properties.mass': 'Masse',
	'sandbox.properties.distance': 'Distance',
	'sandbox.properties.speed': 'Vitesse',
	'sandbox.properties.period': "Période de l'orbite",
	'sandbox.properties.escaped': 'A quitté son orbite',
	'sandbox.edit': 'Modifier',
	'sandbox.confirm': 'Appliquer',
	'sandbox.cancel': 'Annuler',
	'sandbox.close': 'Fermer',

	'unit.kg': 'kg',
	'unit.au': 'UA',
	'unit.kmPerS': 'km/s',
	'unit.days': 'jours',

	'place.name.equator': 'Équateur',
	'place.name.tropicOfCancer': 'Tropique du Cancer',
	'place.name.tropicOfCapricorn': 'Tropique du Capricorne',
	'place.name.northernTropics': 'Tropiques du Nord',
	'place.name.southernTropics': 'Tropiques du Sud',
	'place.name.northernTemperate': 'Zone tempérée nord',
	'place.name.southernTemperate': 'Zone tempérée sud',
	'place.name.arcticCircle': 'Cercle arctique',
	'place.name.antarcticCircle': 'Cercle antarctique',
	'place.name.arctic': 'Arctique',
	'place.name.antarctic': 'Antarctique',

	'activity.leave': "Quitter l'activité",
	'activity.day-and-night.camera.overview': 'La Terre entière',
	'activity.day-and-night.camera.side': 'De côté',
	'activity.day-and-night.camera.terminator': 'Au-dessus du pôle',
	'activity.day-and-night.camera.close': 'De près',
	'activity.day-and-night.setting.rotation': 'Vitesse de rotation',
	'activity.day-and-night.guide.noon':
		'C’est midi là où tu es. Le Soleil est au plus haut de la journée.',
	'activity.day-and-night.guide.sunset':
		'Avance maintenant. Le Soleil descend et ton point glisse dans l’ombre.',
	'activity.day-and-night.guide.midnight':
		'De l’autre côté de minuit, ton point est dans le noir. La ligne entre le jour et la nuit traverse la Terre.',
	'activity.day-and-night.guide.nextNoon': 'Un tour complet plus tard, il est de nouveau midi.',
	'activity.day-and-night.guide.backToDark':
		'Et voilà l’ombre qui revient. La nuit n’est jamais loin derrière.',

	'mission.day-and-night.noon.label': 'Midi là où je suis',
	'mission.day-and-night.noon.brief':
		'Fais avancer le temps jusqu’à ce que le Soleil soit au plus haut là où tu es.',
	'mission.day-and-night.noon.predict':
		'Place le temps là où tu crois qu’il est midi, puis valide ton idée.',
	'mission.day-and-night.noon.claim.before': 'Midi est encore à venir.',
	'mission.day-and-night.noon.claim.now': 'C’est midi maintenant.',
	'mission.day-and-night.noon.claim.after': 'Midi est déjà passé.',
	'mission.day-and-night.noon.observe':
		'Regarde le Soleil et ton point. Le Soleil est au plus haut, et ton point est à midi.',
	'mission.day-and-night.noon.explain':
		'Midi, c’est le moment où le Soleil est au plus haut, quand ton point lui fait face.',
	'mission.day-and-night.noon.close': 'Presque. Avance un peu vers le point le plus haut du Soleil.',
	'mission.day-and-night.noon.right':
		'Le voilà : le Soleil au plus haut, et midi là où tu es.',

	'mission.day-and-night.shadow.label': 'Dans l’ombre',
	'mission.day-and-night.shadow.brief':
		'Fais avancer le temps jusqu’à ce que ton point entre dans l’ombre.',
	'mission.day-and-night.shadow.predict':
		'Place le temps là où tu crois que le passage a lieu, puis valide ton idée.',
	'mission.day-and-night.shadow.claim.before':
		'Le passage a lieu avant que le Soleil atteigne son point le plus haut.',
	'mission.day-and-night.shadow.claim.after':
		'Le passage a lieu après que le Soleil a atteint son point le plus haut.',
	'mission.day-and-night.shadow.observe':
		'Regarde ton point. Il est sur la ligne entre le jour et la nuit.',
	'mission.day-and-night.shadow.explain':
		'Ton point entre dans l’ombre quand le Soleil se couche, et il en ressort quand le Soleil se lève.',
	'mission.day-and-night.shadow.close':
		'Presque. La ligne entre le jour et la nuit est tout près.',
	'mission.day-and-night.shadow.right': 'Le voilà : ton point sur le bord de l’ombre.',

	'activity.shadows.camera.ground': 'Au sol',
	'activity.shadows.camera.top': 'Au-dessus du bâton',
	'activity.shadows.camera.wide': 'La Terre entière',
	'activity.shadows.setting.speed': 'Vitesse du temps',
	'activity.shadows.guide.watchTheStick':
		"Ce bâton, c'est toi, debout. Son ombre, c'est le sol que le Soleil ne touche pas.",
	'activity.shadows.guide.runTheDay':
		"Fais tourner la journée. L'ombre est longue le matin, et de nouveau longue le soir.",
	'activity.shadows.guide.aYear':
		'Regarde maintenant midi pendant un an. Le même bâton fait une ombre plus longue en hiver.',
	'activity.shadows.guide.otherHalf':
		"À midi en juin, l'ombre pointe d'un côté. En décembre, elle pointe de l'autre.",

	'mission.shadows.shortest.label': 'Ombre la plus courte',
	'mission.shadows.shortest.brief': "Trouve le moment où l'ombre est la plus courte.",
	'mission.shadows.shortest.predict':
		"Place le temps là où tu crois que l'ombre est la plus courte, puis valide ton idée.",
	'mission.shadows.shortest.claim.morning': "L'ombre est la plus courte le matin.",
	'mission.shadows.shortest.claim.afternoon': "L'ombre est la plus courte l'après-midi.",
	'mission.shadows.shortest.observe':
		"Regarde l'ombre maintenant. Elle est aussi courte que possible aujourd'hui.",
	'mission.shadows.shortest.explain':
		"L'ombre la plus courte arrive à midi solaire, quand le Soleil est au plus haut.",
	'mission.shadows.shortest.almost': 'Presque. Avance un peu vers midi.',
	'mission.shadows.shortest.right': "La voilà : l'ombre la plus courte de la journée.",

	'mission.phase.predict': 'Prédis',
	'mission.phase.manipulate': 'Essaie',
	'mission.phase.observe': 'Regarde',
	'mission.phase.explain': 'Explique',
	'mission.abandon': 'Quitter cette mission',
	'mission.prediction.commit': 'Voilà ce que je pense',
	'mission.prediction.recorded': 'Tu as dit : {statement}',
	'mission.look': 'Regarde le modèle',
	'mission.explain': 'Ce qui s’est passé',
	'mission.finish': 'Retour au bac à sable',

	'guide.start': 'Commencer le guide',
	'guide.next': 'Suivant',
	'guide.mute': 'Couper la voix',
	'guide.unmute': 'Remettre la voix',

	'activity.latitudes.camera.overview': 'La Terre entière',
	'activity.latitudes.camera.sunlit': 'Du côté du Soleil',
	'activity.latitudes.camera.abovePole': "D'au-dessus du pôle",
	'activity.latitudes.setting.playback': "Vitesse de l'année",
	'activity.latitudes.guide.equator':
		'Trois lieux sur la même planète. À l’Équateur, chaque jour dure douze heures.',
	'activity.latitudes.guide.june':
		'En juin, le Soleil ne se couche jamais au cercle arctique, et il passe exactement à la verticale du tropique du Cancer.',
	'activity.latitudes.guide.december':
		'En décembre, le cercle arctique n’a pas de jour du tout, alors que l’Équateur garde ses douze heures.',
	'activity.latitudes.guide.above':
		'D’au-dessus du pôle, suis la ligne entre le jour et la nuit au fil de l’année.',
	'activity.latitudes.mission.zenith.label': 'Le jour du zénith',
	'activity.latitudes.mission.zenith.claim.june':
		'En juin, le Soleil passe exactement à la verticale.',
	'activity.latitudes.mission.zenith.claim.december':
		'En décembre, le Soleil passe exactement à la verticale.',
	'activity.latitudes.mission.zenith.observe': 'Regarde le Soleil dans la vue du tropique.',
	'activity.latitudes.mission.zenith.explain':
		'Au solstice de juin seulement, le Soleil monte exactement à la verticale du tropique du Cancer.',
	'activity.latitudes.mission.zenith.prompt':
		'Trouve le jour où le Soleil passe exactement à la verticale du tropique du Cancer.',
	'activity.latitudes.mission.zenith.prediction': 'Devine d’abord : quel mois ?',
	'activity.latitudes.mission.zenith.close': 'À quelques jours près. Continue à chercher.',
	'activity.latitudes.mission.zenith.right':
		'C’est le solstice de juin : le seul jour où le Soleil atteint le zénith là-bas.',


	'activity.seasons.camera.year': "Toute l'année",
	'activity.seasons.camera.sunlit': 'Du côté du Soleil',
	'activity.seasons.camera.abovePole': 'Au-dessus du pôle',
	'activity.seasons.setting.tilt': "Inclinaison de l'axe",
	'activity.seasons.setting.exaggeratedOrbit': 'Orbite exagérée (pas la vraie orbite)',
	'activity.seasons.setting.playback': "Vitesse de l'année",
	'activity.seasons.pov.paris': 'Paris',
	'activity.seasons.pov.sydney': 'Sydney',
	'activity.seasons.guide.june':
		'À cet instant, Paris a une longue journée de juin et Sydney une journée courte. Les deux sont à la même distance du Soleil.',
	'activity.seasons.guide.december':
		"En décembre, les deux villes s'inversent. La Terre est plus proche du Soleil qu'en juin, et c'est Paris qui a froid.",
	'activity.seasons.guide.noTilt':
		"Ramène l'inclinaison de l'axe à zéro. Chaque journée dure encore douze heures ; ce qui rétrécit, c'est la différence entre les saisons.",
	'activity.seasons.guide.parallelRays':
		'La lumière du Soleil arrive en rayons parallèles. Là où ils frappent le globe en biais, la même lumière se répartit sur plus de surface.',
	'activity.seasons.mission.closest.label': 'Le jour le plus proche',
	'activity.seasons.mission.closest.brief':
		'Trouve le jour où la Terre est la plus proche du Soleil.',
	'activity.seasons.mission.closest.prediction':
		'Quand la Terre est-elle la plus proche du Soleil ? Place la frise dans cette saison, puis dis-le à l’appli.',
	'activity.seasons.mission.closest.claim.summer':
		"En été : la Terre est la plus proche du Soleil.",
	'activity.seasons.mission.closest.claim.winter':
		"En hiver : la Terre est la plus proche du Soleil.",
	'activity.seasons.mission.closest.observe':
		"Regarde la mesure : la Terre est au plus près du Soleil début janvier, en hiver boréal. Ton été est toujours marqué, et il est près de l'autre bout de l'orbite.",
	'activity.seasons.mission.closest.explain':
		"La distance varie d'environ 3 %, et sa lumière en plus tombe sur l'été austral. Les saisons viennent de l'inclinaison : le Soleil monte plus haut et la journée dure plus longtemps.",
	'activity.seasons.mission.closest.close':
		'À quelques jours près. Suis la distance jusqu’à sa plus petite valeur.',
	'activity.seasons.mission.closest.right':
		"C'est début janvier : la Terre est au plus près du Soleil en hiver boréal.",
	'activity.seasons.scene.distance': 'Distance Terre–Soleil : {distance} millions de km',
	'activity.seasons.scene.notRealOrbit':
		"Cette orbite est exagérée exprès. La vraie orbite est presque un cercle, et ce n'est pas elle qui fait les saisons.",

	'pov.sunHeight': 'Hauteur du Soleil : {height}°',

	'scale.distancesNotToScale': 'Les distances entre eux sont raccourcies pour que tu puisses tout voir.',
	'scale.sizesNotToScale': "La Terre, la Lune et le Soleil sont dessinés plus grands qu'en vrai."
};

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
	'activity.day-and-night.camera.close': 'De près',
	'activity.day-and-night.setting.rotation': 'Vitesse de rotation',

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

	'activity.eclipses.camera.overview': 'Toute la scène',
	'activity.eclipses.camera.aboveEcliptic': 'Au-dessus des orbites',
	'activity.eclipses.camera.alongTheLine': 'Le long de l’axe Soleil–Terre',
	'activity.eclipses.setting.moonPlacement': 'Placer la Lune',
	'activity.eclipses.guide.alignment':
		'Fais glisser la Lune le long de son anneau gris. Un seul endroit de cet anneau la place devant le Soleil.',
	'activity.eclipses.guide.threeViews':
		'Regarde les trois vues. Le même instant, trois lieux : un dans l’ombre complète, un dans la pénombre, un en plein soleil.',
	'activity.eclipses.guide.mostMonths':
		'Un mois plus tard, la Lune s’aligne de nouveau, et rien ne se passe : elle passe au-dessus du Soleil, en dehors de son anneau.',
	'activity.eclipses.guide.earthShadow':
		'Maintenant dans l’autre sens. La Lune glisse dans l’ombre de la Terre, et tous ceux qui sont du côté nuit voient la même chose.',
	'activity.eclipses.guide.earthShadowTotal':
		'Entièrement dans l’ombre, la Lune pâlit et rougit. Cette fois, rien ne cache le Soleil : c’est la Terre qui fait de l’ombre.',

	'activity.eclipses.mission.lineUp.label': 'Aligne-les',
	'activity.eclipses.mission.lineUp.brief':
		'Place la Lune pour qu’elle cache le Soleil au premier observateur.',
	'activity.eclipses.mission.lineUp.prediction':
		'Mets la Lune là où tu penses qu’elle doit être, puis valide ton idée.',
	'activity.eclipses.mission.lineUp.claim.moonInFront':
		'La Lune doit être entre la Terre et le Soleil.',
	'activity.eclipses.mission.lineUp.claim.earthInFront':
		'La Terre doit être entre la Lune et le Soleil.',
	'activity.eclipses.mission.lineUp.observe':
		'Regarde la première vue : le disque de la Lune recouvre celui du Soleil.',
	'activity.eclipses.mission.lineUp.explain':
		'Une éclipse de Soleil, c’est la Lune qui passe devant le Soleil. Il faut le bon mois en plus du bon endroit sur l’anneau.',
	'activity.eclipses.mission.lineUp.close':
		'Presque. Fais glisser la Lune un peu plus loin sur son anneau.',
	'activity.eclipses.mission.lineUp.right': 'Voilà : le Soleil est recouvert.',

	'pov.sunHeight': 'Hauteur du Soleil : {height}°',

	'scale.distancesNotToScale': 'Les distances entre eux sont raccourcies pour que tu puisses tout voir.',
	'scale.sizesNotToScale': "La Terre, la Lune et le Soleil sont dessinés plus grands qu'en vrai."
};

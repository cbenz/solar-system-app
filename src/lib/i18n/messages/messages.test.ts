import { describe, expect, it } from 'vitest';
import { LOCALES } from '../locale';
import { catalogues, nativeNameKey } from './index';
import { en } from './en';
import { fr } from './fr';

describe('message catalogues', () => {
	it('answers every English key in French and the other way round', () => {
		expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
	});

	it('has no empty message in any locale', () => {
		for (const locale of LOCALES) {
			for (const [key, message] of Object.entries(catalogues[locale])) {
				expect(message.trim(), `${locale}: ${key}`).not.toBe('');
			}
		}
	});

	it('names every language in its own words', () => {
		expect(catalogues.en[nativeNameKey.fr]).toBe('Français');
		expect(catalogues.fr[nativeNameKey.fr]).toBe('Français');
		expect(catalogues.en[nativeNameKey.en]).toBe('English');
		expect(catalogues.fr[nativeNameKey.en]).toBe('English');
	});

	it('translates the switch action', () => {
		expect(catalogues.en['language.switch.action']).toBe('Change language: {language}');
		expect(catalogues.fr['language.switch.action']).toBe('Changer de langue : {language}');
	});

	it('keeps the glossary vocabulary in both languages', () => {
		const vocabulary = {
			'term.activity': ['Activity', 'Activité'],
			'term.guide': ['Guide', 'Guide'],
			'term.mission': ['Mission', 'Mission'],
			'term.sandbox': ['Sandbox', 'Bac à sable'],
			'term.pov': ['POV', 'Vue subjective'],
			'term.space-view': ['Space view', "Vue de l'espace"],
			'term.observer': ['Observer', 'Observateur'],
			'term.subsystem': ['Subsystem', 'Sous-système'],
			'term.true-distance': ['True distance', 'Distance réelle'],
			'term.camera-preset': ['Camera preset', 'Preset de caméra'],
			'term.level': ['Level', 'Niveau'],
			'term.night-sky': ['Night sky', 'Ciel de nuit'],
			'term.visibility-limit': ['Visibility limit', 'Limite de visibilité']
		} as const;

		for (const [key, [english, french]] of Object.entries(vocabulary)) {
			expect(catalogues.en[key as keyof typeof en], key).toBe(english);
			expect(catalogues.fr[key as keyof typeof en], key).toBe(french);
		}
	});
});

import { describe, expect, it } from 'vitest';
import { createActivityRegistry } from '../../activities';
import type { Activity } from '../../activities/types';
import { defineActivity } from '../../activities/types';
import { activityList } from './activity-list';

function activity(id: string, level: Activity['level'], title: Activity['title']): Activity {
	return defineActivity({
		id,
		level,
		title,
		subsystem: ['earth'],
		povs: [{ id: `${id}-pov`, bodyId: 'earth', latitudeDeg: 0 }],
		timeSpan: { from: 0, to: 86_400_000 },
		cameraPresets: [{ id: 'wide', label: 'term.camera-preset', distance: 3, pitch: 0.1 }],
		settings: [],
		guide: [],
		missions: []
	});
}

const moon = activity('moon-phases', 3, 'term.night-sky');
const day = activity('day-and-night', 1, 'term.activity');
const seasons = activity('seasons', 2, 'term.activity');
const eclipses = activity('eclipses', 2, 'term.guide');

describe('the activity list', () => {
	it('is derived from the registry, one row per registered activity', () => {
		const registry = createActivityRegistry([moon, day, seasons, eclipses]);
		const list = activityList(registry.all);

		expect(list.map((item) => item.id)).toEqual([
			'day-and-night',
			'seasons',
			'eclipses',
			'moon-phases'
		]);
		expect(list.map((item) => item.level)).toEqual([1, 2, 2, 3]);
	});

	it('sorts by level, then by title key, so the order never depends on imports', () => {
		const registry = createActivityRegistry([eclipses, seasons, day, moon]);

		// Both level-2 activities sort by title key: 'term.guide' before 'term.activity'.
		const sorted = activityList(registry.all);

		expect(sorted.map((item) => item.titleKey)).toEqual([
			'term.activity',
			'term.activity',
			'term.guide',
			'term.night-sky'
		]);
		expect(sorted.map((item) => item.id)).toEqual([
			'day-and-night',
			'seasons',
			'eclipses',
			'moon-phases'
		]);
	});

	it('shows a newly registered activity with no other change', () => {
		const before = createActivityRegistry([day, seasons]);
		const after = createActivityRegistry([day, seasons, moon]);

		expect(activityList(before.all).map((item) => item.id)).not.toContain('moon-phases');
		expect(activityList(after.all)).toContainEqual({
			id: 'moon-phases',
			level: 3,
			titleKey: 'term.night-sky'
		});
	});

	it('carries the level as a number, never as an age or a grade', () => {
		const [only] = activityList(createActivityRegistry([day]).all);

		expect(only?.level).toBe(1);
		expect(Object.keys(only ?? {}).sort()).toEqual(['id', 'level', 'titleKey']);
	});
});

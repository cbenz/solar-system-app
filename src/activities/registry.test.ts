import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/session';
import { fixtureActivity } from './__fixtures__/fixture.activity';
import { activities, registry } from './index';
import { createActivityRegistry } from './registry';
import { withSun } from '$lib/session/subsystem';

describe('the activity registry', () => {
	it('discovers the activity modules with no manual list', () => {
		expect(activities.map((activity) => activity.id)).toContain('day-and-night');
		expect(registry.get('day-and-night')?.level).toBe(1);
	});

	it('makes a newly registered fixture discoverable and openable', () => {
		const fixtures = createActivityRegistry([fixtureActivity]);
		const state = createInitialState({ activities: fixtures.all });

		expect(fixtures.get('fixture')).toBe(fixtureActivity);
		expect(fixtures.forBody('earth').map((activity) => activity.id)).toEqual(['fixture']);
		expect(fixtures.forBody('sun').map((activity) => activity.id)).toEqual(['fixture']);
		expect(fixtures.forBody('moon')).toEqual([]);
		expect(state.activities).toEqual([fixtureActivity]);
	});

	it('refuses two activities with the same id', () => {
		expect(() => createActivityRegistry([fixtureActivity, fixtureActivity])).toThrow(/Duplicate/);
	});

	it('normalises every subsystem to contain the Sun exactly once', () => {
		expect(withSun(['earth'])).toEqual(['sun', 'earth']);
		expect(withSun(['sun', 'earth', 'earth', 'moon'])).toEqual(['sun', 'earth', 'moon']);
		expect(fixtureActivity.subsystem[0]).toBe('sun');
		expect(fixtureActivity.subsystem).toContain('sun');
	});
});

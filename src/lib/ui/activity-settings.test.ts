import { describe, expect, it } from 'vitest';
// Load the session barrel (and therefore the activity registry) before the
// activity module itself: the registry discovers it through Vite's glob.
import '$lib/session';
import { visibleActivitySettings } from './activity-settings';
import activity from '../../activities/day-and-night.activity';

describe('the activity settings panel', () => {
	it('surfaces playback speed in the sandbox, so the child can change it', () => {
		const keys = visibleActivitySettings(activity, 'sandbox').map((setting) => setting.key);

		expect(keys).toContain('playbackSpeed');
	});

	it('leaves the guide and the mission to their own panels', () => {
		expect(visibleActivitySettings(activity, 'guide')).toEqual([]);
		expect(visibleActivitySettings(activity, 'mission')).toEqual([]);
	});

	it('shows nothing with no activity open', () => {
		expect(visibleActivitySettings(undefined, 'sandbox')).toEqual([]);
	});
});

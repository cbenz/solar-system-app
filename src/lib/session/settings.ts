/**
 * The settings that exist outside any activity.
 *
 * An activity declares its own settings, and `set-setting` validates against
 * that declaration. The sandbox has no activity open, so it would otherwise
 * accept any key it is handed; this list is the sandbox's declaration, and a
 * key absent from it is refused there too.
 */

import type { SettingSpec } from '../../activities/types';

export const SANDBOX_SETTINGS: readonly SettingSpec[] = [
	{
		key: 'visibilityLimit',
		kind: 'boolean',
		default: false,
		label: 'term.visibility-limit'
	}
];

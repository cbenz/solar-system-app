/**
 * Setting validation. A setting is applied only when it matches the activity's
 * declaration: same key, same kind, and inside the declared range. An invalid
 * value leaves the state untouched; the renderer never has to know why.
 */

import type { SettingSpec } from './types';

export function findSetting(
	settings: readonly SettingSpec[],
	key: string
): SettingSpec | undefined {
	return settings.find((setting) => setting.key === key);
}

export function isValidSettingValue(spec: SettingSpec, value: number | boolean): boolean {
	if (spec.kind === 'number') {
		return (
			typeof value === 'number' &&
			Number.isFinite(value) &&
			value >= spec.min &&
			value <= spec.max
		);
	}

	return typeof value === 'boolean';
}

/** The defaults an activity applies when it opens. */
export function settingDefaults(settings: readonly SettingSpec[]): Record<string, number | boolean> {
	return Object.fromEntries(settings.map((setting) => [setting.key, setting.default]));
}

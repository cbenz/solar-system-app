/**
 * The activity registry entry point.
 *
 * Vite discovers every `*.activity.ts` module in this directory eagerly, so
 * dropping a module in is the whole registration procedure: no list to edit.
 * Each module uses `defineActivity` and `satisfies Activity`, so a module
 * missing a required field fails `pnpm check`.
 *
 * Fixtures live under `__fixtures__/` and are outside this glob; tests inject
 * them through `createActivityRegistry` instead of shipping them in the app.
 */

import { createActivityRegistry } from './registry';
import type { Activity } from './types';

const modules = import.meta.glob<{ default: Activity }>('./*.activity.ts', {
	eager: true
});

const discovered = Object.entries(modules).map(([path, module]) => {
	const activity = module.default;
	if (activity === undefined) {
		throw new Error(`Activity module has no default export: ${path}`);
	}
	return activity satisfies Activity;
});

export const registry = createActivityRegistry(discovered);

/** Every activity, in module-path order. */
export const activities = registry.all;

export { createActivityRegistry } from './registry';
export type { ActivityRegistry } from './registry';
export { defineActivity } from './types';
export type {
	Activity,
	ActivityDeclaration,
	CameraPreset,
	GuideStep,
	LatitudeCircleSpec,
	Level,
	MissionSpec,
	PovSpec,
	PresetId,
	SettingSpec
} from './types';
export { findSetting, isValidSettingValue, settingDefaults } from './settings';

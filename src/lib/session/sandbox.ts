/**
 * The sandbox workbench's public surface, split by concern (session README).
 *
 * `sandbox-orbit.ts` derives positions from the stored state vector;
 * `sandbox-editing.ts` owns the pencil and the drag; `sandbox-escape.ts` owns
 * escape tracking; `sandbox-sun.ts` owns the draggable Sun. This file only
 * re-exports, so every existing import from `./sandbox` keeps working.
 */

export {
	AU_KM,
	DEFAULT_MASS_KG,
	bodyParameterLimits,
	bodyPositionAu,
	circularSpeedAuPerDay,
	ephemerisRelativePositionAu,
	escapeSpeedKmPerS,
	massOf,
	muFor,
	orbitPeriodDays,
	relativeOrbitState,
	relativePositionAu,
	storedOrbit
} from './sandbox-orbit';
export type {
	BodyParameterLimits,
	BodyParameters,
	ParameterLimit,
	RelativeOrbitState,
	SandboxParameter
} from './sandbox-orbit';
export {
	ESCAPE_HORIZON_DAYS,
	bodyParameters,
	escapedTrack,
	hasEscaped
} from './sandbox-escape';
export { dropBody, setBodyParameter } from './sandbox-editing';
export { moveSun, sunDirectionFromEarth } from './sandbox-sun';

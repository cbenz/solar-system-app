/**
 * The session module's public surface. Everything else under `session/` is an
 * internal seam that a later ticket may extend; components import from here.
 */

export { applyEvent, SESSION_HANDLERS, UnhandledSessionEventError } from './reducer';
export type { SessionHandler } from './reducer';
export {
	createInitialState,
	DEFAULT_PLAYBACK_SPEED,
	DEFAULT_SUBSYSTEM,
	reconcileTimeSpan
} from './state';
export type { InitialStateOptions } from './state';
export { buildScene } from './scene';
export { FIRST_POV_ID, MAX_OBSERVERS, placementTargetId } from './handlers/place-observer';
export { pickLatitude, type LatitudePick, type PickedLatitude } from './pick';
export { POLAR_CIRCLE_DEG, placeName } from './places';
export { OBSERVER_COLOURS } from './observer-colour';
export { HORIZON_FRACTION, horizonY, skyToScreen } from './sky';
export type { SkyPoint, SkyViewport } from './sky';
export { BODY_CONTRIBUTORS } from './scene-bodies';
export type { BodyContributor } from './scene-bodies';
export { OBSERVER_CONTRIBUTORS } from './scene-observers';
export type { ObserverContributor } from './scene-observers';
export {
	advanceInstant,
	clampInstant,
	hasReachedEnd,
	instantAtRatio,
	julianCenturies,
	julianDay,
	MS_PER_DAY,
	ratioOfInstant,
	sandboxSpan,
	spanLabelKey,
	startOfDay
} from './time';
export { DEFAULT_SNAP_RATIO, snap } from './snap';
export type { SnapKind, SnapPoint } from './snap';
export { snapPointsFor } from './snap-points';
export {
	AU_KM,
	OBLIQUITY_DEG,
	earthHeliocentricPositionAu,
	earthSunDistanceAu,
	moonGeocentricPositionAu,
	moonHeliocentricPositionAu,
	solarDeclinationDeg,
	sunGeocentricPositionAu,
	sunLongitudeDeg
} from './ephemeris';
export {
	isDaylight,
	observerNormal,
	sunAzimuthDeg,
	sunElevationDeg
} from './observers';
export {
	bodyScale,
	compressedDistanceAu,
	DISTANCE_FLOOR_AU,
	distortionNotice,
	DRAWN_EARTH_RADIUS_AU,
	enlargedRadiusAu,
	primaryOf,
	SUN_RADIUS_CAP_AU,
	trueRadiusAu
} from './scale';
export type { ScaleFactors } from './scale';
export type {
	BodyId,
	Instant,
	Observer,
	SceneBody,
	SceneObserver,
	SceneSnapshot,
	SessionEvent,
	SessionMode,
	SessionPhase,
	SessionResult,
	SessionState,
	TimeSpan,
	Vec3
} from './types';

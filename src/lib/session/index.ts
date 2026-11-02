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
export {
	MISSION_PHASES,
	currentMission,
	evaluateSuccess,
	graded,
	isSatisfied,
	matchPrediction,
	missionOf,
	freezeMissionScene,
	promptFor,
	sceneMission
} from './missions';
export { FIRST_POV_ID, MAX_OBSERVERS, placementTargetId } from './handlers/place-observer';
export { pickLatitude, type LatitudePick, type PickedLatitude } from './pick';
export { POLAR_CIRCLE_DEG, placeName } from './places';
export { markersFor } from './scene-markers';
export { TILT_SETTING_KEY, applyGuideStep, currentGuideStep, guideFor, nextGuideStep } from './guide';
export { parallelSunRays, surfaceRaySpacingAu } from './sun-rays';
export {
	DRAWN_ORBIT_ECCENTRICITY_EXAGGERATED,
	DRAWN_ORBIT_MAX_ECCENTRICITY,
	drawnOrbitEccentricity,
	drawnOrbitPoints,
	seasonSceneFor
} from './season-scene';
export type { SeasonDaylight, SeasonScene } from './season-scene';
export type { SunRay, SunRayBundle } from './sun-rays';
export {
	EXAGGERATED_ORBIT_SETTING_KEY,
	annualDistanceCurve,
	aphelionInstant,
	dayLengthHours,
	dayLengthHoursForTilt,
	daylightMinutesForTilt,
	distanceInsolationRatio,
	distanceToSunAu,
	earthSunDistanceKm,
	insolationContrast,
	nearestCurveIndex,
	noonElevationDeg,
	perihelionInstant,
	solarDeclinationForTiltDeg,
	sunEclipticLongitudeDeg,
	sunlightDirection,
	tiltDegFromSettings
} from './seasons';
export { resumeOffer } from './resume';
export { observersFromPovs } from './povs';
export { EQUATOR_CIRCLE_ID, circlesFor } from './circles';
export {
	DEFAULT_CAMERA,
	cameraForPreset,
	clampCamera,
	currentActivity
} from './camera';
export { isSubsystem, withSun } from './subsystem';
export type { Subsystem } from './subsystem';
export { OBSERVER_COLOURS } from './observer-colour';
export { HORIZON_FRACTION, horizonY, skyToScreen } from './sky';
export type { SkyPoint, SkyViewport } from './sky';
export {
	AU_PER_DAY_TO_KM_PER_S,
	EARTH_MASS_KG,
	MOON_MASS_KG,
	MU_SUN_AU3_PER_DAY2,
	SUN_MASS_KG,
	escapeSpeedAtRadius,
	gravitationalParameter,
	orbitFromStateVector,
	positionAtElapsed,
	speedAtRadius,
	stateVectorAtElapsed
} from './orbit';
export type { ConicKind, ConicOrbit, StateVector } from './orbit';
export {
	DEFAULT_MASS_KG,
	ESCAPE_HORIZON_DAYS,
	bodyParameterLimits,
	bodyParameters,
	bodyPositionAu,
	circularSpeedAuPerDay,
	dropBody,
	ephemerisRelativePositionAu,
	escapeSpeedKmPerS,
	escapedTrack,
	hasEscaped,
	massOf,
	moveSun,
	muFor,
	orbitPeriodDays,
	relativeOrbitState,
	relativePositionAu,
	setBodyParameter,
	storedOrbit,
	sunDirectionFromEarth
} from './sandbox';
export type {
	BodyParameterLimits,
	BodyParameters,
	ParameterLimit,
	RelativeOrbitState,
	SandboxParameter
} from './sandbox';
export {
	MAX_SHADOW_LENGTH_FACTOR,
	SHADOW_SATURATION_FACTOR,
	SHORTEST_SHADOW_FLOOR,
	gnomonScreen,
	maxSunElevationDeg,
	shadowExcessAt,
	shadowGeometry,
	shortestShadowLengthFactor
} from './shadow';
export type { GnomonGlyph, GnomonPoint, ShadowGeometry } from './shadow';
export { BODY_CONTRIBUTORS } from './scene-bodies';
export type { BodyContributor } from './scene-bodies';
export { OBSERVER_CONTRIBUTORS } from './scene-observers';
export type { ObserverContributor } from './scene-observers';
export {
	DECORATIVE_STAR_SEED,
	DECORATIVE_STAR_COUNT,
	angularDiameterDegOf,
	apparentMagnitudeOf,
	moonFor,
	decorativeStars,
	visibilityLimitEnabled,
	visibleBodiesFor,
	withNightSky
} from './night-sky';
export type { SkyStar } from './night-sky';
export {
	MOON_RADIUS_KM,
	moonAngularDiameterDeg,
	moonApparentMagnitude,
	moonDistanceKm,
	moonPhase,
	shortestAngleDeg
} from './moon';
export type { MoonPhase } from './moon';
export {
	LIMITING_MAGNITUDE,
	MIN_VISIBLE_ANGULAR_DIAMETER_DEG,
	SUN_APPARENT_MAGNITUDE,
	isAboveVisibilityLimit
} from './visibility';
export type { VisibilityInput } from './visibility';
export {
	EARTH_RADIUS_KM,
	MOON_ORBIT_SETTING_KEY,
	ORBIT_PATH_SAMPLES,
	SUN_RADIUS_KM,
	angleBetweenDeg,
	angularRadiusDeg,
	bodyDragEnabled,
	earthShadowDeg,
	eclipticPathAu,
	lunarEclipse,
	lunarEclipseFor,
	moonArgumentDeg,
	moonGeocentricAtOffsetAu,
	moonOffsetForPosition,
	moonOrbitFrame,
	moonOrbitOffsetDeg,
	moonOrbitPathAu,
	moonOrbitPointAu,
	overlapFraction,
	pathInclinationDeg,
	placedMoonGeocentricAu,
	placedMoonHeliocentricAu,
	rotateAboutAxis,
	solarEclipse,
	withSolarEclipse
} from './eclipse';
export type {
	EclipseView,
	LunarEclipse,
	LunarEclipseKind,
	MoonOrbitFrame,
	SolarEclipse,
	SolarEclipseKind
} from './eclipse';
export { EARTH_ORBIT_SAMPLES, orbitPathsFor } from './orbit-paths';
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
	MOON_INCLINATION_DEG,
	OBLIQUITY_DEG,
	earthHeliocentricPositionAu,
	earthSunDistanceAu,
	moonAscendingNodeDeg,
	planetHeliocentricPositionAu,
	moonGeocentricPositionAu,
	moonHeliocentricPositionAu,
	solarDeclinationDeg,
	sunGeocentricPositionAu,
	sunLongitudeDeg
} from './ephemeris';
export {
	isDaylight,
	observerNormal,
	pointAltitudeAzimuthDeg,
	sunAzimuthDeg,
	sunElevationDeg,
	sunHourAngleDeg
} from './observers';
export {
	bodyDistortion,
	compressedDistanceAu,
	DISTANCE_FLOOR_AU,
	distortionNotice,
	DRAWN_EARTH_RADIUS_AU,
	enlargedRadiusAu,
	MOON_ORBIT_DRAWN_AU,
	MOON_ORBIT_DRAWN_RADII,
	primaryOf,
	SUN_RADIUS_CAP_AU,
	trueRadiusAu
} from './distortion';
export type { DistortionFactors } from './distortion';
export { PLANET_IDS } from './types';
export type {
	BodyId,
	PlanetId,
	CameraState,
	Instant,
	MissionPhase,
	MissionProgress,
	Observer,
	RecordedPrediction,
	SandboxEditBaseline,
	SandboxOrbit,
	SandboxState,
	SandboxView,
	SceneBody,
	SceneMarker,
	SceneMission,
	SceneCircle,
	SceneEclipse,
	SceneMoon,
	SceneObserver,
	SceneOrbitPath,
	SceneSnapshot,
	SessionEvent,
	SessionMode,
	SessionPhase,
	SessionResult,
	SessionState,
	SuccessOutcome,
	SuccessState,
	TimeSpan,
	Vec3
} from './types';

# The session module

One pure, headless module owns everything observable. It takes the current state
and an event, and returns the next state plus the derived scene:

```ts
applyEvent(state: SessionState, event: SessionEvent): { state, scene: SceneSnapshot }
```

Nothing in `src/lib/session/` imports Three.js, touches the DOM or imports
Svelte. It runs in the node test environment. The components and the renderer
are dumb: they dispatch events and draw the snapshot.

The modules are split so later tickets extend it **additively**, one file per
concern. Do not grow a god-reducer; add a file and append it to a list.

## The files

| file | owns |
|---|---|
| `types.ts` | `Instant`, `Vec3`, `Observer`, `BodyId`, `SessionState`, `SceneSnapshot`, `SessionEvent`. Distances are **AU** (see the doc comment; `AU_KM` converts). |
| `ephemeris.ts` | closed-form two-body Kepler: elements → position, the Earth and the Moon, the Sun's longitude and declination, GMST. |
| `time.ts` | instant arithmetic, Julian Day, span ↔ track ratio, playback tick, span words. |
| `observers.ts` | the observer's surface normal, Sun elevation, azimuth and daylight — one dot product, one rotation function. |
| `observer-colour.ts` | the fixed three-colour observer palette and its first-free assignment. |
| `pick.ts` | `pickLatitude`: the pure globe hit-test behind a tap — a ray, a sphere, and the latitude of the near crossing; a miss or the far side is `null`. |
| `places.ts` | `placeName`: the geographic band of a latitude as a message key, with every threshold derived from the obliquity constant. |
| `sky.ts` | `skyToScreen`: the POV panel's only geometry, a pure (altitude, azimuth) → pixel map. |
| `moon.ts` | the Moon as the eye sees it: phase from the elongation, angular size, apparent magnitude. |
| `visibility.ts` | the visibility limit's heuristic: `isAboveVisibilityLimit`, the limiting magnitude, the angular floor. |
| `night-sky.ts` | `visibleBodiesFor` (narrowing by the limit), the Moon per POV, and the seeded decorative `starField`. |
| `snap.ts` | the pure `snap(instant, snapPoints, ratio)` rule. |
| `snap-points.ts` | which instants are worth snapping to, for a session state. |
| `state.ts` | `createInitialState`, `reconcileTimeSpan` (span and instant normalisation). |
| `scene.ts` | composes `scene-bodies.ts`, `scene-observers.ts` and `scene-markers.ts` into a `SceneSnapshot`. |
| `scene-markers.ts` | which activity markers are drawn on which bodies (sandbox only). |
| `subsystem.ts` | `Subsystem` (a tuple starting with the Sun) and `withSun`, the normaliser. |
| `camera.ts` | `clampCamera`: the session's answer to a camera request; free in the sandbox, clamped to the open activity's presets. |
| `reducer.ts` | the handler list and the one entry point. |
| `handlers/*.ts` | one module per event family (`place-observer` owns observer identity and colour, `open-activity` owns the sandbox round trip, `set-setting` validates against the activity, `camera` owns presets and the clamp). |
| `index.ts` | the public surface; components import only from here. |

## Activities

The catalogue lives in `src/activities/` and is discovered by Vite's
`import.meta.glob`. `createInitialState` stores it on `state.activities`, so the
session resolves `activityId` without importing the registry and a test can
inject a fixture. See `src/activities/README.md` for the declaration recipe.

## Adding an event family

1. Create `handlers/<family>.ts`:

   ```ts
   export function handleSetSetting(
     state: SessionState,
     event: SessionEvent
   ): SessionState | null {
     if (event.type !== 'set-setting') return null; // not mine
     return { ...state, settings: { ...state.settings, [event.key]: event.value } };
   }
   ```

   Return `null` for every event that is not yours — that is how the reducer
   finds the owner. Return `state` unchanged when the event is a no-op, so
   identity checks and deep-equality tests stay meaningful.

2. Append it to `SESSION_HANDLERS` in `reducer.ts`. That one-line append is the
   only edit a new family makes outside its own file.

3. If the new state field has meaning beyond the handler (a snapshot field, a
   derived span), add a contributor instead of editing the composer.

Until a family has a handler, its event **throws**
`UnhandledSessionEventError`, naming the event type. That is deliberate: a
silently ignored event would look like a session bug in five different tickets.

## Adding a body to the snapshot

Add a contributor to `BODY_CONTRIBUTORS` in `scene-bodies.ts` (return `null`
when the body is outside the subsystem) and add the id to `BodyId` in
`types.ts`. Positions must never read the subsystem — that is what makes
"shrinking the subsystem never moves a body that stays present" true.

## Observer colour and longitude

The session assigns a new observer the first unused colour from
`observer-colour.ts`; a component never picks one, and moving an observer along
its meridian keeps its colour. Longitude is not a control: `place-observer`
stores only latitude, and `observedNormal` reads `longitudeDeg ?? 0`, so the
same `earthRotationAngle` sweep carries the day. An activity may declare a
longitude for a staged observation without making it interactive.

## Adding a derived observer quantity

Append a contributor to `OBSERVER_CONTRIBUTORS` in `scene-observers.ts`. Keep
`sunElevationDeg` and `daylight` derived from `observers.ts`'s single dot
product: the terminator, the POV panel and the night sky must never disagree.

The **visibility limit** is not a contributor: it narrows a field another
contributor already filled, so `scene.ts` maps every entry through
`withNightSky` (in `night-sky.ts`) after the contributors have run. That pass
owns `visibleBodies`, `visibilityLimit` and `moon`. It also has the `moon.ts`
and `visibility.ts` modules behind it; a component draws, it does not decide.

## The instant

`Instant` is epoch milliseconds, UTC — a plain number, never a `Date`, and it
never leaves the state. Positions are a pure function of the instant, so
scrubbing is exactly reversible: same instant → same state, bit for bit. A test
round-trips through 24 instants and back to assert it.

## The time span

`state.timeSpan` is derived state, kept **out of `SessionEvent`**: whatever runs
(the sandbox defaults to a year) declares the window, and no event can move the
instant outside the timeline that is showing it. Playback speed is
`state.settings.playbackSpeed`, in simulated days per real second.

## Things a later ticket must not do here

- Do not import Three.js, Svelte or the DOM.
- Do not cache positions on a frame counter. If you cache, cache on the instant.
- Do not compute a derived quantity in a component; add a contributor and test
  it here.

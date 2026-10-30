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
| `sky.ts` | `skyToScreen`: the POV panel's only geometry, a pure (altitude, azimuth) → pixel map. |
| `snap.ts` | the pure `snap(instant, snapPoints, ratio)` rule. |
| `snap-points.ts` | which instants are worth snapping to, for a session state. |
| `state.ts` | `createInitialState`, `reconcileTimeSpan` (span and instant normalisation). |
| `scene.ts` | composes `scene-bodies.ts` and `scene-observers.ts` into a `SceneSnapshot`. |
| `reducer.ts` | the handler list and the one entry point. |
| `handlers/*.ts` | one module per event family (`place-observer` owns observer identity and colour). |
| `index.ts` | the public surface; components import only from here. |

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

Append a contributor to `OBSERVER_CONTRIBUTORS` in `scene-observers.ts`.
Ticket 16's visibility limit is one such contributor. Keep `sunElevationDeg` and
`daylight` derived from `observers.ts`'s single dot product: the terminator, the
POV panel and the night sky must never disagree.

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

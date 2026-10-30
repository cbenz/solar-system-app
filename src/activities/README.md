# Activities

An activity is data, never a code branch (ADR-0001). This directory is the whole
registry: Vite imports every `*.activity.ts` file here eagerly, so adding a
module is the registration step. There is no list to edit.

## Declaring a new activity

Create `src/activities/<id>.activity.ts`:

```ts
import { defineActivity, type Activity } from './types';

export default defineActivity({
	id: 'my-activity',
	level: 2,
	subsystem: ['earth', 'moon'], // the Sun is added by the normaliser
	povs: [{ id: 'pov-1', bodyId: 'earth', latitudeDeg: 48.8 }],
	timeSpan: { from: Date.UTC(2025, 2, 20), to: Date.UTC(2025, 2, 21) },
	cameraPresets: [
		{ id: 'wide', label: '...a MessageKey...', distance: 5, pitch: 0.1 }
	],
	settings: [
		{ key: 'speed', kind: 'number', label: '...', default: 1, min: 0.1, max: 10 }
	],
	guide: [],
	missions: []
}) satisfies Activity;
```

- `defineActivity` normalises `subsystem` through `withSun`, and the returned
  type carries a `Subsystem` tuple, so the Sun cannot be absent.
- Every label is a `MessageKey`; add the keys to both catalogues in
  `src/lib/i18n/messages/`.
- `satisfies Activity` is the compile-time check: a missing field fails
  `pnpm check`. `schema.type-test.ts` holds the negative cases.
- Tests register fixtures with `createActivityRegistry([fixture])` and
  `createInitialState({ activities: [...] })`; files under `__fixtures__/` are
  outside the production glob.

## Declaring a mission

A mission is a task on the model, never a form (ADR-0004). Each one declares its
propositions and its success predicate as pure functions over the scene; the
session owns the phases.

```ts
{
  id: 'shortest-shadow',
  label: 'mission.shadows.shortest.label',   // the toolbar button
  brief: 'mission.shadows.shortest.brief',   // the standing sentence
  prediction: {
    prompt: 'mission.shadows.shortest.predict',
    propositions: [
      {
        id: 'noon',
        statement: 'mission.shadows.shortest.claim.noon',
        // The child says this by leaving time at noon and committing.
        holds: (scene) => Math.abs(scene.instant - noonInstant) <= HOUR
      }
    ]
  },
  success: {
    kind: 'continuous',
    measure: (scene) => scene.instant - noonInstant,
    tolerance: 5 * MINUTE,
    closeTolerance: HOUR
  },
  observe: 'mission.shadows.shortest.observe',
  explain: 'mission.shadows.shortest.explain',
  feedback: { close: 'mission.shadows.shortest.almost', right: 'mission.shadows.shortest.right' }
}
```

- A predicate reads `MissionScene` only: instant, time span, camera, observers,
  settings, the two scale toggles, the subsystem. It cannot read the mission
  phase, which is what stops a predicate from depending on itself.
- `discrete` answers yes or no; `continuous` reports a signed distance from the
  target in the mission's units. `closeTolerance` must be at least `tolerance`.
- At least one proposition must be expressible in the scene the mission offers,
  or the mission can never leave the predict phase.
- An optional `motif` reads the scene and returns a pictogram for the brief
  (`sun-high`, `sun-on-horizon`, `sun-below`), so a child who does not read yet
  can still see what the scene is doing. Missions without one render as before.
- Every string is a `MessageKey`; add both locales.

## What the session does with it

`open-activity` saves the sandbox view, narrows the subsystem, takes the
activity's span, POV set and setting defaults, and clamps the camera to the
presets. The zoom clamp is `clampCamera` in `src/lib/session/camera.ts`; the
renderer asks for a camera and uses the session's answer.

An activity opens in the sandbox phase. The first `next-guide-step` starts its
guide and applies step 0; each later press advances one step and applies that
step's camera preset, instant, `tilt` (only when the activity declares a `tilt`
setting) and POV set. No step advances on a timer: a `waitForChild` step moves
only when the event arrives. `leave-activity` while the guide is running keeps
the scene the last applied step produced; leaving before the guide starts
restores the saved sandbox view exactly.

## Testing a guide

Every activity in the registry gets a golden guide test for free:
`src/activities/guide.test.ts` calls `describeGuideGolden` from
`src/activities/guide-golden.ts` for each discovered module. A new activity
needs no test edit — declare its guide and it is checked. An activity with an
empty guide is reported as **skipped** rather than passing silently. The helper
runs the guide from the first step to the last and asserts the ordered camera
presets and instants, and that every narration key exists in both catalogues.
`runGuideGolden(activity)` is exported for a one-off run when a test wants the
applied steps back.

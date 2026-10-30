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

## What the session does with it

`open-activity` saves the sandbox view, narrows the subsystem, takes the
activity's span, POV set and setting defaults, and clamps the camera to the
presets. `leave-activity` restores the saved sandbox exactly. The zoom clamp is
`clampCamera` in `src/lib/session/camera.ts`; the renderer asks for a camera and
uses the session's answer.

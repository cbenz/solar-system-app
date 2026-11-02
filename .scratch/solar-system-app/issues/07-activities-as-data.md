# 07: Activities as data

**What to build:** An activity is a typed data module. A marker appears on the bodies it belongs to; opening it locks the zoom to its camera presets, removes the bodies outside its subsystem, and closing it returns to the sandbox with the camera where it was.

**Blocked by:** 05 — POV

**Status:** resolved

- [x] Dropping in an activity module with no other change makes its marker appear and makes it openable
- [x] An activity declares its subsystem, its POV count, its time span, its camera presets and its settings
- [x] Inside an activity the zoom is clamped and cannot leave the declared preset set
- [x] Leaving an activity restores the sandbox view that was left behind
- [x] An activity module missing a required field fails to compile
- [x] The Sun is present in every subsystem

## Notes

- **Compile-time proof.** `src/activities/schema.type-test.ts` holds the
  negative cases (`@ts-expect-error` on a subsystem without the Sun, and on
  activities missing `guide` / `missions`). `pnpm check` compiles it; if one of
  those lines stops being an error, the unused directive fails the check.
  Verify by deleting the `guide` field from an activity module (or by removing
  a `@ts-expect-error`) and running `pnpm check`. Every production module also
  ends in `satisfies Activity`, and `defineActivity` normalises the subsystem.
- **What "clamped to the preset set" means here.** The allowed zoom is the
  closed interval between the nearest and furthest declared preset distance.
  A request outside it is refused at the boundary; a distance between two
  presets is allowed. The preset toolbar selects a named camera, but pinching
  does not snap discretely to preset ids. The clamp lives in
  `src/lib/session/camera.ts` as `clampCamera(state, requested)`.
- **The camera moved into the session.** To save and restore it, `SessionState`
  gained `camera` and `sandboxView`, and `SceneSnapshot` carries `camera`. Two
  events were added beyond the spec's union: `set-camera` (a gesture asks for a
  camera; the session clamps it) and `select-camera-preset` (the toolbar names
  a preset; the session looks up its distance). The renderer uses a
  `clampCamera` callback from the page and never clamps on its own.
- **Markers** are cyan torus halos around the body, rendered from
  `SceneSnapshot.markers` and removed on leave (an open activity shows its
  toolbar instead). They are drawn for the Sun and the Earth; the Moon has no
  mesh yet, so a marker there would be a halo around nothing (ticket 14). No
  WebGL test exists and there was no browser in this environment: marker and
  toolbar placement are type-checked and built, not visually inspected.
- **The placeholder activity** is `src/activities/day-and-night.activity.ts`:
  level 1, one POV, a day-and-a-half span, three camera presets, one setting,
  empty `guide` and `missions`. Ticket 10 replaces its content. It is a real
  module in the production glob on purpose, so the pipeline is exercised end to
  end rather than only by a fixture.
- **The registry** is `src/activities/index.ts` plus `registry.ts`. The glob is
  `./*.activity.ts`, so fixtures under `__fixtures__/` never ship. The catalogue
  is stored on `SessionState.activities` (default: the glob's activities) so a
  test can inject a fixture and the session stays independent of the registry
  import.
- **Settings UI was not built.** The schema, defaults, validation and
  `set-setting` are in place; the ticket only asked the toolbar to render
  camera presets. Sandbox `set-setting` stays a no-op (it did not exist before
  this ticket), so `playbackSpeed` keeps its default outside an activity.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

# 11: Latitudes

**What to build:** Three places on the same planet, seen at once over a whole year: the Equator, a Tropic and the Polar Circle. This is the activity that makes the tiled POV strip real.

**Blocked by:** 06 — Placing observers, 07 — Activities as data

**Status:** resolved

- [x] The activity declares three POVs and they are tiled flush, without gaps
- [x] In landscape on a phone the POVs move to a side column
- [x] The time span is one year
- [x] At the Equator every day lasts about twelve hours, all year
- [x] At the Polar Circle the polar night begins exactly there and nowhere below
- [x] At the Tropic the Sun reaches the zenith on exactly one day of the year
- [x] The Tropics and the Polar Circles are drawn on the Earth in this activity

## Notes

- **The activity module is `latitudes.activity.ts`**, not `latitudes.ts`: the registry discovers `*.activity.ts` (ticket 07). Same for every later activity.
- **Three camera presets:** `whole-system` (distance 5.5, pitch 0.12), `sunlit-side` (3.2, 0.08) and `above-pole` (3.6, 1.25 rad). The guide uses the first two and ends above the pole; the presets are data, so ticket 08 can drive them unchanged.
- **Circles became part of the scene snapshot.** Ticket 06's `options.circles` was read once at `createScene`, so a circle declared by an activity could never appear when the activity opened at runtime. `buildScene` now puts `circles` in the snapshot (`circlesFor` in `src/lib/session/circles.ts`): the Equator always, plus the open activity's `latitudeCircles`. The renderer adds and drops the line loops on update and disposes the ones it removes. The `CircleSpec`/`circlePoints` seam is untouched.
- **The activity declares four extra circles** (both Tropics, both Polar Circles), all derived from `OBLIQUITY_DEG`, so a later tilt setting moves them without editing the module.
- **POV labels are computed, not stored:** `PovSpec` has no label field, so the panel resolves `placeName(latitudeDeg)` (the same keys ticket 06 uses). The Sun height is `Math.round(sunElevationDeg)` degrees, formatted by `translate`/`formatNumber` in the child's locale.
- **Layout measured from the CSS** (no browser check, per the brief). Portrait 320×568: timeline 128 px, POV strip 159 px, space view 320×281 = **49.5 %** of the viewport; POV strip 28 %. Landscape 568×320: timeline 96 px, POV side column 182×224 = **22.4 %**, space view 386×224 = **47.6 %**. The space view is the largest region in both. Panels have no gap, margin, radius or shadow; adjacent 2 px observer-colour borders are the only separator.
- **The golden guide test asserts the data directly.** Ticket 08's runner and helper do not exist yet (08 is still `ready-for-agent`), so the test pins the ordered camera presets and instants the runner will apply. Delete the local expectation when 08's helper lands; the expected list should not change.
- **One mission is declared** (`zenith-day`, target the June solstice ±2 days) so the activity exercises the mission schema and its catalogue keys. Ticket 09 owns the runner and may reword it; the target and feedback keys are data only.
- **No tilt slider**, per scope; the circles are declared as given. Ticket 13 can drive their latitude through the same `latitudeCircles` field when it adds the setting.
- The Equator annual sum is asserted within 10 minutes: one-minute predicate sampling measured a 6-minute shortfall over 365 days, while the geometry is exactly 12 h per day. The symmetry tolerance is 20 minutes at the Polar Circle because the elliptical orbit's speed is not symmetric in time about the solstice (measured 13–16 min at ±30 d); at the Equator, Tropic and Paris it stays under 2 min.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

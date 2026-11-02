# 10: Day and night, completed

**What to build:** The first activity, finished and demoable end to end: level 1, one POV, a span of a day and a half, its guide, its missions, and the polar day and night.

**Blocked by:** 06 — Placing observers, 08 — Guide, 09 — Missions

**Status:** done

- [x] The activity opens from a marker on the Earth and closes back to the sandbox
- [x] The guide takes the child from one noon to the next and back into darkness
- [x] An observer at the Polar Circle sees a day with no night
- [x] An observer at the Polar Circle six months later sees a night with no day
- [x] At least two missions, both requiring the child to move time rather than a body
- [x] The activity is playable from the pictures alone, without reading

## Notes

- **The span opens in the morning, not at noon.** One day and a half starting four hours before
  local solar noon gives the child a morning to leave time in for the prediction, and still fits
  noon → sunset → midnight → next noon → next sunset. The first noon is 2025-06-20, the day before
  the June solstice, so the midnight between the two guide noons is the solstice midnight.
- **Polar day is inside the activity; polar night is a session assertion.** At the exact Polar
  Circle (90° − ε = 66.56°), the day of the solstice has no night, and that whole window fits in the
  activity's span. Six months later cannot fit in a one-and-a-half-day timeline, so the polar-night
  assertion opens the session directly at the December solstice (the sandbox's year is where a child
  can go to see it). Both tests use `POLAR_CIRCLE_DEG`, derived from `OBLIQUITY_DEG`, and both assert
  the neighbouring latitude `0.02°` below the circle where the 24-hour day / 0-hour day does *not*
  hold.
- **Playable from pictures.** The guide's next control is now a chevron with an accessible label
  (`guide.next` / `guide.start`), not a word. Each day-and-night mission declares a scene-derived
  `motif` (`sun-high` / `sun-on-horizon` / `sun-below`): the mission panel draws it beside the brief,
  and it follows the Sun as the child scrubs. The mission target is the scene (the dot at noon, the
  dot on the terminator); no written sentence has to be understood to complete either mission.
- The noon mission measures the gap between the Sun's current elevation and its elevation on the
  observer's meridian (`maxSunElevationDeg − sunElevationDeg`), so it reads the meridian rather than
  a clock. The second mission measures the distance to the nearest daylight→shadow crossing found
  through the same `isDaylight` predicate the terminator and the POV use.
- `sunHourAngleDeg` was added to the session module (exported from `observers.ts` / `index.ts`) for
  the predictions; `sunAzimuthDeg` now uses it, so there is one hour-angle implementation.
- The optional `motif` on `MissionSpec` and the corresponding `motif` field on `SceneMission` are
  additive; missions without one render exactly as before.

### Code review follow-up

The guide now reaches the polar night itself. A `GuideStep.apply` may declare an optional
`timeSpan` (still the activity's own data, ADR-0001); the last two day-and-night steps move the
observer to the derived Polar Circle, show the June solstice, then widen the timeline to hold both
solstices and land on the December solstice. `day-and-night.test.ts` walks that guide end to end and
asserts a night with no day, so the "six months later" checkbox is no longer ticked by a session
opened directly at December.

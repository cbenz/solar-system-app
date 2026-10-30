# 12: Shadows

**What to build:** A stick in the ground and its shadow, readable as a clock, then watched across a year until it stops being a clock and starts being evidence.

**Blocked by:** 06 — Placing observers

**Status:** done

- [x] A stick and its shadow are visible in the POV
- [x] The shadow is longest at sunrise and sunset, shortest at noon, and points the other way in the afternoon
- [x] A mission asks the child to find the shortest shadow and answers in the scene
- [x] Over a year, the noon shadow changes length at the same place
- [x] The shadow's direction at noon changes across the year

## Notes

- **Ticket 09 was merged into this branch.** The ticket asks for "ticket 09's success
  predicate", and `t/09-missions` was implemented but not yet on the integration
  tip. The branch is a clean fast-forward from that tip, so the merge carries only
  ticket 09's commits; nothing of ticket 12 depends on work that is not in the
  repository.
- **Ticket 08 has no implementation anywhere** (the `t/08-guide` branch equals the
  integration tip), so there is no guide helper to call. The golden guide test
  asserts the exact step list, that every `apply.camera` names a declared preset,
  and that every `apply.instant` lies inside the span. When ticket 08 lands, the
  guide data here is already the shape its handler consumes.
- **The activity's POV is at 19.43°N**, not Paris. The annual check "the noon
  shadow's direction changes across the year" is only true inside the tropics: at
  Paris the noon shadow always points north. 19.43°N is far enough north of the
  equator that the shortest shadow is a readable minimum rather than a near-zero
  spike, and far enough south that the June noon Sun crosses the zenith.
- **The activity opens on a year.** The schema has one `timeSpan` and no event
  changes it, so an activity that opened on a day could not reach the annual part
  of the guide. The mission runs one day inside that year.
- **No browser check was run** (the brief forbids it). The POV glyph is a pure
  function in `shadow.ts` with its own tests; portrait and landscape both come from
  the same viewport-relative mapping.
- The shadow length is clamped at 50 × the stick's height, documented in
  `MAX_SHADOW_LENGTH_FACTOR`. The POV drawer saturates the drawn length so a
  sunrise shadow reaches the horizon instead of stretching into a smear.

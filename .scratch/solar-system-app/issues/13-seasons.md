# 13: Seasons

**What to build:** The child's own belief that summer comes from being closer to the Sun is put on the table, then destroyed by evidence the child produced, and the tilt is what remains.

**Blocked by:** 11 — Latitudes, 12 — Shadows

**Status:** ready-for-agent

- [x] Paris and Sydney are visible at the same instant, one in summer and one in winter, both the same distance from the Sun
- [x] The child can state the distance explanation, and the app then tests it instead of contradicting it
- [x] The app shows the Earth nearest the Sun in early January
- [x] A tilt slider reaches zero, and the seasons shrink to a small remainder rather than disappearing
- [x] Sunlight is drawn as parallel rays striking the Earth
- [x] An exaggerated orbit is available, and demonstrably cannot produce opposite seasons
- [x] No visibly elliptical orbit is drawn while the seasons are being explained

## Notes

- **The tilt-0 remainder is measured in intensity, not in day-length minutes.** With the
  adopted `h₀ = 0` horizon and `δ = 0`, the geometric day length at tilt 0 is exactly 12 h
  at both solstices (it is asserted that way). The remainder that survives is the `1/r²`
  term. Measured at Paris, June minus December: **−30.8 equivalent minutes** at tilt 0
  (December gets the extra light, because December is near perihelion), against
  **686.4 equivalent minutes** at 23.44° — a factor of **22.3**, so the "order of
  magnitude smaller" assertion holds with room to spare. `daylightMinutesForTilt` is the
  documented measure: day length × sin(noon elevation) × (1 AU / r)² × 60. The signed
  difference is negative; its magnitude is the strictly positive remainder.
- **The eccentricity ceiling enforced in the default view is 0.02**
  (`DRAWN_ORBIT_MAX_ECCENTRICITY`); the drawn orbit is a circle (0) unless the child turns
  on `exaggeratedOrbit`, which draws 0.5.
- **Perihelion found by the model:** 2025-01-03 11:56 UTC, `r = 0.98330 AU` (published
  Jan 4 13:28, 0.9833274 AU). Aphelion: 2025-07-05 03:04 UTC, `r = 1.01670 AU`
  (published Jul 3 19:55). Tolerances in the tests are ±2 days for the date and ±0.0005 AU
  for the distance.
- **POV names.** The activity schema has no label slot on a `PovSpec`, so "Paris" and
  "Sydney" are declared as message keys beside the data (`SEASONS_POV_LABELS`), the
  latitudes as numbers. A future UI ticket can surface them without touching the physics.
- **The activity's settings UI is a new generic component** (`ActivitySettings.svelte`):
  number settings become `<input type="range">`, boolean settings a two-state button.
  `playbackSpeed` is filtered out because the timeline already owns that control. The
  no-form guard explicitly allows a range slider.
- **The mission** asks the child to find the day the Earth is closest to the Sun. Leaving
  the timeline in the northern summer and committing records "closer in summer"; the
  success measure is distance from the model's perihelion (2-day tolerance, 15-day
  "close" band). The recorded prediction is copied and survives the reveal. The reveal is
  the scene at perihelion plus the `SeasonBanner` distance readout; the recorded summer
  instant is played back by the mission panel.
- **Scope kept:** Latitudes and Shadows modules untouched. Shared changes are additive
  (optional `tiltDeg` parameters on the observer/shadow functions, an optional
  `SeasonScene` on `SceneSnapshot`, a scene contributor, and the new UI mounts). No N-body
  model was introduced.

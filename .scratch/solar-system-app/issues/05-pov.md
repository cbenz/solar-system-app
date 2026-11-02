# 05: POV

**What to build:** One observer stands on the Earth as a coloured dot, and a panel at the edge of the screen shows what that person sees: a horizon, a sky, and the Sun. The panel darkens the moment the dot crosses into the shadow.

**Blocked by:** 03 — Time

**Status:** resolved

- [x] The panel's border carries the same colour as its dot
- [x] Daylight is derived from the Sun's elevation above the horizon, never from a clock
- [x] The dot crossing the terminator and the panel going dark happen at the same instant
- [x] The Sun is visible in the panel and sets behind the horizon
- [x] A sky is visible above the horizon after dark

## Notes

- The `Observer` type keeps `longitudeDeg` as an optional convention because
  ASTRONOMY.md §3.1 lets activity data declare one. Placement does not store it:
  the observer's hour angle comes from GMST, so only latitude is a control.
- The scene's globe mesh still rotates from the gesture yaw rather than from
  `earthRotationAngle`, so the observer dot is drawn in the ecliptic frame (the
  same normal that decides the terminator) while the texture orientation is
  ticket 03/04's existing seam. The dot and the POV agree; the continents do not
  track sidereal time yet.
- `createInitialState` now seeds one observer (`pov-1`, Paris) so a POV is
  visible before ticket 06 adds placement. Ticket 06 can move it or add up to
  three via `place-observer`; the colour follows the observer.
- `skyToScreen` maps below-horizon altitudes into the ground and clamps at the
  panel bottom, rather than sending them off-screen, so a setting Sun stays
  visibly below the horizon. Azimuth 0° (north) is the left edge, 180° (south)
  the centre.
- Night-sky stars in `PovPanel` are decorative placeholders; ticket 16 replaces
  the star layer and adds the Moon and the visibility limit.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

# 15: Sandbox editing

**What to build:** The sandbox stops being an observatory and becomes a workbench: bodies can be dragged off their orbits and their properties edited, and the orbit recomputes as a consequence.

**Blocked by:** 07 — Activities as data

**Status:** resolved

- [x] A properties card per body opens from the toolbar, and editing requires pressing the pencil first
- [x] Mass, distance and speed are editable, and the orbit changes accordingly
- [x] A body can be dragged off its orbit and lands on a new one
- [x] A body dropped with no velocity follows a documented convention rather than an undefined one
- [x] Launching the Moon fast enough makes it leave and not come back
- [x] Scrubbing stays reversible after any edit

## Notes

- **Zero-velocity convention: circular at the drop radius.** ADR-0007 allows either
  "keeps its previous velocity" or "starts circular at that radius"; this ticket chose the
  second. It is deterministic at every radius, needs no history, and reads as "dropped at
  rest, it goes round". The doc comment in `src/lib/session/sandbox.ts` states it.
- An edit restarts the orbit's phase at the current instant: position is continuous, only
  the velocity changes, and the new elements are derived from that state vector with the
  edit instant as epoch. Nothing is stored but the state vector (`SandboxOrbit`).
- The properties card's mass slider reaches stellar masses on purpose: in a two-body model
  the secondary's mass enters `mu`, so it is the only way a mass edit visibly changes an
  orbit. A distance edit is refused when the requested semi-major axis is impossible at the
  body's current radius (`a <= r/2`), because vis-viva has no solution there.
- The Sun is draggable in the sandbox only. Moving it does not translate the other orbits:
  it moves the light source relative to the planets, which is what the lighting-follows rule
  is about (ADR-0004 rule 2). `move-body` is refused in activity mode, and activities read
  the ephemeris only, so they never see an edited orbit.
- A body dropped at rest is dragged by its mesh in the scene. The Sun and the Moon are
  draggable; the Earth is not, because dragging the globe is already observer placement
  (ticket 06). The Earth's orbit is still editable from its card.
- The Moon now has a small grey mesh and escaped bodies draw an amber future track; both
  are additive and ticket 14 may replace the Moon's material.
- The scene is geocentric (the Earth is the drawn origin), so a drag is converted back to
  a position relative to the Earth; the page adds the Earth back for the Sun's absolute event.
- Not done: N-body physics and collisions (out of scope), and no new activities.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

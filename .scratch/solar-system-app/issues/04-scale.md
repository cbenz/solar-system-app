# 04: Scale

**What to build:** Two independent switches, true distance and true size, both off by default, and the scene states in words when a distortion is in play so the picture can never quietly mislead.

**Blocked by:** 03 — Time

**Status:** done

- [x] Both switches are off on a first visit
- [x] Turning on true distance while true size stays off keeps the bodies visible at their enlarged size
- [x] Turning on true size while distance stays distorted keeps the distances readable
- [x] The scene prints which distortion is active, in the child's language
- [x] The statement disappears only when both switches are on

## Notes

- **The mapping, since the ticket left it open.** Distances are log-compressed
  above a 0.01 AU floor (`drawn = floor * (1 + ln(d/floor))`), so the Earth is
  drawn 5.6 Earth radii from the Sun instead of ~23 500, and the Moon's orbit is
  below the floor and therefore drawn true. Radii get one enlargement (234.8x,
  which makes the drawn Earth 0.01 AU) capped for the Sun at twice the drawn
  Earth radius. The numbers and the reasons are in the `scale.ts` doc comment,
  and `scale.test.ts` asserts them.
- **The factor applies to a body's offset from its primary** (`primaryOf`), not
  to its heliocentric position: compressing heliocentric positions would put the
  Earth and the Moon on the same point. `scale.ts` therefore also says which
  body orbits which.
- **The snapshot carries the factors.** `SceneBody` gained `distanceFactor` and
  `radiusFactor`, computed in `scene-bodies.ts`, so the renderer multiplies and
  never decides. Positions in the snapshot stay true.
- **A Sun mesh was added.** Nothing else drew the Sun, and a distance toggle
  with nothing to move would be invisible. It is placed and sized from the
  snapshot's factors.
- **Camera framing is untouched, as the ticket asked.** Ticket 01's camera
  orbits the Earth between 1.6 and 8 drawn Earth radii. The compressed Sun sits
  5.6 radii *sideways* from the Earth, so it is outside that range: the Sun is
  drawn but off-screen, and the true-distance view is off-screen by design
  ("true distance is for looking"). Whoever owns the camera presets (the spec
  has no ticket for them) will need to widen the range before the Sun is
  visible; that is a camera change, deliberately not made here.
- **The Earth at true size** is 0.004 scene units, i.e. a dot at the current
  zoom. That is what the switch means, and the notice's sizes half disappears,
  but it will look empty until the camera can follow it.
- **The Moon's drawn orbit is inside the drawn Earth** in the readable default
  (its orbit is below the distance floor, its radius is enlarged 234.8x). No
  Moon mesh exists yet; ticket 14 (eclipses) will need a readable offset, which
  is a second distortion to decide then, not a factor to sneak in here.
- No browser was available in the headless environment, so the banner's position
  and the two new buttons were type-checked and built, not visually inspected.

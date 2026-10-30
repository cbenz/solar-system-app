# 06: Placing observers

**What to build:** The child taps anywhere on the globe to put an observer there, or drags an existing one, and the place names itself. The camera holds still for the whole gesture.

**Blocked by:** 05 — POV

**Status:** resolved

- [x] Tapping anywhere on the visible globe places the observer at that latitude
- [x] Dragging moves the observer along its meridian only
- [x] The camera does not move during a drag or a tap
- [x] The place is labelled with its geographic name, computed from the latitude rather than chosen from a list
- [x] The Equator is drawn on the Earth at all times
- [x] A tap on the far side of the globe does not place an observer

## Notes

- **The placement frame is camera-facing.** Only the latitude is stored, so the
  renderer cannot know which longitude an observer belongs to. A dot is drawn on
  the meridian that faces the camera, at its latitude; the same frame answers
  `pickLatitude`, so a tap and the dot it places agree. Consequence: the
  Equator ring does not follow ticket 01's decorative mesh spin. Once an activity
  declares a longitude (ticket 07+), the frame can rotate with the planet.
- **"Tap on the far side" cannot happen through a ray from outside the sphere.**
  The ray meets the near hemisphere first, so the gesture is rejected earlier
  than the ticket imagines. `pickLatitude` still implements and tests the rule
  (a ray whose only forward crossing is beyond the centre returns `null`), which
  also covers a camera that ends up inside the globe.
- **Placement targets the first observer** (`placementTargetId`), because no
  selection exists before ticket 09. A drag targets the dot it grabbed, even
  when it is not the first POV.
- **Equator only** on purpose; `CircleSpec[]` is the seam ticket 11 fills.
- **Not done:** no rotate/zoom suppression on a two-finger pinch that starts
  during a placement gesture — the second finger cancels the placement and the
  pinch takes over, which is the documented behaviour of the reducer.
- The page's session variable is named `session`, not `state`: `svelte-check`
  resolves `$state` as a store subscription of a variable named `state`, so a
  second `$state` declaration in the same component fails to type-check even
  though the build succeeds.

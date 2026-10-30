# 16: Night sky

**What to build:** A sky worth looking at after dark: decorative stars, and a Moon that is exactly where the model says it is.

**Blocked by:** 05 — POV

**Status:** done

- [x] Stars are decorative and the app never claims otherwise
- [x] The Moon is drawn at its true position, with the phase the model implies
- [x] A visibility setting hides bodies the eye could not actually see from that point, and shows them again when off

## Notes

- **The Moon's position already existed** (ticket 03's `moonGeocentricPositionAu`, Meeus 47.a
  truncated series). I extended nothing there and added no new assertion: `ephemeris.test.ts` already
  pins λ/β/Δ against 1992-04-12 0h TD within 0.15° / 0.05° / 0.5 %, which is the tolerance
  ASTRONOMY.md §1.3 states.
- **Phase is vector-based**: `f = (1 − cos ψ)/2` from unit vectors, never a longitude difference
  (ASTRONOMY.md §6.1). Waxing is the sign of the `z` component of the Sun × Moon cross product, the
  sine of λ☾ − λ☉ scaled by the two lengths.
- **Moon magnitude** is the standard two-term phase fit plus the distance term
  (`−12.73 + 0.026·|α| + 4e-9·α⁴ + 5·log10(384 400/d)`), cited to ASTRONOMY.md §6.3, which takes it
  from Meeus and the *Explanatory Supplement*. The Sun is the published −26.74; the Earth seen from
  the Moon has **no modelled magnitude**, so the limit leaves it alone rather than inventing a number.
- **The ticket's "Moon above the horizon but too faint" case is not physically reachable** with this
  fit: the faintest Moon the formula produces is about −3.8 mag, always below the 6.0 limiting
  magnitude. The daylight rule (`m < −4` while the Sun is up) is what actually hides a Moon above the
  horizon, and that is the tested case: 2025-03-29 10:00 UTC, Paris, Moon at 37.7° and a −3.8 mag
  crescent while the Sun is 37.5° up. The test asserts those preconditions, so it cannot go stale.
- **The angular floor** is 0.1°, far below the real Moon's 0.49–0.56°; it never hides the Moon and
  exists to guard the degenerate case, which is tested directly on the predicate.
- **No catalogue string was added for the stars.** The ticket allows either, and the UI says nothing
  rather than making a claim: no constellation, no named star, no band that could read as the Milky
  Way. The stars are seeded (`NIGHT_SKY_SEED`) and generated uniformly over the hemisphere, so they
  do not shimmer between renders; only the Moon is astronomically placed.
- **`set-setting` now has a handler** (`handlers/set-setting.ts`), because ticket 16 needs a settings
  toggle and the event was still unimplemented. `session.test.ts` previously used `set-setting` as
  its example of an unimplemented event; it now uses `switch-subsystem`, which ticket 07 owns.
- The visibility limit narrows `visibleBodies` in a post-pass (`withNightSky` in `night-sky.ts`,
  applied by `scene.ts`) rather than as a contributor, because a contributor appends a second entry
  instead of narrowing the first. `src/lib/session/README.md` was updated to say so.
- **Not done, on purpose:** latitudes (11), seasons and eclipses (13–14) untouched; no planets in the
  night sky (nothing asks for them); no true-size Moon in the POV (the disc is enlarged to stay
  readable and the app already says sizes are distorted).

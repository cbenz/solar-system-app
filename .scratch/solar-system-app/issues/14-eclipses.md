# 14: Eclipses

**What to build:** The child lines the Moon up themselves, and three people on the ground see three different things at the same instant. Then scrubbing through months shows how rarely it works.

**Blocked by:** 11 — Latitudes

**Status:** done

- [x] The child can place the Moon and find the alignment
- [x] Three POVs show totality, partiality and plain sunlight at the same instant
- [x] The Moon's orbit is visibly inclined relative to the Earth's orbit
- [x] Scrubbing across months shows most alignments failing
- [x] A lunar eclipse is shown the same way, with three observers

## Notes

**The three observers and the instant they share.** The solar triplet is staged at
**2024-04-08 18:20 UT**, the instant the model's umbra is over east Texas:
`32.0°N, 95.0°W` in the umbra (total), `34.052°N, 118.244°W` (Los Angeles,
published partial only) in the penumbra, `20.0°S, 70.0°W` (Chile) in plain
sunlight. Longitudes are declared in the activity data: latitude alone would put
every POV on Greenwich, and the 2024 band is a 200 km strip over Texas. The three
POVs darken by 1.00 / 0.28 / 0.00. The same three are all on the night side at
2025-03-14 06:59 UT, which is why one POV set serves both eclipses.

**The lunar case is the published 2025-03-14 eclipse**, so it *is* inside the
activity's span. Model against the published circumstances: `none` at 03:00,
`penumbral` at 05:30, `partial` at 06:40 (obscuration 0.88), `total` at 06:59
(published greatest 06:58:47, totality 06:26–07:32). The umbra/penumbra check
gives 41.0′ and 73.0′ at the mean distance, matching §5.1.

**Counts for the rarity assertion**, hourly sweep of calendar 2024:
**13 new moons** (alignment in ecliptic longitude within 1°), **2 solar eclipses
(2024-04-08 and 2024-10-02)**, **50 aligned hours** and **8 eclipse hours**. So
13 ≥ 4×2 events and 50 ≥ 4×8 hours; the two eclipse runs are 177 days apart.
Counting *sky-separation* hours instead does not separate the two populations —
the penumbra touches the Earth for every hour within ~1° of a nodal conjunction —
so the test counts events (conjunctions vs eclipses), which is the rarity the
child actually experiences. The sweep deliberately runs over calendar 2024 while
the activity's span is 15 months: no calendar year holds both a total solar and
a total lunar eclipse, so the span is 2024-01-01 → 2025-03-31 and the sweep uses
its twelve-month core.

**The Moon model is ~17 minutes early for the 2024-04-08 conjunction** (0.2° of
lunar longitude, inside the documented 0.1–1° of §1.3). Consequence, stated
because it changes an assertion: **Dallas itself comes out `partial`** in this
model (separation 0.032° against a 0.016° totality threshold), so the umbra POV
is at 32.0°N/95.0°W — ~180 km from Dallas, inside the model's band on the same
real path — rather than at Dallas. Los Angeles is asserted on classification
only, as ASTRONOMY.md row 21 says; its model obscuration is 0.28 against the
published 48.8 %, which is the same lunar-longitude error showing up as a
percentage. That is why the doc comment in `eclipses.ts` explains the staging
rather than claiming Dallas.

**Placing the Moon is a setting, not hidden state.** `moonOrbitOffsetDeg`
(`MOON_ORBIT_SETTING_KEY`) is an offset along the Moon's inclined orbit, applied
as a rotation about the orbit's **normal** (an extra argument of latitude).
Offset 0 is the ephemeris Moon bit for bit, which keeps the staged eclipses real;
the child drags the Moon and the page turns the drop into a `set-setting`. The
app never snaps the Moon to the alignment — only onto its own orbit, which is
what makes the ring readable. Declaring the setting is also what enables the
drag, so no chart of activity ids lives in the page.

**A second distortion was needed and is now in `scale.ts`.** Ticket 04 handed
this over explicitly: the Moon's true drawn distance is inside the enlarged
globe. The readable default now draws the Moon's orbit at 2.5 drawn Earth radii
(factor 9.73), the renderer scales the Moon's offset by *its own* distance factor
instead of the Earth's, and the two `scale.test.ts` assertions that pinned the
old factor were updated with the reason. With true distance on, the factor is 1
and the Moon is back inside the Earth, as true distance means.

**The drawn inclination** is asserted off the sampled ring, not off the constant:
the ring's plane normal is 5.145396° from the ecliptic pole (tolerance 1e-3°),
and the ring crosses the ecliptic reference ring exactly twice, at the nodes.

**Not done, deliberately.** The Sun is still draggable in the activity's space
view (the renderer only knows "bodies may be dragged"); the session refuses the
move so it snaps back, but it previews. A per-body drag permission would be the
clean fix and is not in this ticket. No N-body simulation, no eclipse prediction
from the ephemeris (§1.3 forbids it), no annular-eclipse staging (the predicate
handles it, the activity does not stage one), and no browser check — headless
Chrome is unavailable here, so `pnpm check`, `pnpm test --run` and `pnpm build`
are the whole verification.

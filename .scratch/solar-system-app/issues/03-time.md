# 03: Time

**What to build:** A headless session module computes where the Earth is at any instant from a two-body orbit, and a timeline along the bottom moves that instant. The child drags the timeline and watches the Earth travel round the Sun; pressing play animates it.

**Blocked by:** 01 — Boot and Earth

**Status:** resolved

- [x] The session module takes an event and returns the new state plus a scene snapshot, and renders nothing
- [x] The Earth's position at a known instant matches a published astronomical value within a small tolerance
- [x] Scrubbing backwards to an instant returns exactly the state of scrubbing forwards to it
- [x] The timeline shows the date and the clock time, and its span is declared by whatever is running
- [x] The span also appears in words behind the track, and cannot be selected
- [x] Play and pause work, and playback speed is not on the timeline
- [x] A test asserts the Earth is nearest the Sun in early January

## Notes

- The ephemeris is `agent-notes/ASTRONOMY.md` §1.2/§1.3: Meeus' of-date solar
  elements and the Kepler + 17-periodic-term Moon. Distances in the session module
  are **AU** for every body (`AU_KM` in `ephemeris.ts` converts). Ecliptic of date,
  heliocentric scene positions, the Sun at the origin.
- `src/lib/i18n/locale.ts` and `src/lib/i18n/messages.ts` are placeholders for
  ticket 02: ticket 03 needed `Locale`, `detectLocale`, `t` and seven `time.*`
  message keys before ticket 02 landed. Both files are marked PLACEHOLDER and are
  meant to be replaced wholesale by the merger; consumers only use `Locale`,
  `detectLocale`, `MessageKey` and `t`. The timeline's date and clock formatting
  calls `Intl.DateTimeFormat` inline with a `TODO(ticket 02)` next to it.
- The timeline snaps to equinoxes, solstices, perihelion and aphelion, and to the
  current day's sunrise/sunset **when an observer exists**. No event places an
  observer until ticket 05, so in practice only the seasonal points appear today;
  the observer branch is implemented and exercised through the scene snapshot.
- `src/lib/session/observers.ts` derives `sunElevationDeg`/`daylight` from the one
  dot product (§4), because `SceneSnapshot.observers` requires them. Tickets 05, 10
  and 33 should build on it rather than re-derive the geometry.
- The scene takes its sunlight direction from the Earth's position in the snapshot,
  but the Earth is not yet drawn travelling round the Sun: the distance scale that
  makes the orbit visible is ticket 04's (ADR-0003).
- Playback stops at the end of the span instead of wrapping; pressing play at the
  end restarts from the span's start.
- No component tests, per the spec. There was no browser automation available in
  this worktree, so the timeline was verified by `svelte-check`, the static build
  and the pure modules, not by a visual pass.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

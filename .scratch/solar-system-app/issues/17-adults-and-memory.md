# 17: Adults and memory

**What to build:** A parent can find any activity from a list instead of hunting the map, the app remembers where the child was, and every control can be reached with one thumb.

**Blocked by:** 10 — Day and night, completed

**Status:** resolved

- [x] A sidebar lists every activity, with its level
- [x] The last activity and the active locale come back on a return visit
- [x] Every touch target is at least 44 px and reachable one-handed on a phone
- [x] No control requires two hands
- [x] The layout works in portrait and landscape without asking the child to rotate the device

## Notes

### What "the last activity comes back" means

The app opens on the Earth, exactly as on a first visit, and shows **one visible
resume control** naming the last activity ("Resume: Day and night"). One tap
dispatches the ordinary `open-activity` — the same event a marker tap and a
sidebar row dispatch — so the child lands in that activity's **sandbox phase**.

It does *not* reopen the activity on its own, and it does not restore the instant
it was left at: the instant is not among the four persisted fields (the ticket
allows nothing else to be stored), so "at the instant it was left" was not
reachable without breaking the storage policy. The resumed activity opens on its
own span and its own default camera, like any open.

The offer is a rule in `src/lib/session/resume.ts` (`resumeOffer`): sandbox mode
only, remembered id still in the registry only. The page owns the storage adapter
and a one-way "offer already made" flag, set once the child has opened anything,
so leaving an activity does not immediately offer to reopen it.

### Persisted fields

Four, plus the format version: `activityId`, `locale`, `trueDistance`,
`trueSize`. `src/lib/persist/storage.ts` writes exactly those and
`storage.test.ts` asserts the key set, so a later state field cannot start being
persisted by accident. The last activity is `state.activityId`, which is `null`
when the child is at home — leaving an activity clears the memory instead of
offering it back.

Locale: on a *return* visit the stored locale wins even when the device language
differs (one household, one device). With nothing stored, the device language
decides, and English is the fallback — `readStored` returns `null` for a first
visit so the stored default locale never overrides the device.

Safe fallbacks, all tested and none throwing: corrupt JSON, empty string, `null`,
a bare string or array, an unknown version (whole value → defaults, not guessed),
an activity id the registry no longer holds (that field → `null`), a locale the
app no longer speaks (that field → default), a field of the wrong type (that
field → default, the other three kept). Storage errors (private mode, full disk)
are swallowed: forgetting is always better than a broken tap.

No analytics, no identifiers, no server, no router.

### Touch-target audit

Every interactive control, with its CSS minimum. "44" is `min-height: 44px`
and/or an explicit width; text pills are wider than 44 px because of their label.

| Control | File | Size |
|---|---|---|
| Sidebar toggle (☰) | `ui/ActivitySidebar.svelte` | 44 × 44 |
| Sidebar close (✕) | `ui/ActivitySidebar.svelte` | 44 × 44 |
| Sidebar activity row | `ui/ActivitySidebar.svelte` | min-height 48, full width |
| Resume pill | `ui/ResumeBanner.svelte` | min 44 × 44, grows with the title |
| Language switch | `i18n/LanguageSwitch.svelte` | min 44 × 44 |
| Camera presets, missions, leave | `ui/ActivityToolbar.svelte` | min-height 44 + 1.8 rem padding |
| Body buttons (sandbox) | `ui/SandboxToolbar.svelte` | min-height 44 + padding |
| True distance / true size / visibility | `ui/ScaleBanner.svelte` | min 44 × 44 |
| Play / pause | `ui/Timeline.svelte` | 48 × 48 |
| Timeline scrubber (`role="slider"`) | `ui/Timeline.svelte` | 44 high, full track width |
| Guide next / mute | `ui/GuidePanel.svelte` | min 44 × 44 |
| Mission action / abandon | `ui/MissionPanel.svelte` | min-height 44 + padding |
| Properties close / pencil | `ui/BodyPropertiesCard.svelte` | 44 × 44 |
| Properties confirm / cancel | `ui/BodyPropertiesCard.svelte` | min-height 44 + padding |
| Properties and settings sliders | `ui/BodyPropertiesCard.svelte`, `ui/ActivitySettings.svelte` | 44 high |
| Activity setting toggle | `ui/ActivitySettings.svelte` | min-height 44 + padding |
| POV panels | `ui/PovPanel.svelte` | no interactive control |

One-handed reach: the new control (sidebar toggle) is **bottom-left**, inside the
timeline's left gutter — `Timeline.svelte` gained a 3.5 rem start padding so the
scrubber is not under the button. The list opens upward (portrait) or rightward
(landscape) from that same corner. The resume pill is top-**centre** (never a
corner), and the same activity is one tap away in the bottom-anchored sidebar
list, so no destination lives only in a top corner.

Pre-existing top-anchored toolbars were not moved (they belong to tickets 06,
08, 09 and 11): `SandboxToolbar` (top-left), `ActivityToolbar` (top-centre),
`GuidePanel` and `MissionPanel` (top-left, activity mode). They are all reachable
on a tablet and duplicated by nothing; this ticket did not restructure other
tickets' chrome.

No control needs two hands. The only two-pointer interaction is the pinch zoom,
which is a gesture (`scene/gesture.ts`), not a control, and is exempt by ticket
01.

### Layout breakpoints

- `@media (orientation: landscape)` in `ActivitySidebar.svelte`: the list becomes
  a left column (`min(20rem, 45vw)` wide, full height minus the toggle row)
  instead of a bottom sheet (`max-height: min(55vh, 26rem)`). A phone in
  landscape therefore gives the height back to the space view; portrait gives it
  the bottom sheet.
- Existing breakpoints this ticket respects: `(orientation: landscape) and
  (max-height: 40rem)` shortens `--timeline-height` (app.css), and the POV dock
  already moves to a right-hand column in landscape.
- No layout asks the child to rotate: both orientations are usable, and the
  sidebar, the resume pill and the timeline are anchored to edges, not to a
  fixed width.

### Deliberately not done

- **The sidebar is hidden while an activity is open.** `open-activity` is a
  no-op in activity mode (ticket 07: an activity is never nested in another), so
  a row would be a dead tap there. The way out is the existing "Leave activity"
  button; the list returns in the sandbox. A one-tap switch between activities
  would need a new session event, which is ticket 07's boundary, not this one.
- **No instant, camera or mission in storage**, per the ticket's four fields.
- **No route, no server, no analytics.**
- The activity schema gained a required `title: MessageKey` (all five activities,
  three fixtures and `schema.type-test.ts` updated) because the list has to name
  each activity from the catalogue; an activity without a title is now a
  compile error, in the spirit of ADR-0006.

### Code review follow-up: one thumb

`ActivityToolbar`, `MissionPanel`, `GuidePanel` and `ActivitySettings` are now bottom-anchored.

- Portrait: the toolbar sits just above the POV strip; the mission/guide panel and the settings sit
  one toolbar-height above it. None covers the timeline or the POV panels.
- Landscape: the POVs are the right-hand column, so the toolbar uses the remaining width, and the
  settings sit to the left of that column. Mission/guide panels stay in the space view's share.
- The settings panel shows only in the activity's sandbox; the guide and the mission have their own
  panels, so two sets of controls never compete for the same corner.
- Every control keeps its 44 px minimum. The sandbox body list shows the Sun, Earth and Moon only;
  the other planets are tapped in the scene, which avoids ten pills on a phone.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

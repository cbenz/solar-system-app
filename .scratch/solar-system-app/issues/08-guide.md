# 08: Guide

**What to build:** A guided walkthrough drives the camera and the clock step by step and narrates, pausing where the child must press next. The narration is spoken and written at once, and leaving mid-way keeps the scene where the guide left it.

**Blocked by:** 07 — Activities as data, 03 — Time

**Status:** done

- [x] A guide is an ordered list of steps, each applying a camera preset, an instant, and optionally a tilt or a set of POVs
- [x] A step declared as waiting does not advance until the child presses next
- [x] Narration is spoken in the active locale, and the same text is displayed with the spoken sentence highlighted
- [x] Muting the voice keeps the text
- [x] Leaving midway leaves the scene at the instant and camera the last step applied
- [x] A golden test per guide asserts the ordered list of camera presets and instants

## Notes

- **How the guide starts.** The spec's event union has no `start-guide`, so the first `next-guide-step` from the activity's sandbox phase starts the guide and applies step 0. Later presses advance one step; the last step stays put (the panel disables next).
- **"Switching to sandbox" mid-guide** has no event either. Only `leave-activity` exercises the midway-preservation rule: while `phase === 'guide'` it keeps the last applied instant, camera, tilt and POV set and restores only the sandbox window, subsystem and mode. Leaving an activity that never started its guide still restores the saved sandbox view exactly (ticket 07's test is unchanged). Ticket 09/17 can add a dedicated event if they need one.
- **Tilt** is written under the setting key `tilt`, and only when the activity declares a number setting with that key; a step asking for a tilt elsewhere is ignored. The value is clamped to the declared range. Tickets 12/13 declare the setting and the slider.
- **Golden helper.** `src/activities/guide-golden.ts` exports `describeGuideGolden(activity)` and `runGuideGolden(activity)`; `src/activities/guide.test.ts` walks the registry and calls `describeGuideGolden` per activity, so a new activity module is covered with no test edit. An empty guide is registered as `it.skip`, and `runGuideGolden` returns `{ skipped: true }` rather than passing silently.
- **Activities 10–14 still have empty guides**, so `guide: day-and-night` currently shows as one skipped test. That is the expected hand-off.
- **No component or WebGL tests** were added (spec, Testing Decisions). The panel is a renderer; its decisions (sentence spans, speech plan, step application) are pure and tested.

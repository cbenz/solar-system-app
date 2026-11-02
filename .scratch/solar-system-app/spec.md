# Solar system learning app — spec

Status: ready-for-agent

## Problem Statement

A parent wants their child to understand four things that look simple and are not: why there is day and night, why the seasons change, why a year is a year, and how eclipses happen. The child is curious and asks; the parent answers and hears the answer come back wrong a week later.

The reason it comes back wrong is documented and old. Children — and adults, including physics graduates — explain seasons by the Earth being closer to the Sun in summer, which is not the cause and is the opposite of what happens in the northern hemisphere. They explain a lunar eclipse as happening every month, because nothing in a typical picture shows that the Moon's orbit is tilted. They explain day and night by the Sun moving behind the Earth.

The tools that exist do not help with this. A planetarium shows the sky from one point and never the model that explains it. A solar-system explorer shows where the planets are and never what a day feels like. None of them puts the child's own wrong prediction on the table before showing the answer, and none lets the child stand on the ground and in space at the same moment, which is the single move that makes the phenomena click.

And the child is usually on a phone, in portrait, with one thumb.

## Solution

A browser app, no install, that opens on the Earth seen from space. The child zooms out to find the whole solar system, taps a body to find short activities, and picks one. There are five, each built around one phenomenon, each usable three ways: watch it (the Guide drives the camera and the clock and narrates), play with it (the Sandbox, nothing to solve), or solve it (a Mission, where the child acts in the 3D scene and the scene answers).

Every activity keeps the space view as the big picture, in portrait and in landscape, and adds one to three POV panels — what a person standing on the surface sees — so the same instant is visible from both frames of reference at once. A coloured dot on the globe is the person; the panel has the same colour.

Time is a timeline along the bottom whose span the activity declares: a day and a half for day and night, a year for seasons. The child can scrub to any instant forwards and backwards.

Nothing lies about scale silently. Distances and sizes are distorted by default so the scene stays readable, the scene says so in plain words, and two separate toggles let the child see the real distances, the real sizes, or both.

The app speaks French and English from the first screen, in the device's language, with a visible switch.

## User Stories

**Entry and navigation**

1. As a child, I want the app to open on the Earth rather than on a menu, so that I start looking at something instead of choosing something.
2. As a child, I want to pinch to zoom out from the Earth and find the whole solar system, so that I understand where I am.
3. As a child, I want to tap a body and see the activities that belong to it, so that I can find what I can do there.
4. As a child, I want the activity markers to look different from the bodies themselves, so that I know where there is something to do.
5. As a child, I want to close an activity and land back in the sandbox where I left the camera, so that I do not lose my place.
6. As a child, I want one button that puts the camera back on a good view, so that I never get lost in space.
7. As a parent, I want a sidebar listing every activity, so that I can hand my child the one that matches what they just asked about.

**Camera and framing**

8. As a child, I want an activity to stop me from zooming beyond what it is about, so that I cannot wander out of it by accident.
9. As a child, I want three or four camera presets in the toolbar, so that I can see the phenomenon from the angles that matter.
10. As a child, I want the space view to stay the dominant one in portrait and in landscape, so that the model never shrinks to a thumbnail.
11. As a child, I want to change the camera without losing the instant I was looking at, so that moving around does not lose my place in time.

**Time**

12. As a child, I want a timeline along the bottom of the screen, so that I can watch time pass and stop wherever I want.
13. As a child, I want the timeline to show the date and the clock time, so that I know when I am.
14. As a child, I want the timeline to say what span it covers, in words — "a day and a half", "a year" — so that I understand the scale of what I am watching.
15. As a child, I want to press play and watch the phenomenon unfold, so that I do not have to drag it to make it move.
16. As a child, I want to drag the timeline backwards to before sunset, so that I can see the same moment twice.
17. As a child, I want the timeline to snap to the interesting instants as I drag near them, so that I can land on a solstice without pixel-hunting.
18. As a parent, I want the activity to choose the timeline span, so that my child does not end up watching a year at the speed of hours.
19. As a child, I want the playback speed in the activity settings rather than on the timeline, so that the control I use most stays uncluttered.

**POV and observers**

20. As a child, I want one to three POV panels at the edge of the screen, so that I see the phenomenon from the ground without losing the space view.
21. As a child, I want each POV panel to show a horizon, a sky and the Sun, so that "day" and "night" look like something.
22. As a child, I want the observer to be a coloured dot on the globe, so that I can see who the panel belongs to.
23. As a child, I want the panel border to have the same colour as its dot, so that I know which window is which without reading.
24. As a child, I want to tap anywhere on the globe to put an observer there, so that I can try my own places.
25. As a child, I want to drag an observer and have it stay on its meridian, so that it never ends up on the far side of the planet by accident.
26. As a child, I want the camera to hold still while I drag an observer, so that placing a dot does not send the view flying.
27. As a child, I want the place I tapped to be named — Equator, Tropic of Cancer, Polar Circle — so that I learn the names by using them.
28. As a child, I want to see the Equator drawn on every planet, so that I have a landmark to reason from.
29. As a child, I want to see the Tropics and the Polar Circles appear in the Latitudes activity, so that I can see where the properties change.
30. As a child, I want several POVs side by side in the Latitudes activity, so that I can compare the Equator with the Pole without remembering anything.
31. As a child, I want each POV panel to show the Sun's height above the horizon, so that "high" and "low" become numbers I can compare.

**Day & night (level 1)**

32. As a child, I want to see the day/night boundary as a real shadow on the Earth, so that I understand the planet is lit from one side.
33. As a child, I want to watch my dot cross into the shadow and my POV go dark at the same instant, so that the two views visibly agree.
34. As a child, I want to watch the Sun rise and set in my POV, so that sunrise is something I saw rather than something I read.
35. As a child, I want to move my observer up to the Polar Circle and see a day with no night, so that I understand the polar day.
36. As a child, I want to keep going and see a whole night with no day, so that the pair makes sense together.
37. As a child, I want a mission that asks me to bring time to noon where I am, so that I have to work out where the Sun is.
38. As a child, I want the mission to tell me when I am close but not right, so that I can correct myself instead of restarting.

**Latitudes (level 2)**

39. As a child, I want to run three latitudes through a whole year at once, so that I see the Equator is always the same and the Pole is not.
40. As a child, I want to see that at the Equator every day lasts about twelve hours, so that I have one place where the rule is simple.
41. As a child, I want to see the Sun touch the zenith at the Tropic on exactly one day of the year, so that "tropic" means something.
42. As a child, I want to see the Polar Circle is the exact latitude where the polar night begins, so that the boundary is not arbitrary.

**Shadows (level 2)**

43. As a child, I want a stick and its shadow in my POV, so that I have something to measure.
44. As a child, I want the shadow to be long in the morning, shortest at noon and long again, so that I can read the time from it.
45. As a child, I want a mission that asks when the shadow is shortest, so that I have to run the day myself to find out.
46. As a child, I want to watch the same shadow over a whole year and see it change length, so that I discover the tilt before anyone names it.
47. As a child, I want the shadow's direction to change across the year, so that "the Sun is not always in the same place" becomes visible.

**Seasons (level 4)**

48. As a child, I want to see Paris and Sydney at the same instant, so that I see one in summer and the other in winter while both are equally far from the Sun.
49. As a child, I want a mission that asks whether the Earth is closer to the Sun in summer, so that I can check my own belief instead of being told the answer.
50. As a child, I want the app to let my wrong answer stand and then show me the measurement, so that I change my mind myself.
51. As a child, I want to see that the Earth is closest to the Sun in early January, so that the distance explanation breaks on evidence I produced.
52. As a child, I want to drag the tilt down to zero and watch the seasons shrink to almost nothing, so that I see what the tilt is doing.
53. As a child, I want the small remainder to stay visible at zero tilt, so that I learn the distance does something, just not this.
54. As a child, I want to exaggerate the shape of the orbit, so that I can satisfy myself that even then it cannot produce opposite seasons.
55. As a child, I want to see the rays arriving as parallel lines on the Earth, so that "spread out" and "concentrated" become something I can see.
56. As a parent, I want the app never to draw a visibly elliptical orbit while explaining the seasons, so that my child does not learn the wrong cause from the picture.

**Eclipses (level 5)**

57. As a child, I want to place the Moon myself until the Sun and the Moon line up, so that alignment is something I did.
58. As a child, I want to see, at the same instant, one observer in the total shadow, one in the partial shadow and one in plain sunlight, so that "who sees what" stops being mysterious.
59. As a child, I want to see the Moon's orbit slightly tilted relative to the Earth's, so that I understand why an eclipse does not happen every month.
60. As a child, I want to scrub through months and see most alignments fail, so that rarity is something I experienced.
61. As a child, I want a lunar eclipse shown the same way, with three observers, so that I do not confuse the two.

**Sandbox**

62. As a child, I want the sandbox to have no question and nothing to solve, so that I can just play.
63. As a child, I want to change a body's mass, distance or speed and see the orbit change, so that I learn the orbit is a consequence.
64. As a child, I want to drag a body off its orbit, so that I can break the model on purpose and watch the new one.
65. As a child, I want a properties card for a body, opened from the toolbar, so that I can look before I change.
66. As a child, I want a pencil on that card, so that editing is a deliberate act rather than an accident.
67. As a child, I want to launch the Moon hard enough that it leaves, so that "escape" is something I caused.

**Guide**

68. As a child, I want the guide to move the camera and the clock for me, so that I can watch before I try.
69. As a child, I want the guide to stop and wait for me to press next, so that I go at my own speed.
70. As a child, I want the spoken narration and the written text to say the same thing, so that I can read without sound or listen without reading.
71. As a child, I want the sentence being spoken to be highlighted, so that I can follow along.
72. As a parent, I want to mute the voice without losing the text, so that the app can be used in a quiet room.
73. As a child, I want to leave the guide halfway and keep the state it left the scene in, so that I can continue by hand.

**Scale**

74. As a child, I want true distance off by default, so that I can actually see the Earth and the Moon at the same time.
75. As a child, I want to switch true distance on and see how far the Sun really is, so that I understand the default view was a drawing.
76. As a child, I want true size as a separate switch, so that I can keep the real distances and still see the bodies.
77. As a child, I want the scene to say in words when distances are not true, so that I am never fooled by the picture.
78. As a parent, I want the distortion statement to be in the child's language, so that it is not decoration.

**Night sky**

79. As a child, I want a sky with stars above me at night, so that the dark is not an empty screen.
80. As a child, I want the Moon in the sky where it actually is, so that the sky agrees with the model.
81. As a parent, I want the stars to be clearly decorative, so that my child does not learn a false sky.

**Language and devices**

82. As a child, I want the app in my device's language from the first screen, so that I do not need an adult to translate it.
83. As a child, I want a visible button to change the language, so that a whole household can use the same app.
84. As a child on a phone, I want the same app in portrait and in landscape, so that I never have to rotate the device.
85. As a child on a phone in landscape, I want the POV panels to move to the side rather than eat the height, so that the space view keeps its room.
86. As a child on a phone, I want every target I touch to be big enough for a finger, so that I do not miss.
87. As a child on a tablet, I want the same layout to use the extra room rather than stretch, so that it does not look like a blown-up phone.
88. As a returning child, I want my last activity and my language remembered, so that I do not start from scratch.
89. As a child who cannot read yet, I want the day and night activity to be playable from the pictures alone, so that reading is not a prerequisite.
90. As a child, I want to reach every control with one thumb, so that I can hold the phone and use it.

## Implementation Decisions

**Shape of the build**

SvelteKit in static export, Three.js for the scene, one page, no router — the hub is the 3D scene itself (ADR-0005). Activities are typed data modules, never code branches (ADR-0001).

**The single test seam: the session module**

One pure, headless module owns everything observable. It takes an event, it returns the new state plus the derived scene. The Svelte components, the Three.js scene and the POV rendering are downstream renderers with no logic of their own worth testing.

```ts
type SessionState = {
  locale: Locale
  mode: 'sandbox' | 'activity'
  activityId: string | null
  phase: 'sandbox' | 'guide' | 'mission'
  guideStep: number | null
  instant: Instant
  trueDistance: boolean
  trueSize: boolean
  subsystem: BodyId[]
  observers: Observer[]
  settings: Record<string, number | boolean>
}

type SceneSnapshot = {
  bodies: Array<{ id: BodyId; position: Vec3 }>
  observers: Array<{
    observer: Observer
    sunElevationDeg: number
    daylight: boolean
    visibleBodies: BodyId[]
  }>
}

type SessionEvent =
  | { type: 'open-activity'; activityId: string }
  | { type: 'leave-activity' }
  | { type: 'next-guide-step' }
  | { type: 'scrub-to'; instant: Instant }
  | { type: 'place-observer'; povId: string; latitudeDeg: number }
  | { type: 'switch-subsystem'; subsystem: BodyId[] }
  | { type: 'set-setting'; key: string; value: number | boolean }
  | { type: 'toggle-true-distance' }
  | { type: 'toggle-true-size' }
  | { type: 'set-locale'; locale: Locale }
```

**Activity schema**

```ts
type Activity = {
  id: string
  level: 1 | 2 | 3 | 4 | 5
  subsystem: BodyId[]           // the Sun is implied in every subsystem
  povs: PovSpec[]               // 1 to 3
  timeSpan: { from: Instant; to: Instant }
  cameraPresets: CameraPreset[]
  settings: SettingSpec[]
  guide: GuideStep[]
  missions: MissionSpec[]
}

type GuideStep = {
  narration: MessageKey
  apply: {
    camera?: PresetId
    instant?: Instant
    tilt?: number          // only where the activity declares a tilt setting
    povs?: PovSpec[]
  }
  waitForChild: boolean
}
```

Every user-visible string in these modules is a message key, never a literal (ADR-0006).

**Astronomy**

Positions come from closed-form two-body conics, never from force integration (ADR-0007). The ephemeris lives inside the session module and is not a separate seam: the assertions worth making are the derived quantities — Sun elevation, daylight, visibility — which are exposed by the session's scene snapshot anyway.

Two independent scale distortions, true distance and true size, both off by default, with the distortion printed in the scene when off (ADR-0003).

The Sun is in every subsystem; other bodies drop out (ADR-0002). Light is always derived from the Sun's real position, and the sandbox is the only place where the Sun itself can be moved (ADR-0004).

**Observers and POVs**

An observer is defined by a body and a latitude, and stays stuck to the surface while time runs; longitude is not a control, because the planet's rotation already sweeps every longitude. Tapping the globe places an observer; dragging moves it along its meridian only, with the camera frozen for the duration. The placement is labelled with its geographic name, computed rather than chosen from a list.

POV count is declared per activity, capped at three, and the panels are tiled flush at the edge of the screen, never floating. In landscape on a phone they move to a side column.

**Time**

The timeline's span is declared by the activity, shown as ghost text behind the track and never selectable. Playback speed lives in the activity settings. Scrubbing is reversible, forwards and backwards, with no recomputation — this is what the Keplerian decision buys.

**Guide and missions**

The guide is a list of steps, each applying a camera preset, an instant, and optionally a tilt or a POV set, then pausing when the child must press next. Narration is a message key resolved to both text and speech through the browser's speech synthesis in the current locale, with the spoken sentence highlighted in the text.

Every activity runs predict → manipulate → observe → explain, and a mission is never a form: the child acts on the model and the model answers (ADR-0004).

**Language**

French and English from the first activity, the device language by default and English as the fallback, with a visible switch. Keys are symbolic and resolved at build time so a missing translation fails the build. The choice of library is still open; Paraglide is the candidate.

**Persistence**

Local storage only: last activity, locale, both scale toggles. No account, no server.

## Testing Decisions

A good test here states what a child would observe, in the vocabulary of the domain, and asserts it through the session module. It never reaches into a module's internals, never mounts a component and never renders WebGL.

Tests target the session module alone. Component tests and Three.js tests are deliberately absent: they would assert implementation detail, and the behaviour that matters is all in the session.

Astronomy is asserted against known values rather than against the implementation, for example: at the June solstice at noon at Paris's latitude the Sun stands about 64.7° above the horizon; the Earth is nearer the Sun in early January than in early July; at the Equator every day of the year lasts about twelve hours; a solar eclipse is visible as total only from a narrow band.

Invariants worth property-testing because they are cheap and catch real errors: Sun elevation never exceeds ninety degrees minus the observer's latitude minus the declination; daylight duration is symmetric about the solstices; daylight duration summed over a year at the Equator is 365 × 12 h within a small tolerance; making the subsystem smaller never changes the position of a body that is still present.

Guide sequences get one golden test per activity: run the guide from the first step to the last and assert the ordered list of applied camera presets and instants. That catches a broken script without asserting the narration text itself.

Prior art: none. This is the first code in the repository.

## Out of Scope

- Real N-body physics, collisions, orbital decay, third-body perturbation.
- Activities about bodies other than the Earth and the Moon; the other planets appear in the map and have no activities.
- Device tilt, augmented reality, a real-time sky matched to the child's actual location and date.
- Native apps, app-store packaging, offline install.
- Accounts, progress sync across devices, analytics, telemetry.
- Recorded voice-over; only the browser's speech synthesis.
- A teacher or classroom mode, class management, printable worksheets.
- Screen-reader semantics for the 3D scene. Large touch targets and readable contrast are in scope; a spoken description of a rendered scene is not.
- The product name, icon and store identity.

## Further Notes

The design session that produced this spec also produced `GLOSSARY.md` (canonical terms with their French labels), seven ADRs, and two research briefings under `.scratch/research/` — pedagogy and misconceptions, and the design-skill inventory. The ADRs are binding: ADR-0004 in particular records four pedagogical constraints that will look like arbitrary choices to anyone who has not read the sources.

Still owed by the design phase, and deliberately not decided here: the chrome layout on a phone in both orientations, the shape of the activity markers on the bodies, the exact contents of each activity's camera presets, the wording of every mission, and the interaction for placing a body with a finger in the sandbox.

The five activities are ordered for construction, not for use: day and night, latitudes, shadows, seasons, eclipses. No order is imposed on the child.

## Code review

Findings from the Standards and Spec reviews, and what was done. Nothing was declined; two items
carry a judgement note.

| finding | outcome |
|---|---|
| A1 stories 2–3: zoom out, find the planets, tap a body | **Fixed.** `BodyId` now carries Mercury, Venus, Mars, Jupiter, Saturn, Uranus and Neptune; the ephemeris gives each closed-form JPL mean elements (cited in `ephemeris.ts`); the sandbox subsystem and the scene draw them, and the camera bound reaches the whole drawn system. Tapping a planet or the Sun opens its properties card (the name). No planet has activities. |
| A2 story 6: one button back to a good view | **Fixed.** `reset-camera` returns the sandbox to `DEFAULT_CAMERA` and an activity to its first declared preset, without touching the instant. The button is in the sandbox and activity toolbars, 44 px, catalogue-labelled. |
| A3 story 19: playback speed in activity settings | **Fixed.** The settings panel no longer filters `playbackSpeed`; the timeline still only reads it. The visibility rule is pure and tested in `ui/activity-settings.test.ts`. |
| A4 story 36 / ticket 10: polar night reachable | **Fixed.** `GuideStep.apply` has an optional `timeSpan`; the day-and-night guide now walks to the Polar Circle, the June solstice and then a widened span holding both solstices, landing on the December solstice. An end-to-end guide test asserts the night with no day. |
| A5 story 53: remainder at zero tilt | **Fixed.** `SeasonScene` carries the June/December equivalent-minute difference at each declared POV; `SeasonBanner` shows it in the active locale through `formatNumber`, so zero tilt still shows a small non-zero number. |
| A6 story 90: one thumb | **Fixed.** `ActivityToolbar`, `MissionPanel`, `GuidePanel` and `ActivitySettings` are bottom-anchored in portrait and landscape, clear of the timeline and the POV strip. Layout recorded in ticket 17's Notes. |
| A7 story 43: gnomon only in Shadows | **Fixed.** `Activity.gnomon` is activity data; `SceneObserver.gnomon` carries it and `PovPanel` draws the stick and shadow only when it is true. Shadows declares it; every other activity shows a clean horizon. |
| A8 ADR-0004 rule 4: predict before manipulate | **Fixed.** `start-mission` freezes a copy of the child-manipulable scene; `record-prediction` matches propositions against that copy and records its instant and settings. Seasons and Eclipses prompts no longer ask the child to scrub or place first. Judgement note: because a mission is never a form, the claim stated is the one the frozen starting view expresses — the child still cannot pick the other claim, but no prior manipulation is required and the recorded claim is immutable. |
| B1 `new Date(instant)` in `season-scene.ts` | **Fixed.** `utcYear` derives the year arithmetically; no `Date` object is constructed from an `Instant`. |
| B2 `session/README.md` conflict markers and stale map | **Fixed.** Markers and duplicate handler rows removed; the table now lists every module, including the new sandbox split, seasons and distortion files, and the renamed terms. |
| B3 avoid *scale* | **Fixed.** `distortion.ts`, `handlers/toggle-distortion.ts`, `DistortionBanner.svelte`, `bodyDistortion`, `DistortionFactors`; imports, tests, styles and comments follow. Activity settings that mean something else were not renamed. |
| B4 avoid *starfield* | **Fixed.** `decorativeStars`, `DECORATIVE_STAR_SEED`, `DECORATIVE_STAR_COUNT`. |
| B5 ambient light from nowhere | **Fixed.** The `AmbientLight` is removed; the Sun's directional light is the only light. The night half is dark. |
| C1 private `Intl.NumberFormat` in `SeasonBanner` | **Fixed.** `formatNumber` gained optional fraction digits and is used for both the distance and the daylight readout. |
| C2 speculative `SunRayOptions` | **Fixed.** The options type and parameter are gone; `parallelSunRays(instant)` uses its fixed readable bundle. |
| C3 session depending on `$lib/scene/random` | **Fixed.** `mulberry32` moved to `src/lib/random.ts`; the renderer and the session both import that neutral module. |
| C4 `sandbox.ts` divergent change | **Fixed.** Split into `sandbox-orbit.ts`, `sandbox-editing.ts`, `sandbox-escape.ts` and `sandbox-sun.ts`; `sandbox.ts` is a re-export barrel, so the public surface and every existing test are unchanged. |

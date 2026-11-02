# 09: Missions

**What to build:** A mission asks the child to predict, then act on the model, then look at what happened. The model answers in the scene. Nothing is ever a form or a multiple-choice question.

**Blocked by:** 07 — Activities as data

**Status:** resolved

- [x] The prediction is recorded before the reveal, and a wrong prediction is accepted and kept
- [x] The answer arrives as something visible in the scene, not as a score or a verdict
- [x] Where the task is continuous, the feedback distinguishes close from right
- [x] No multiple-choice or free-text control exists anywhere in the app
- [x] A mission can be abandoned at any point with nothing lost

## Notes

**The `MissionSpec` shape five activity tickets will write against.** In
`src/activities/types.ts`:

```ts
MissionSpec = {
  id: string
  label: MessageKey          // short name, the toolbar button
  brief: MessageKey          // standing sentence, shown in every phase
  prediction: {
    prompt: MessageKey
    propositions: { id; statement: MessageKey; holds(scene: MissionScene): boolean }[]
  }
  success:
    | { kind: 'discrete'; holds(scene): boolean }
    | { kind: 'continuous'; measure(scene): number; tolerance: number; closeTolerance: number }
  observe: MessageKey        // what to look at, once the model answers
  explain: MessageKey        // the words after the answer
  feedback: { close: MessageKey; right: MessageKey }
}
```

`MissionScene` is `Pick<SessionState, 'instant' | 'timeSpan' | 'camera' |
'observers' | 'settings' | 'trueDistance' | 'trueSize' | 'subsystem'>` — the
child-manipulable scene, never the mission's own phase. A prediction is a scene
state the child produces; `holds` is what makes that state the claim, and the
first proposition that holds when the child commits is recorded with copies of
the instant and settings. At least one proposition must be expressible in the
scene the mission offers, or the child can never commit.

**Deliberate choices.**

- The mission is a `state.mission` field (`{ missionId, phase, prediction }`)
  plus `state.phase = 'mission'`; ticket 08's guide phase is untouched. A
  mission starts only from the activity sandbox (`phase === 'sandbox'`), so a
  guide that ends in the sandbox composes with it.
- `reveal-mission` is refused unless the success predicate is `right`, so a
  close or far attempt never strands the mission in `observe`. The reveal button
  in the panel only appears in that case; "almost" arrives as the mission's
  `feedback.close` key while the child is still manipulating.
- Abandoning is `abandon-mission`: it returns to the **activity's** sandbox with
  the camera and instant where the child left them and leaves `sandboxView`
  untouched. `leave-activity` keeps its ticket-07 behaviour (back to the
  pre-activity view), and it clears a running mission; the ticket's "from any
  phase returns to the activity's sandbox" is therefore split across the two
  events rather than changing `leave-activity`'s existing guarantee.
- No production activity declares a mission yet (tickets 10–14 do), so the
  panel and the toolbar launcher are wired but idle. The two test missions live
  in `src/activities/__fixtures__/mission.activity.ts` with fixture-only keys.
- No scoring, no level change, no persistence: out of scope here.

## Resolution

Resolved on the integration branch `feat/solar-system-app` (PR #1), every checkbox above ticked and
verified by `pnpm check`, `pnpm test --run` and `pnpm build`. The branch was reviewed on two axes —
the repo's documented standards and this ticket's spec — and the findings are recorded in
`.scratch/solar-system-app/spec.md` under `## Code review`.

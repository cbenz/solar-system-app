# UX skills briefing — kids' day/night, seasons, eclipses app

Read: every `SKILL.md` below, plus the `prototype/`, `impeccable/`, `threejs-*` and motion reference
files. Searched the installable index with `npx skills find` (~30 queries). Repo is greenfield — no
`package.json`, no code, only `GLOSSARY.md`, `docs/agents/`, `.scratch/research/pedagogy-and-apps.md`.

The app's hard problems: a 3D scene driven by **touch**, a picture-in-picture frame ("vue au sol")
competing with the main one, a **scripted guide** that must stay in sync with camera and time, and
missions where the child manipulates the model itself. Ages 6–13 are really two products.

---

## A. Already installed

### design-branching (`.agents/skills/design-branching`)

- **Gives**: a divergence protocol. `plan.json` naming 5 positions with an *angle* and an honest
  *cost* before drawing; rendered standalone HTML variants (not prose); a `board.html` comparison
  frame; a lint script for AI tells and content drift; frozen skeleton / free soul; one level per
  round; `.dropped/`; `TREE.md` as memory across context compaction.
- **Does not give**: anything about interaction, 3D, or children. It is a *visual identity* method
  for marketing-shaped pages: frozen section order, hero-first, 5 whole-page variants at ~6
  sections. A WebGL scene has no sections to freeze and is not judgeable from a static screenshot.
  Its own budget warning (~500 words, hero-only round 1) confirms the shape.
- **Verdict**: use it once, late, on the app chrome (HUD, ground-view window, mission card,
  transition screen). Never the scene; never round 1.

### prototype (`.agents/skills/prototype`)

- **Gives**: two branches, both useful here. `LOGIC.md` = one double-clickable HTML file, pure
  state module + free-play buttons + **tabbed guided walkthroughs** with reset-to-known-state —
  literally the shape of our atelier/guide/mission state machine, drivable by a non-developer.
  `UI.md` = `?variant=` switching, floating bar, 3 structurally different variants, hidden in prod.
- **Does not give**: framework guidance (it argues for none, which conflicts with a real app);
  nothing on 3D, touch, or performance. `UI.md` assumes an existing populated page — we have none,
  so sub-shape B ("last resort") is forced.
- **Verdict**: keep. The logic branch is our highest-value low-cost tool for the guide sequencer.

### web-design-guidelines (Vercel, `.agents/skills/web-design-guidelines`)

- **Gives**: a review *procedure*, not knowledge. Fetches
  `raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` at review time
  (**network required**) and reports `file:line` findings.
- **Does not give**: any guideline text of its own — offline it is inert. Desktop-web craft (hover,
  forms, focus, contrast, semantics), no notion of a 6-year-old, a thumb, or a canvas. Reviews DOM
  UI; the 3D scene is out of scope.
- **Verdict**: final DOM/HUD accessibility pass only. Not a design aid.

### diagram-design (`.agents/skills/diagram-design`)

- **Gives**: 45 self-contained HTML/SVG diagram types with an editorial token system, semantic
  patterns (state machine, timeline, loop) and a taste gate (deletion first, 4/10 density).
- **Does not give**: anything interactive or 3D. Output is static explanatory graphics.
- **Verdict**: no role in the product. Only for our own thinking artifacts — a season/eclipse
  timeline, the guide → mission → bac à sable state machine. Cheap, skippable.

### svelte-code-writer + svelte-core-bestpractices

- **Gives**: `svelte-code-writer` wraps `npx @sveltejs/mcp` (docs lookup, autofixer) — **needs
  network** per call. `svelte-core-bestpractices` is real, offline, high quality: `$state`/
  `$derived`/`$effect` discipline, `{@attach}` for syncing external libraries (exactly the three.js
  renderer bridge), `$state.raw` for big payloads, `#key` cost.
- **Does not give**: nothing on three.js, WebGL lifecycle, or disposing a renderer in a component.
  Nothing on touch, layout, or children. The autofixer is a syntax checker, not a reviewer.
- **Verdict**: conditional on Svelte. If so, load `svelte-core-bestpractices` before the first
  component and treat `{@attach}` as the camera/renderer seam.

### Built-in Explore / Plan agents

- **Explore**: read-only locator — "where is X defined / what references Y". Reads excerpts, not
  whole files; reviews nothing. Useless on an empty repo, useful once modules exist.
- **Plan**: architect returning step-by-step plans, critical files, trade-offs. Plans code structure
  — good for "how do atelier, scene, guide, mission compose", bad for "what does the child see".
- **Verdict**: one Plan run before the scene layer. Neither touches UX.

### Adjacent, installed, unasked-for but relevant

`research` (primary-source briefing), `humanizer` (child-facing copy), `playwright-cli` /
`agent-browser` (viewport + touch verification), `codebase-design` (seams around scene/guide/
mission), `teach` ("one tangible win per lesson", fluency vs storage strength).

---

## B. Missing — what the ecosystem does not have

Searched: children ux, kids, kid-friendly interface, child development, educational game, learning
game design, science education, e-learning, storytelling for kids, touch gestures, camera controls,
3d scene design, motion design, onboarding progressive disclosure, cognitive load, usability testing.

**No children's-UX skill exists. Zero hits.** No NN/g kids, no Joan Ganz Cooney Center, no Fred
Rogers Center. The nearest results are unrelated (`dpdpa-compliance`, `k-id-integration`) or
picture-book *generation*. Anything named `kids-*` is content authoring, not interaction design.
Real gap, not a search failure — the six areas split as follows:

| Need | Exists? | Nearest real candidate | What it actually contains | Cost |
|---|---|---|---|---|
| Interaction design for children | **No** | — | — | Must be written by us |
| Touch & gesture affordances | Yes, thin | `owl-listener/designer-skills@gesture-patterns` (2.2K, 3.1K★ repo) | ~90 lines: gesture inventory, discoverability rules, thresholds (10–15px, 500ms), scroll-vs-swipe conflict, "every gesture needs a button alternative" | Prompt-only, no network at runtime. Adult-app generic; says nothing about small hands, 44→64px targets, or a 7-year-old's pinch |
| 3D / WebGL scene & camera | Yes, API-level | `cloudai-x/threejs-skills` (13 skills, 3.8K★, 15K installs each) | Real r186 code: `threejs-interaction` (raycast picking that works when the canvas is embedded, OrbitControls, damping, drag/hover), `threejs-performance` (draw-call budget, merging, instancing, LOD, fill rate, shadow cost), plus lighting/materials/shaders | Prompt-only. It is a **library manual, not camera direction** — no guidance on framing a subject, readable scale, or cinematic transition between two viewpoints |
| Motion & transition design | Yes, strong | `emilkowalski/skills@apple-design` (51K★) and `@review-animations`; `kylezantos/design-motion-principles` (1.5K★) | apple-design: pointer-down response, 1:1 tracking with `setPointerCapture`, velocity, springs, interruptibility, sheets and rubber-banding, reduced motion — i.e. drag/pinch/sheet craft. design-motion-principles: same lineage plus **explicitly weights Jhey Tompkins for kids apps** (playful + polish over productivity restraint) and ships a create/audit split | Prompt-only. Neither knows about a camera; both assume DOM/CSS/Motion |
| Onboarding & progressive disclosure | Yes, generic | `owl-listener@onboarding-design`; `pbakaus/impeccable@…` (`onboard`) | onboarding-design: time-to-value, progressive onboarding, setup wizard, sample data, empty states, activation metrics. impeccable's `onboard` reference is deeper and product-shaped | Both assume accounts and churn; ours is a one-session child with no signup |
| Accessibility for young users | Only adult WCAG | `addyosmani/web-quality-skills@accessibility` (65K), `wshobson/...@wcag-audit-patterns` | Contrast, roles, keyboard, ARIA, focus order | WCAG says nothing about a child who cannot read, cannot hold a device still, or does not know what "drag" means |
| Educational-game design | No | `gamedev-skills@game-feel` (11K), `godot-genre-educational` (250) | game feel: hitstop, screenshake, easing, juice. Educational ones are Godot/Bevy **engine** skills | Wrong engine, and no learning-science content |

Also checked and rejected: `pbakaus/impeccable` (96K★) is the best general design-craft skill in the
index — PRODUCT.md/DESIGN.md, `shape`/`critique`/`audit`/`polish`/`onboard`, an explicit craft
floor — but it downloads a binary on first run (**network**), has no child or 3D guidance, and its
Operate/Experience/Persuade/Read modes fit a product surface, not an atelier.
`gmchande/explorable-skills@explorable` (7 installs) and `didactician` (6) are below the trust
floor.

**The missing skill is the one that matters**: a project-local `kids-touch-ux` skill distilled from
NN/g's children's-UX material, the Cooney Center's co-engagement guidance and Fred Rogers' "no
failure states" stance, cross-referenced against `.scratch/research/pedagogy-and-apps.md` (seasons
is grade-8-hard, the distance theory survives age, rotation must be felt). Write it with `research`,
keep it under 150 lines, put it in `.pi/skills/`. One session; no install closes this gap.

---

## Recommended pipeline

1. **`research` → `.pi/skills/kids-touch-ux/SKILL.md`** — the only real gap; distil NN/g kids,
   Cooney Center, Fred Rogers into our own skill, anchored to the pedagogy doc. Nothing installable
   replaces it.
2. **`/plan` (built-in Plan agent)** — decide the module seams: atelier, scene, camera director,
   guide sequencer, mission state, ground-view compositor. Do this before any component exists.
3. **`prototype` / `LOGIC.md`** — one HTML file, pure state module, free-play + tabbed guided
   walkthroughs. Cheapest way to feel whether guide→mission→bac à sable transitions hold for a
   6-year-old and a 13-year-old at once.
4. **`prototype` / `UI.md` + `design-branching`** — diverging the *chrome* (HUD, floating ground
   view, mission card). Branching supplies the anti-convergence discipline and the honest-cost
   ledger; prototype supplies the runnable switcher. One round, chrome only, never the scene.
5. **Install `emilkowalski/skills@apple-design`** — the app *is* drag, pinch and a floating sheet;
   this is the only skill that says how those must feel (1:1 tracking, velocity, interruptible
   springs, reduced motion).
6. **Install `cloudai-x/threejs-skills@threejs-interaction` + `@threejs-performance`** (two of
   thirteen) — raycast picking inside an embedded canvas, and the draw-call/fill-rate budget a
   phone needs. Cite them for API facts; do not expect camera direction.
7. **Svelte skills, if Svelte is the stack** — `svelte-core-bestpractices` first (offline, and
   `{@attach}` is the renderer seam), `svelte-code-writer` before each component commit.
8. **`playwright-cli` or `agent-browser`** — every round at 390×844, 844×390, 768×1024, 1440×900,
   with real touch emulation. Look at the screenshots; do not audit only the code.
9. **`web-design-guidelines`** — final DOM/HUD accessibility lint (network needed, run it last).
10. **`humanizer`** — every string the child reads, before it ships.

Install list: **`apple-design`, `threejs-interaction`, `threejs-performance`** — all prompt-only,
installed with `npx skills add … -g` (one-time network). Skip every "designer bundle": adult-product
vocabulary we already have, and the children-adjacent ones are too thin to justify another
dependency. Everything else in the pipeline is already installed.

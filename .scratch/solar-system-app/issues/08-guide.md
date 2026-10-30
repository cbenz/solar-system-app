# 08: Guide

**What to build:** A guided walkthrough drives the camera and the clock step by step and narrates, pausing where the child must press next. The narration is spoken and written at once, and leaving mid-way keeps the scene where the guide left it.

**Blocked by:** 07 — Activities as data, 03 — Time

**Status:** ready-for-agent

- [ ] A guide is an ordered list of steps, each applying a camera preset, an instant, and optionally a tilt or a set of POVs
- [ ] A step declared as waiting does not advance until the child presses next
- [ ] Narration is spoken in the active locale, and the same text is displayed with the spoken sentence highlighted
- [ ] Muting the voice keeps the text
- [ ] Leaving midway leaves the scene at the instant and camera the last step applied
- [ ] A golden test per guide asserts the ordered list of camera presets and instants

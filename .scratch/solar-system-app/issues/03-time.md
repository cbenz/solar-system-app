# 03: Time

**What to build:** A headless session module computes where the Earth is at any instant from a two-body orbit, and a timeline along the bottom moves that instant. The child drags the timeline and watches the Earth travel round the Sun; pressing play animates it.

**Blocked by:** 01 — Boot and Earth

**Status:** ready-for-agent

- [ ] The session module takes an event and returns the new state plus a scene snapshot, and renders nothing
- [ ] The Earth's position at a known instant matches a published astronomical value within a small tolerance
- [ ] Scrubbing backwards to an instant returns exactly the state of scrubbing forwards to it
- [ ] The timeline shows the date and the clock time, and its span is declared by whatever is running
- [ ] The span also appears in words behind the track, and cannot be selected
- [ ] Play and pause work, and playback speed is not on the timeline
- [ ] A test asserts the Earth is nearest the Sun in early January

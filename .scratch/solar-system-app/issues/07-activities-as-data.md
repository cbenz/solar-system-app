# 07: Activities as data

**What to build:** An activity is a typed data module. A marker appears on the bodies it belongs to; opening it locks the zoom to its camera presets, removes the bodies outside its subsystem, and closing it returns to the sandbox with the camera where it was.

**Blocked by:** 05 — POV

**Status:** ready-for-agent

- [ ] Dropping in an activity module with no other change makes its marker appear and makes it openable
- [ ] An activity declares its subsystem, its POV count, its time span, its camera presets and its settings
- [ ] Inside an activity the zoom is clamped and cannot leave the declared preset set
- [ ] Leaving an activity restores the sandbox view that was left behind
- [ ] An activity module missing a required field fails to compile
- [ ] The Sun is present in every subsystem

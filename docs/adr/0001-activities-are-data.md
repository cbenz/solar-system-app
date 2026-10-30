# Activities are data, not code

Every activity is declared as a typed data module under `src/activities/`, carrying its subsystem, camera presets, guides, missions, settings, POV count and time span. Adding an activity must not require touching the app shell.

Chosen so the set can grow past the five launched here without the app turning into a switch statement. The consequence is that the activity schema is the real API of this project, and should be settled before the third activity exists.

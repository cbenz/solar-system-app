# Every user-visible string is a message key, from the first commit

The app ships to speakers of more than one language, so no activity data module holds a literal string. Guide scripts, mission briefs, setting labels, the duration ghosted behind the scrubber and the names of bodies are message keys resolved per locale.

Because the activity schema is typed, a missing translation is a compile error rather than a blank line in front of a child. Dates, clock times and numbers go through the locale too, and the guide's narration is the same script spoken by the browser voice for that locale.

Rejected: writing French first and extracting strings later, which turns every existing activity into a migration.

# 02: Language

**What to build:** Every user-visible string comes from a message catalogue. French and English are both complete, the app follows the device language and falls back to English, and a visible control switches the language without a reload.

**Blocked by:** 01 — Boot and Earth

**Status:** done

- [x] No literal user-visible string exists anywhere outside the message catalogues
- [x] The app opens in French on a French device and in English on any other
- [x] Switching the language updates the screen already displayed, with no reload
- [x] Removing a key from a locale fails the build instead of rendering a blank
- [x] Dates, clock times and numbers are formatted for the active locale

## Notes

- No new dependency. The catalogue is hand-rolled and fully typed: `messages/en.ts` is
  `as const` and owns `MessageKey`; `messages/fr.ts` is `Record<MessageKey, string>`, so a
  missing or extra French key is a compile error. Verified by deleting `term.level` from
  `fr`: `pnpm check` fails with the missing property. `pnpm build` alone does not typecheck;
  the compile gate is `pnpm check`, which the CI workflow runs before `pnpm build`, so a
  missing translation still fails the deploy job.
- `src/lib/i18n/locale.ts` exports exactly `Locale`, `LOCALES`, `DEFAULT_LOCALE` and imports
  nothing. Ticket 03 can depend on it without pulling the catalogues in.
- The active locale lives in `src/lib/i18n/store.svelte.ts` (a Svelte 5 `$state`, so the
  switch re-renders the current screen with no reload). This is a temporary owner: the spec
  puts `locale` in `SessionState` with a `set-locale` event, so ticket 03 should move the
  state into the session module and keep `store.svelte.ts` as the thin component-facing
  adapter.
- Locale detection runs once, at layout setup, from `navigator.language`; `fr*` opens in
  French, everything else in English. Nothing is persisted — ticket 17 owns memory.
- `formatDate`/`formatTime`/`formatNumber` take an epoch-ms `Instant` and use the machine's
  local timezone (the test pins `process.env.TZ = 'UTC'` for determinism). `formatTime`
  follows each locale's 12/24-hour habit rather than forcing 24 hours.
- The language switch is the only chrome added: one 44 px button at the bottom right, outside
  the scene, labelled with the target language's native name. Its accessible name, tooltip
  and the document title come from the catalogue. The document title is now owned here, as
  `FOUNDATION.md` said.
- Catalogue seed vocabulary is the glossary's "French labels" table (13 keys), plus the title
  and the three language-switch keys. No speculative activity strings were added.

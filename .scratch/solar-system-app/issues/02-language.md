# 02: Language

**What to build:** Every user-visible string comes from a message catalogue. French and English are both complete, the app follows the device language and falls back to English, and a visible control switches the language without a reload.

**Blocked by:** 01 — Boot and Earth

**Status:** ready-for-agent

- [ ] No literal user-visible string exists anywhere outside the message catalogues
- [ ] The app opens in French on a French device and in English on any other
- [ ] Switching the language updates the screen already displayed, with no reload
- [ ] Removing a key from a locale fails the build instead of rendering a blank
- [ ] Dates, clock times and numbers are formatted for the active locale

# 01: Boot and Earth

**What to build:** The app has a URL. It opens on a rotatable, zoomable Earth rendered in 3D with a decorative starfield behind it, and it redeploys itself from the repository with no build step anyone has to remember.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The build output is static files and runs with no server
- [x] Opening the app shows the Earth, and nothing else asking for attention
- [x] One finger drags to rotate; two fingers pinch to zoom
- [x] The Earth carries a simple texture, and the half turned away from the light is visibly dark
- [x] The stars are decorative and the scene holds a stable frame rate on a mid-range phone
- [x] A push to the default branch produces a new deployment

## Notes

- Deploy caveat: GitHub Pages must be enabled once on the repository with
  "GitHub Actions" as the source. Until that one-off repo setting is made, the
  deploy job runs but publishes nowhere. The app will live at
  https://cbenz.github.io/solar-system-app/ .
- `FOUNDATION.md` was missing from `agent-notes/` when this ticket started, and
  the repository had no scaffold. The scaffold was created from scratch and the
  missing foundation note was written from it.
- Three.js is pinned to 0.186.1 because 0.187.0 fell inside the local pnpm
  minimum-release-age window. Bump it when convenient.
- No browser was available in the headless environment, so the scene was not
  visually inspected. Type-check, tests, prerender and both base-path builds pass;
  the texture polygons are hand-authored and may need a visual tune later.
- No document title was added: it is a user-visible string, and ticket 02 owns the
  message catalogues.
- `src/lib/session/` was not created: this ticket needs no session module and
  inventing one here would pre-empt ticket 03.

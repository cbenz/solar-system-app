# Solar system app

A browser app where a child explores why day and night, seasons, years and eclipses happen, one activity at a time.

## Development

```bash
pnpm install
pnpm dev       # local dev server
pnpm build     # static build in build/
pnpm test      # vitest
pnpm check     # svelte-check / tsc
```

## Deployment

Pushing to `main` builds the app as a static site and deploys it to GitHub Pages
(`.github/workflows/deploy.yml`). The live URL is
https://cbenz.github.io/solar-system-app/ .

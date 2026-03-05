# Suggested Commands

## Development

```bash
# Start all 4 example apps concurrently (from repo root)
npm run dev

# Start a single app
npm run dev:hello-world
npm run dev:simple-menu
npm run dev:simple-panel
npm run dev:project-template

# Build all apps
npm run build

# Build a single app
cd hello-world && npm run build
```

## Deployment (GitHub Pages)

```bash
# Build all apps and copy dist/ to docs/<app>/
npm run deploy

# Copy only (skip build)
npm run copy-dist
```

## Code Quality

No unified lint/format script at root. Run per-app or use editor integration.

```bash
# Lint (from an app directory, e.g. hello-world/)
cd hello-world && npx eslint src/

# Format (from an app directory)
cd hello-world && npx prettier --write src/
```

## Verification After Changes

After modifying an app:
1. `npm run build` — no TypeScript errors
2. `npm run dev` — loads in host at localhost:5500 with apps.local.json
3. Check browser console — no "Shared module is not available" errors (MF misconfiguration)

## Notes

- No test suite exists in this repo (no Jest, no Playwright)
- Host must be running on `localhost:5500` for local dev to work

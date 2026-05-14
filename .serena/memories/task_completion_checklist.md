# Task Completion Checklist

Run these steps after completing any implementation task.

## 1. Build Verification

```bash
npm run build
```

Fix any TypeScript errors before proceeding.

## 2. Runtime Verification

```bash
npm run dev
```

- Open host at `localhost:5500` (with `apps.local.json` pointing to local dev servers)
- Verify the modified app loads without errors in browser console
- Specifically check: no "Shared module is not available" (MF singleton issue)

## 3. Code Quality

- Remove any `console.log` statements
- Ensure `remotes.d.ts` is up to date with all `cyweb/*` imports used

## 4. Documentation

- If you changed a component's behavior or interface: update `design/apps/<app-name>/README.md`
- If you added a new `cyweb/*` module usage: add the module to the "Host Modules Used" section
- If you added a new app: update `design/specifications/README.md` port registry
- If you hit a non-obvious issue: add it to `.serena/memories/lessons.md`

## 5. No Test Suite

This repo has no automated tests. Manual runtime verification is the only check.

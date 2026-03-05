# hello-world — Design Document

## Overview

Minimal panel-only example app. Keeps one panel so developers can see the basic `CyApp` shape without extra workflow code.

| Property | Value |
|----------|-------|
| Federation name | `hello` |
| Dev port | 2222 |
| App config file | `hello-world/src/HelloApp.tsx` |
| Host API phase | Phase 0 + Phase 1 (partial) |

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `HelloPanel` | `src/components/HelloPanel.tsx` | Basic panel showing current network info |

## Key Design Decisions

- **One panel only** — keeps the example focused on the minimum viable panel app.
- **Readable app config** — `HelloApp.tsx` now shows the smallest practical `components` array.
- **Simple host interaction** — `HelloPanel` still demonstrates reading workspace state and mutating visual style.

## Host Modules Used

```typescript
cyweb/WorkspaceStore
cyweb/VisualStyleStore
```

## Planned Updates

- [ ] Add usage of `cyweb/WorkspaceApi` and `cyweb/VisualStyleApi`
- [ ] Update `remotes.d.ts` as new `cyweb/*` modules are exposed

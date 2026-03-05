# simple-menu — Design Document

## Overview

Minimal example of adding a menu item to Cytoscape Web. Intended as the simplest possible starting point for apps that only need menu integration.

| Property | Value |
|----------|-------|
| Federation name | `simpleMenu` |
| Dev port | 3333 |
| App config file | `simple-menu/src/SimpleMenuApp.tsx` |
| Host API phase | Phase 0 |

## Components

### Menu Components

| Component | File | Purpose |
|-----------|------|---------|
| `AppMenuItem` | `src/components/AppMenuItem.tsx` | Menu item that opens a dialog with a message |

## Key Design Decisions

- **Single menu item** — Focuses solely on `ComponentType.Menu`. No panels.
- **Dialog pattern** — `AppMenuItem` opens a MUI `Dialog` on click, demonstrating a typical confirmation/info dialog flow. Calls `handleClose()` after dialog closes.
- **No host store access** — Intentionally minimal; does not read network state. Shows the floor of what a menu component needs.

## Host Modules Used

None (no `cyweb/*` imports — demonstrates that host store access is optional).

## Planned Updates

- [ ] Add an example of reading current network ID from `cyweb/WorkspaceStore` to show how to act on the current network from a menu item

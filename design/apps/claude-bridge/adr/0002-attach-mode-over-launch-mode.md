# 0002: Prefer Attach Mode (Mode A) Over Launch Mode (Mode B)

## Status

Proposed

## Context

The MCP server needs a CDP connection to a Chrome page running Cytoscape Web.
Two connection strategies are possible:

- **Mode A (attach):** Connect to an already-running Chrome instance via its
  CDP endpoint (`http://localhost:9222`)
- **Mode B (launch):** The MCP server starts a fresh Chrome process
  (`playwright.chromium.launch()`) and navigates to the Cytoscape Web URL

The user may already have a session with logged-in credentials, loaded
networks, and browser state they want to preserve.

## Decision

Mode A (attach) is the primary and recommended connection mode. Mode B is
provided only as a fallback for automated or CI demo scenarios.

The MCP server uses `playwright.chromium.connectOverCDP()` to attach to an
existing Chrome instance, then selects the appropriate page via origin
whitelist matching and `window.CyWebApi` existence check.

## Rationale

### Mode B as primary (rejected)

Launching a new browser instance discards:

- The user's authenticated session (Keycloak SSO cookies)
- All loaded networks and workspace state (IndexedDB)
- Browser extensions, bookmarks, and other personalisation

For an interactive tool where the user is actively working in Cytoscape Web,
losing this state on every MCP server restart is unacceptable.

Mode B remains available because it is useful for:

- CI pipelines where no prior browser state exists
- Automated demos that need a clean environment
- Testing scenarios where session isolation is required

## Consequences

- Users must manually launch Chrome with `--remote-debugging-port=9222`
  before starting Claude Code
- Existing browser state (sessions, networks, cookies) is preserved
- The startup sequence requires an explicit Chrome launch step, documented
  in the Startup Sequence section
- Mode B is a fallback, not the default — the MCP server attempts attach
  first

# 0006: Explicit-Call Policy for MCP Tools

## Status

Proposed

## Context

Some host App API operations have implicit side-effects controlled by default
parameter values. For example, `layout.applyLayout()` accepts a
`fitAfterLayout` option that defaults to `true`, which silently fits the
viewport after layout completes.

If the MCP tools pass parameters through without overriding these defaults,
Claude's action log becomes incomplete: the panel would show a layout call
but not the implicit viewport change. This makes it difficult to audit what
Claude actually did and breaks the principle that every visual change
corresponds to a visible tool invocation.

## Decision

MCP tools do not rely on host API default behaviours for important visual
side-effects. The bridge overrides specific parameters at the dispatcher
level to enforce explicitness:

| Tool                     | Override                | Effect                            |
| ------------------------ | ----------------------- | --------------------------------- |
| `cytoscape_apply_layout` | `fitAfterLayout: false` | Viewport fitting must be explicit |

Viewport fitting is performed exclusively via `cytoscape_fit_network`. This
override is applied unconditionally — even if Claude explicitly passes
`fitAfterLayout: true`, the dispatcher forces it to `false`.

## Rationale

### Honour caller-supplied defaults (rejected)

Allowing Claude to pass `fitAfterLayout: true` would produce a side-effect
(viewport change) that does not appear as a separate tool invocation in the
panel log. For an interactive debugging tool, auditability is more important
than convenience.

### Override only when Claude omits the parameter (rejected)

Conditional overriding (only when the parameter is absent) would create an
inconsistency: the same tool would behave differently depending on whether
Claude happened to include the flag. Unconditional override makes behaviour
deterministic.

## Consequences

- Every visual side-effect corresponds to a visible tool invocation in
  the panel
- Claude's action log is fully explicit and auditable
- Compound operations require more tool calls (e.g., layout + fit = 2 calls
  instead of 1)
- The policy prevents silent behaviour changes if host defaults evolve in
  future versions
- Additional parameters may be added to the override table as the tool set
  grows

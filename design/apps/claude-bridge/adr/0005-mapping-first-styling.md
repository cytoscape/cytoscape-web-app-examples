# 0005: Mapping-First Styling with Bypass as Exception

## Status

Proposed

## Context

Claude needs to apply visual styles to network elements in Cytoscape Web.
The host provides two mechanisms through the App API:

1. **Mappings** — data-driven style rules that map node/edge attribute values
   to visual properties. Three types: discrete (`createDiscreteMapping`),
   continuous (`createContinuousMapping`), and passthrough
   (`createPassthroughMapping`). Mappings are persistent, visible in the
   Visual Style panel, and automatically applied to all matching elements.
2. **Bypasses** — per-element visual overrides via `setBypass` that take
   precedence over mapping rules. Bypasses are element-specific and not
   reflected in the Visual Style panel's mapping configuration.

Without explicit guidance, an LLM may default to bypasses for all styling
tasks because they are simpler (no column creation, no mapping type
selection). This would produce fragile, non-reusable visual configurations.

## Decision

MCP tool descriptions explicitly guide Claude to prefer mappings as the
default styling mechanism. Bypass is reserved for transient, ad-hoc overrides
where no data attribute captures the intent.

**Use mappings when:**

- The visual encoding represents a data property (e.g., "colour by cluster")
- The style should be persistent and editable in the Visual Style panel
- The style applies to all elements matching a data criterion

**Use bypass when:**

- The change is temporary (e.g., highlighting a clicked node)
- No data attribute captures the intent
- The override targets specific, individually selected elements

## Rationale

### Always use bypass (rejected)

Bypass-only styling would:

- Produce visual configurations invisible in the Visual Style panel
- Require re-application after any network change or re-layout
- Not scale to large networks (N bypass calls vs. 1 mapping call)
- Violate Cytoscape's data-driven visual style model

### Always use mappings (rejected)

Some operations are inherently transient (e.g., "flash the selected node
red for 2 seconds"). Forcing a mapping for every visual change would require
creating throwaway columns and mappings, adding unnecessary complexity.

### No guidance — let Claude decide (rejected)

Without explicit guidance in tool descriptions, Claude tends to choose the
simpler API path (bypass) even when a mapping is more appropriate. The tool
descriptions are the most reliable way to steer behaviour.

## Consequences

- Tool descriptions for `setBypass`, `deleteBypass`, and
  `create*Mapping` tools include guidance distinguishing their use cases
- Bypasses applied by Claude should always be removable via `deleteBypass`
- Scenario documentation demonstrates both patterns (Scenario 2 = bypass,
  Scenario 4 = mapping)
- Data-driven styling follows the standard Cytoscape visual model,
  keeping the Visual Style panel as the source of truth

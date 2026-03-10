# 0007: Summary Shaping for Large MCP Tool Results

## Status

Proposed

## Context

MCP tool results are returned to Claude as part of the conversation context.
Raw host API results vary greatly in size:

- `workspace.getCurrentNetworkId()` returns a single string (~10 tokens)
- `network.getNetworkSummary()` returns a full `cyNetwork` object with
  adjacency structures (potentially thousands of tokens)
- `export.exportToCx2()` returns a complete CX2 document (potentially
  megabytes)

Returning large payloads verbatim wastes Claude's context window and adds no
decision-making value — a 1000-node network's adjacency list provides no
useful information that a `{ nodeCount: 1000, edgeCount: 5000 }` summary
does not.

## Decision

MCP tool results are processed through a **shaping layer** before being
returned to Claude. Three tiers exist:

| Tier            | Behaviour                                          | Example                                                           |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| **Passthrough** | Return `ApiSuccess.data` as-is                     | `getCurrentNetworkId` → `"net-001"`                               |
| **Summary**     | Extract key fields into a compact object           | `getNetworkSummary` → `{ networkId, name, nodeCount, edgeCount }` |
| **File**        | Write payload to a temp file, return path and size | `exportToCx2` → `{ filePath, byteSize }`                          |

The per-tool output table in the design document specifies the shaping tier
and exact output shape for all 38 tools.

**Key rules:**

- The `ApiResult` envelope (`success`, `error` fields) is **never** returned
  to Claude. The shaping layer unwraps `ApiSuccess.data` for passthrough and
  summary tiers.
- Void-returning operations (where `ApiSuccess.data` is `undefined`) return
  `{}` to Claude, not `undefined` or `null`.
- File-tier shaping enforces a 200 MB size guard. If the payload exceeds this
  limit, a `SHAPING_ERROR` is returned instead of writing the file.

## Rationale

### Always return raw data (rejected)

Returning full `cyNetwork` objects or CX2 documents wastes Claude's context
window. Token efficiency is critical for multi-step workflows where Claude
chains many tool calls in a single conversation.

### Always shape into summaries (rejected)

Over-shaping simple results (e.g., `getCurrentNetworkId` → wrapping a string
in an object) adds unnecessary complexity. Passthrough is simpler and
sufficient for small payloads.

### Return the ApiResult envelope (rejected)

External consumers should not need to understand the host's internal error
representation. The bridge handles `ApiFailure` cases internally (converting
them to `BridgeError` with code `API_ERROR`) and only returns shaped success
data to Claude.

## Consequences

- Claude's context window is preserved for reasoning, not raw data
- Tool results are tailored to Claude's decision-making needs (IDs, counts,
  names — not adjacency lists)
- Large exports go to session-scoped temp files, requiring Claude to use its
  Bash tool for further processing
- A post-shaping failure produces `SHAPING_ERROR`, which is distinct from
  `API_ERROR` (the host call succeeded but shaping failed)
- The shaping layer is the single point of truth for what Claude sees — any
  change to tool output format is made here

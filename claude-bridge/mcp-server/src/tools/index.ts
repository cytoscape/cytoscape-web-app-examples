/**
 * Tool registry — exports all tool definitions and a unified handler.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import type { BridgeResult } from '../types.js'

// Phase 1a
import {
  handleWorkspaceTool,
  workspaceToolDefs,
} from './workspaceTools.js'
import {
  handleNetworkTool,
  networkToolDefs,
} from './networkTools.js'

// Phase 1b
import {
  elementToolDefs,
  handleElementTool,
} from './elementTools.js'
import {
  handleSelectionTool,
  selectionToolDefs,
} from './selectionTools.js'

// Phase 1c
import {
  handleTableTool,
  tableToolDefs,
} from './tableTools.js'
// Phase 1d
import {
  handleVisualStyleTool,
  visualStyleToolDefs,
} from './visualStyleTools.js'
// Phase 1e: import { layoutToolDefs, handleLayoutTool } from './layoutTools.js'
// Phase 1e: import { viewportToolDefs, handleViewportTool } from './viewportTools.js'
// Phase 1e: import { exportToolDefs, handleExportTool } from './exportTools.js'
// Phase 2:  import { eventToolDefs, handleEventTool } from './eventTools.js'

/** All registered tool definitions. */
export const allToolDefs: Tool[] = [
  ...workspaceToolDefs,
  ...networkToolDefs,
  ...elementToolDefs,
  ...selectionToolDefs,
  ...tableToolDefs,
  ...visualStyleToolDefs,
]

/** Tool name → handler domain mapping. */
const workspaceToolNames = new Set(workspaceToolDefs.map((t) => t.name))
const networkToolNames = new Set(networkToolDefs.map((t) => t.name))
const elementToolNames = new Set(elementToolDefs.map((t) => t.name))
const selectionToolNames = new Set(selectionToolDefs.map((t) => t.name))
const tableToolNames = new Set(tableToolDefs.map((t) => t.name))
const visualStyleToolNames = new Set(visualStyleToolDefs.map((t) => t.name))

/** Route a tool call to the appropriate domain handler. */
export async function handleTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  if (workspaceToolNames.has(toolName)) {
    return handleWorkspaceTool(page, toolName, params)
  }
  if (networkToolNames.has(toolName)) {
    return handleNetworkTool(page, toolName, params)
  }
  if (elementToolNames.has(toolName)) {
    return handleElementTool(page, toolName, params)
  }
  if (selectionToolNames.has(toolName)) {
    return handleSelectionTool(page, toolName, params)
  }
  if (tableToolNames.has(toolName)) {
    return handleTableTool(page, toolName, params)
  }
  if (visualStyleToolNames.has(toolName)) {
    return handleVisualStyleTool(page, toolName, params)
  }

  return {
    success: false,
    error: {
      code: 'METHOD_NOT_FOUND',
      message: `Unknown tool: ${toolName}`,
    },
  }
}

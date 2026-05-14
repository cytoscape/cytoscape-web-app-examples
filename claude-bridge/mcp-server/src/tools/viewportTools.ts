/**
 * Viewport domain MCP tools (3 tools).
 *
 * Maps to window.CyWebApi.viewport.* methods.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import type { BridgeResult } from '../types.js'

export const viewportToolDefs: Tool[] = [
  {
    name: 'cytoscape_fit_network',
    description: 'Fit the viewport to show all elements. This is the sole mechanism for fitting.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
      },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_get_positions',
    description: 'Get [x, y] positions of specific nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Node IDs to get positions for',
        },
      },
      required: ['networkId', 'nodeIds'],
    },
  },
  {
    name: 'cytoscape_update_positions',
    description: 'Set [x, y] positions for nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        positions: {
          type: 'object',
          description: 'Record<nodeId, [x, y]> — position map',
        },
      },
      required: ['networkId', 'positions'],
    },
  },
]

export async function handleViewportTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_fit_network':
      return callApi(page, 'viewport.fit', [params.networkId])

    case 'cytoscape_get_positions':
      return callApi(page, 'viewport.getNodePositions', [
        params.networkId,
        params.nodeIds,
      ])

    case 'cytoscape_update_positions':
      return callApi(page, 'viewport.updateNodePositions', [
        params.networkId,
        params.positions,
      ])

    default:
      return {
        success: false,
        error: { code: 'METHOD_NOT_FOUND', message: `Unknown viewport tool: ${toolName}` },
      }
  }
}

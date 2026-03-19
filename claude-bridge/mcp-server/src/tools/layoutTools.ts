/**
 * Layout domain MCP tools (2 tools).
 *
 * Maps to window.CyWebApi.layout.* methods.
 * ADR-0006: apply_layout pins fitAfterLayout: false.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import type { BridgeResult } from '../types.js'

export const layoutToolDefs: Tool[] = [
  {
    name: 'cytoscape_apply_layout',
    description:
      'Apply a layout algorithm. Does NOT auto-fit — call cytoscape_fit_network ' +
      'separately. Options: algorithmName (default: force-directed).',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        algorithmName: {
          type: 'string',
          description: 'Layout algorithm name (use cytoscape_get_layouts to list)',
        },
      },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_get_layouts',
    description: 'List available layout algorithms.',
    inputSchema: { type: 'object', properties: {} },
  },
]

export async function handleLayoutTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_apply_layout':
      // ADR-0006: pin fitAfterLayout: false
      return callApi(page, 'layout.applyLayout', [
        params.networkId,
        {
          algorithmName: params.algorithmName,
          fitAfterLayout: false,
        },
      ])

    case 'cytoscape_get_layouts':
      return callApi(page, 'layout.getAvailableLayouts')

    default:
      return {
        success: false,
        error: { code: 'METHOD_NOT_FOUND', message: `Unknown layout tool: ${toolName}` },
      }
  }
}

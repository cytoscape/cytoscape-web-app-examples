/**
 * Network domain MCP tools (3 tools).
 *
 * Maps to window.CyWebApi.network.* methods.
 * ADR-0006: create_network_* tools pin addToWorkspace: true.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import type { BridgeResult } from '../types.js'

// ── Tool definitions ────────────────────────────────────────────────────────

export const networkToolDefs: Tool[] = [
  {
    name: 'cytoscape_create_network_from_edges',
    description:
      'Create a network from an edge list. Nodes are created implicitly. ' +
      'Returns { networkId, nodeCount, edgeCount }.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Network name' },
        description: {
          type: 'string',
          description: 'Optional network description',
        },
        edgeList: {
          type: 'array',
          description:
            'Array of [source, target] or [source, target, interaction] tuples',
          items: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 3,
          },
        },
      },
      required: ['name', 'edgeList'],
    },
  },
  {
    name: 'cytoscape_create_network_from_cx2',
    description:
      'Create a network from a CX2 JSON document. ' +
      'Returns { networkId, nodeCount, edgeCount }.',
    inputSchema: {
      type: 'object',
      properties: {
        cxData: {
          description: 'CX2 document (array of aspect objects)',
        },
        name: {
          type: 'string',
          description: 'Optional name override (uses CX2 metadata if omitted)',
        },
      },
      required: ['cxData'],
    },
  },
  {
    name: 'cytoscape_delete_network',
    description: 'Delete a network by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string', description: 'Network ID to delete' },
      },
      required: ['networkId'],
    },
  },
]

// ── Tool handlers ───────────────────────────────────────────────────────────

export async function handleNetworkTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_create_network_from_edges': {
      // ADR-0006: pin addToWorkspace: true
      const result = await callApi(
        page,
        'network.createNetworkFromEdgeList',
        [
          {
            name: params.name,
            description: params.description,
            edgeList: params.edgeList,
            addToWorkspace: true,
          },
        ],
      )
      if (!result.success) return result
      // Summary shaping: extract key fields
      const d = result.data as Record<string, unknown>
      return {
        success: true,
        data: {
          networkId: d.networkId,
          nodeCount: d.nodeCount,
          edgeCount: d.edgeCount,
        },
      }
    }

    case 'cytoscape_create_network_from_cx2': {
      // ADR-0006: pin addToWorkspace: true
      const result = await callApi(page, 'network.createNetworkFromCx2', [
        {
          cxData: params.cxData,
          name: params.name,
          addToWorkspace: true,
        },
      ])
      if (!result.success) return result
      const d = result.data as Record<string, unknown>
      return {
        success: true,
        data: {
          networkId: d.networkId,
          nodeCount: d.nodeCount,
          edgeCount: d.edgeCount,
        },
      }
    }

    case 'cytoscape_delete_network':
      return callApi(page, 'network.deleteNetwork', [
        params.networkId,
        { navigate: true },
      ])

    default:
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: `Unknown network tool: ${toolName}`,
        },
      }
  }
}

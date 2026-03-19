/**
 * Workspace domain MCP tools (6 tools).
 *
 * Maps to window.CyWebApi.workspace.* methods.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import type { BridgeResult } from '../types.js'

// ── Tool definitions ────────────────────────────────────────────────────────

export const workspaceToolDefs: Tool[] = [
  {
    name: 'cytoscape_get_workspace',
    description:
      'Get workspace metadata: id, name, current network, network count.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'cytoscape_get_networks',
    description:
      'List all networks in the workspace with summary info (id, name, node/edge counts).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'cytoscape_get_network_summary',
    description: 'Get summary metadata for a single network.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string', description: 'Network ID' },
      },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_get_current_network',
    description: 'Get the ID of the currently active network.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'cytoscape_switch_network',
    description: 'Switch the active network to the specified network ID.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string', description: 'Network ID to switch to' },
      },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_set_workspace_name',
    description: 'Rename the current workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'New workspace name' },
      },
      required: ['name'],
    },
  },
]

// ── Tool handlers ───────────────────────────────────────────────────────────

export async function handleWorkspaceTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_get_workspace':
      return callApi(page, 'workspace.getWorkspaceInfo')

    case 'cytoscape_get_networks':
      return callApi(page, 'workspace.getNetworkList')

    case 'cytoscape_get_network_summary': {
      // Summary shaping: extract key fields, omit full cyNetwork
      const result = await callApi(page, 'workspace.getNetworkSummary', [
        params.networkId,
      ])
      if (!result.success) return result
      const d = result.data as Record<string, unknown>
      return {
        success: true,
        data: {
          networkId: d.networkId,
          name: d.name,
          nodeCount: d.nodeCount,
          edgeCount: d.edgeCount,
        },
      }
    }

    case 'cytoscape_get_current_network':
      return callApi(page, 'workspace.getCurrentNetworkId')

    case 'cytoscape_switch_network':
      return callApi(page, 'workspace.switchCurrentNetwork', [
        params.networkId,
      ])

    case 'cytoscape_set_workspace_name':
      return callApi(page, 'workspace.setWorkspaceName', [params.name])

    default:
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: `Unknown workspace tool: ${toolName}`,
        },
      }
  }
}

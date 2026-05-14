/**
 * Element domain MCP tools (17 tools: 7 CRUD + 10 graph traversal).
 *
 * Maps to window.CyWebApi.element.* methods.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import type { BridgeResult } from '../types.js'

// ── Tool definitions ────────────────────────────────────────────────────────

export const elementToolDefs: Tool[] = [
  // --- CRUD ---
  {
    name: 'cytoscape_get_node',
    description: 'Get a node\'s attributes and position.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_edge',
    description: 'Get an edge\'s source, target, and attributes.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        edgeId: { type: 'string' },
      },
      required: ['networkId', 'edgeId'],
    },
  },
  {
    name: 'cytoscape_create_node',
    description:
      'Create a node at the given position. Returns { nodeId }.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        position: {
          type: 'array',
          description: '[x, y] or [x, y, z]',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 3,
        },
        attributes: {
          type: 'object',
          description: 'Optional node attributes (e.g. { name: "A" })',
        },
      },
      required: ['networkId', 'position'],
    },
  },
  {
    name: 'cytoscape_create_edge',
    description:
      'Create an edge between two nodes. Returns { edgeId }.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        sourceNodeId: { type: 'string' },
        targetNodeId: { type: 'string' },
        attributes: {
          type: 'object',
          description: 'Optional edge attributes',
        },
      },
      required: ['networkId', 'sourceNodeId', 'targetNodeId'],
    },
  },
  {
    name: 'cytoscape_delete_nodes',
    description: 'Delete nodes by ID. Connected edges are also removed.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Node IDs to delete',
        },
      },
      required: ['networkId', 'nodeIds'],
    },
  },
  {
    name: 'cytoscape_delete_edges',
    description: 'Delete edges by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        edgeIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Edge IDs to delete',
        },
      },
      required: ['networkId', 'edgeIds'],
    },
  },
  {
    name: 'cytoscape_move_edge',
    description:
      'Change the source and/or target of an existing edge.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        edgeId: { type: 'string' },
        newSourceId: { type: 'string' },
        newTargetId: { type: 'string' },
      },
      required: ['networkId', 'edgeId', 'newSourceId', 'newTargetId'],
    },
  },

  // --- Graph Traversal (all passthrough) ---
  {
    name: 'cytoscape_get_node_ids',
    description: 'Get all node IDs in the network.',
    inputSchema: {
      type: 'object',
      properties: { networkId: { type: 'string' } },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_get_edge_ids',
    description: 'Get all edge IDs in the network.',
    inputSchema: {
      type: 'object',
      properties: { networkId: { type: 'string' } },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_get_connected_edges',
    description: 'Get all edges (in + out) connected to a node.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_connected_nodes',
    description: 'Get undirected 1-hop neighbor node IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_outgoers',
    description:
      'Get directed 1-hop downstream neighbors: { nodeIds, edgeIds }.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_incomers',
    description:
      'Get directed 1-hop upstream neighbors: { nodeIds, edgeIds }.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_successors',
    description:
      'Get transitive closure downstream (all descendants): { nodeIds }.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_predecessors',
    description:
      'Get transitive closure upstream (all ancestors): { nodeIds }.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['networkId', 'nodeId'],
    },
  },
  {
    name: 'cytoscape_get_roots',
    description: 'Get nodes with no incoming edges.',
    inputSchema: {
      type: 'object',
      properties: { networkId: { type: 'string' } },
      required: ['networkId'],
    },
  },
  {
    name: 'cytoscape_get_leaves',
    description: 'Get nodes with no outgoing edges.',
    inputSchema: {
      type: 'object',
      properties: { networkId: { type: 'string' } },
      required: ['networkId'],
    },
  },
]

// ── Tool handlers ───────────────────────────────────────────────────────────

export async function handleElementTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_get_node':
      return callApi(page, 'element.getNode', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_edge':
      return callApi(page, 'element.getEdge', [
        params.networkId,
        params.edgeId,
      ])

    case 'cytoscape_create_node': {
      const options: Record<string, unknown> = {}
      if (params.attributes) options.attributes = params.attributes
      const result = await callApi(page, 'element.createNode', [
        params.networkId,
        params.position,
        options,
      ])
      if (!result.success) return result
      // Summary: { nodeId }
      const d = result.data as Record<string, unknown>
      return { success: true, data: { nodeId: d.nodeId } }
    }

    case 'cytoscape_create_edge': {
      const options: Record<string, unknown> = {}
      if (params.attributes) options.attributes = params.attributes
      const result = await callApi(page, 'element.createEdge', [
        params.networkId,
        params.sourceNodeId,
        params.targetNodeId,
        options,
      ])
      if (!result.success) return result
      const d = result.data as Record<string, unknown>
      return { success: true, data: { edgeId: d.edgeId } }
    }

    case 'cytoscape_delete_nodes':
      return callApi(page, 'element.deleteNodes', [
        params.networkId,
        params.nodeIds,
      ])

    case 'cytoscape_delete_edges':
      return callApi(page, 'element.deleteEdges', [
        params.networkId,
        params.edgeIds,
      ])

    case 'cytoscape_move_edge':
      return callApi(page, 'element.moveEdge', [
        params.networkId,
        params.edgeId,
        params.newSourceId,
        params.newTargetId,
      ])

    // --- Graph Traversal (all passthrough) ---
    case 'cytoscape_get_node_ids':
      return callApi(page, 'element.getNodeIds', [params.networkId])

    case 'cytoscape_get_edge_ids':
      return callApi(page, 'element.getEdgeIds', [params.networkId])

    case 'cytoscape_get_connected_edges':
      return callApi(page, 'element.getConnectedEdges', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_connected_nodes':
      return callApi(page, 'element.getConnectedNodes', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_outgoers':
      return callApi(page, 'element.getOutgoers', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_incomers':
      return callApi(page, 'element.getIncomers', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_successors':
      return callApi(page, 'element.getSuccessors', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_predecessors':
      return callApi(page, 'element.getPredecessors', [
        params.networkId,
        params.nodeId,
      ])

    case 'cytoscape_get_roots':
      return callApi(page, 'element.getRoots', [params.networkId])

    case 'cytoscape_get_leaves':
      return callApi(page, 'element.getLeaves', [params.networkId])

    default:
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: `Unknown element tool: ${toolName}`,
        },
      }
  }
}

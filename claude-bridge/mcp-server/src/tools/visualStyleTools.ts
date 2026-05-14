/**
 * Visual Style domain MCP tools (7 tools: 5 mapping + 2 bypass).
 *
 * Maps to window.CyWebApi.visualStyle.* methods.
 * ADR-0005: tool descriptions guide Claude toward mappings over bypasses.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import type { BridgeResult } from '../types.js'

// ── Tool definitions ────────────────────────────────────────────────────────

export const visualStyleToolDefs: Tool[] = [
  // --- Mappings (preferred) ---
  {
    name: 'cytoscape_set_default_style',
    description:
      'Set the default value for a visual property. This is the fallback ' +
      'when no mapping or bypass applies.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: {
          type: 'string',
          description: 'Visual property name (e.g. "nodeBackgroundColor", "edgeLineColor")',
        },
        vpValue: { description: 'Default value (e.g. "#CCCCCC", 30)' },
      },
      required: ['networkId', 'vpName', 'vpValue'],
    },
  },
  {
    name: 'cytoscape_create_discrete_mapping',
    description:
      'Map categorical attribute values to a visual property. ' +
      'Example: cluster ID → node color. Preferred over bypass for data-driven styling. ' +
      'Pass `mapping` to assign specific values (e.g. {"0":"#e63946","1":"#457b9d"}).',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: { type: 'string', description: 'Visual property name' },
        attribute: { type: 'string', description: 'Data attribute to map from' },
        attributeType: {
          type: 'string',
          enum: ['string', 'long', 'integer', 'double', 'boolean'],
          description: 'Data type of the attribute',
        },
        mapping: {
          type: 'object',
          description:
            'Optional value→VP mapping entries (e.g. {"0":"#e63946","1":"#457b9d"}). ' +
            'Keys are attribute values (as strings), values are visual property values.',
        },
      },
      required: ['networkId', 'vpName', 'attribute', 'attributeType'],
    },
  },
  {
    name: 'cytoscape_create_continuous_mapping',
    description:
      'Map a numeric range to a visual property. ' +
      'Example: betweenness → node size. Preferred over bypass for data-driven styling.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: { type: 'string', description: 'Visual property name' },
        vpType: {
          type: 'string',
          description: 'Visual property data type (e.g. "double", "color")',
        },
        attribute: { type: 'string', description: 'Numeric data attribute' },
        attributeValues: {
          type: 'array',
          items: { type: 'number' },
          description: 'Breakpoint values [min, max] or [min, mid, max]',
        },
        attributeType: {
          type: 'string',
          enum: ['long', 'integer', 'double'],
          description: 'Data type of the attribute',
        },
      },
      required: [
        'networkId',
        'vpName',
        'vpType',
        'attribute',
        'attributeValues',
        'attributeType',
      ],
    },
  },
  {
    name: 'cytoscape_create_passthrough_mapping',
    description:
      'Use attribute value directly as the visual property. ' +
      'Example: "name" → node label.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: { type: 'string', description: 'Visual property name' },
        attribute: { type: 'string', description: 'Data attribute to pass through' },
        attributeType: {
          type: 'string',
          enum: ['string', 'long', 'integer', 'double', 'boolean'],
        },
      },
      required: ['networkId', 'vpName', 'attribute', 'attributeType'],
    },
  },
  {
    name: 'cytoscape_remove_mapping',
    description: 'Remove a mapping. The property reverts to its default value.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: { type: 'string', description: 'Visual property name' },
      },
      required: ['networkId', 'vpName'],
    },
  },

  // --- Bypass (exception use only) ---
  {
    name: 'cytoscape_set_visual_bypass',
    description:
      'Override a visual property for specific elements. Use for temporary, ' +
      'ad-hoc highlights — NOT for data-driven styling (use mappings instead).',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: { type: 'string', description: 'Visual property name' },
        elementIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Node or edge IDs to override',
        },
        vpValue: { description: 'Override value' },
      },
      required: ['networkId', 'vpName', 'elementIds', 'vpValue'],
    },
  },
  {
    name: 'cytoscape_delete_visual_bypass',
    description:
      'Remove a bypass override. Elements revert to mapping or default.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        vpName: { type: 'string', description: 'Visual property name' },
        elementIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Node or edge IDs to clear bypass from',
        },
      },
      required: ['networkId', 'vpName', 'elementIds'],
    },
  },
]

// ── Tool handlers ───────────────────────────────────────────────────────────

export async function handleVisualStyleTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_set_default_style':
      return callApi(page, 'visualStyle.setDefault', [
        params.networkId,
        params.vpName,
        params.vpValue,
      ])

    case 'cytoscape_create_discrete_mapping':
      return callApi(page, 'visualStyle.createDiscreteMapping', [
        params.networkId,
        params.vpName,
        params.attribute,
        params.attributeType,
        params.mapping,
      ])

    case 'cytoscape_create_continuous_mapping':
      return callApi(page, 'visualStyle.createContinuousMapping', [
        params.networkId,
        params.vpName,
        params.vpType,
        params.attribute,
        params.attributeValues,
        params.attributeType,
      ])

    case 'cytoscape_create_passthrough_mapping':
      return callApi(page, 'visualStyle.createPassthroughMapping', [
        params.networkId,
        params.vpName,
        params.attribute,
        params.attributeType,
      ])

    case 'cytoscape_remove_mapping':
      return callApi(page, 'visualStyle.removeMapping', [
        params.networkId,
        params.vpName,
      ])

    case 'cytoscape_set_visual_bypass':
      return callApi(page, 'visualStyle.setBypass', [
        params.networkId,
        params.vpName,
        params.elementIds,
        params.vpValue,
      ])

    case 'cytoscape_delete_visual_bypass':
      return callApi(page, 'visualStyle.deleteBypass', [
        params.networkId,
        params.vpName,
        params.elementIds,
      ])

    default:
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: `Unknown visual style tool: ${toolName}`,
        },
      }
  }
}

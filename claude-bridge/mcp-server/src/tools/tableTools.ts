/**
 * Table domain MCP tools (12 tools: 9 standard + 3 TSV I/O).
 *
 * Maps to window.CyWebApi.table.* methods.
 * TSV tools use File/Summary shaping per ADR-0007.
 */
import fs from 'fs'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import { sessionFilePath } from '../session.js'
import type { BridgeResult } from '../types.js'

// ── Tool definitions ────────────────────────────────────────────────────────

export const tableToolDefs: Tool[] = [
  // --- Standard read/write ---
  {
    name: 'cytoscape_get_value',
    description: 'Get a single cell value from the node or edge table.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        elementId: { type: 'string' },
        column: { type: 'string' },
      },
      required: ['networkId', 'tableType', 'elementId', 'column'],
    },
  },
  {
    name: 'cytoscape_get_row',
    description: 'Get all attributes of a single node or edge.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        elementId: { type: 'string' },
      },
      required: ['networkId', 'tableType', 'elementId'],
    },
  },
  {
    name: 'cytoscape_create_column',
    description: 'Create a new column with a data type and default value.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        columnName: { type: 'string' },
        dataType: {
          type: 'string',
          enum: [
            'string',
            'long',
            'integer',
            'double',
            'boolean',
            'list_of_string',
            'list_of_long',
            'list_of_integer',
            'list_of_double',
            'list_of_boolean',
          ],
        },
        defaultValue: { description: 'Default value for existing rows' },
      },
      required: ['networkId', 'tableType', 'columnName', 'dataType', 'defaultValue'],
    },
  },
  {
    name: 'cytoscape_set_value',
    description: 'Set a single cell value.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        elementId: { type: 'string' },
        column: { type: 'string' },
        value: { description: 'The value to set' },
      },
      required: ['networkId', 'tableType', 'elementId', 'column', 'value'],
    },
  },
  {
    name: 'cytoscape_set_values',
    description:
      'Bulk cell edit: set values for multiple elements in one column.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        cellEdits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              column: { type: 'string' },
              value: {},
            },
            required: ['id', 'column', 'value'],
          },
        },
      },
      required: ['networkId', 'tableType', 'cellEdits'],
    },
  },
  {
    name: 'cytoscape_edit_rows',
    description:
      'Bulk row edit: write multiple attributes across many elements in a single call.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        rows: {
          type: 'object',
          description:
            'Record<elementId, Record<columnName, value>>. Example: {"n-1":{"score":0.9},"n-2":{"score":0.5}}',
        },
      },
      required: ['networkId', 'tableType', 'rows'],
    },
  },
  {
    name: 'cytoscape_delete_column',
    description: 'Delete a column and all its values.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        columnName: { type: 'string' },
      },
      required: ['networkId', 'tableType', 'columnName'],
    },
  },
  {
    name: 'cytoscape_rename_column',
    description: 'Rename an existing column.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        currentName: { type: 'string' },
        newName: { type: 'string' },
      },
      required: ['networkId', 'tableType', 'currentName', 'newName'],
    },
  },
  {
    name: 'cytoscape_apply_value',
    description:
      'Set the same value on many elements. Omit elementIds to apply to all.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        columnName: { type: 'string' },
        value: { description: 'Value to apply' },
        elementIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Element IDs (omit for all)',
        },
      },
      required: ['networkId', 'tableType', 'columnName', 'value'],
    },
  },

  // --- TSV I/O ---
  {
    name: 'cytoscape_get_table',
    description:
      'Get table metadata and row count. For full data, use export_table_tsv.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Column subset (omit for all)',
        },
      },
      required: ['networkId', 'tableType'],
    },
  },
  {
    name: 'cytoscape_export_table_tsv',
    description:
      'Export a table as TSV to a temp file. Returns { filePath, rowCount }. ' +
      'Read the file with your Bash tool for analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Column subset (omit for all)',
        },
        includeTypeHeader: {
          type: 'boolean',
          description: 'Use "name:type" header format (default: false)',
        },
      },
      required: ['networkId', 'tableType'],
    },
  },
  {
    name: 'cytoscape_import_table_tsv',
    description:
      'Import TSV data into a table. Auto-creates columns. ' +
      'Pass the TSV text content directly.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        tableType: { type: 'string', enum: ['node', 'edge'] },
        tsvText: {
          type: 'string',
          description: 'TSV content (header + data rows)',
        },
        keyColumn: {
          type: 'string',
          description: 'Column to match rows by (default: "id")',
        },
      },
      required: ['networkId', 'tableType', 'tsvText'],
    },
  },
]

// ── Tool handlers ───────────────────────────────────────────────────────────

export async function handleTableTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  switch (toolName) {
    case 'cytoscape_get_value':
      return callApi(page, 'table.getValue', [
        params.networkId,
        params.tableType,
        params.elementId,
        params.column,
      ])

    case 'cytoscape_get_row':
      return callApi(page, 'table.getRow', [
        params.networkId,
        params.tableType,
        params.elementId,
      ])

    case 'cytoscape_create_column':
      return callApi(page, 'table.createColumn', [
        params.networkId,
        params.tableType,
        params.columnName,
        params.dataType,
        params.defaultValue,
      ])

    case 'cytoscape_set_value':
      return callApi(page, 'table.setValue', [
        params.networkId,
        params.tableType,
        params.elementId,
        params.column,
        params.value,
      ])

    case 'cytoscape_set_values':
      return callApi(page, 'table.setValues', [
        params.networkId,
        params.tableType,
        params.cellEdits,
      ])

    case 'cytoscape_edit_rows':
      return callApi(page, 'table.editRows', [
        params.networkId,
        params.tableType,
        params.rows,
      ])

    case 'cytoscape_delete_column':
      return callApi(page, 'table.deleteColumn', [
        params.networkId,
        params.tableType,
        params.columnName,
      ])

    case 'cytoscape_rename_column':
      return callApi(page, 'table.setColumnName', [
        params.networkId,
        params.tableType,
        params.currentName,
        params.newName,
      ])

    case 'cytoscape_apply_value':
      return callApi(page, 'table.applyValueToElements', [
        params.networkId,
        params.tableType,
        params.columnName,
        params.value,
        params.elementIds,
      ])

    // --- TSV I/O ---

    case 'cytoscape_get_table': {
      // Summary shaping: return columns + rowCount, not full rows
      const options: Record<string, unknown> = {}
      if (params.columns) options.columns = params.columns
      const result = await callApi(page, 'table.getTable', [
        params.networkId,
        params.tableType,
        options,
      ])
      if (!result.success) return result
      const d = result.data as { columns: unknown[]; rows: unknown[] }
      return {
        success: true,
        data: {
          columns: d.columns,
          rowCount: d.rows.length,
        },
      }
    }

    case 'cytoscape_export_table_tsv': {
      // File shaping: write TSV to session dir, return filePath + rowCount
      const options: Record<string, unknown> = {}
      if (params.columns) options.columns = params.columns
      if (params.includeTypeHeader) options.includeTypeHeader = true
      const result = await callApi(page, 'table.exportTableToTsv', [
        params.networkId,
        params.tableType,
        options,
      ])
      if (!result.success) return result
      const d = result.data as { tsvText: string }
      try {
        const filePath = sessionFilePath('table', 'tsv')
        fs.writeFileSync(filePath, d.tsvText, 'utf-8')
        const rowCount = d.tsvText.split('\n').filter((l) => l.trim()).length - 1
        return { success: true, data: { filePath, rowCount } }
      } catch (e) {
        return {
          success: false,
          error: {
            code: 'SHAPING_ERROR',
            message: `Failed to write TSV file: ${e}`,
          },
        }
      }
    }

    case 'cytoscape_import_table_tsv': {
      const options: Record<string, unknown> = {}
      if (params.keyColumn) options.keyColumn = params.keyColumn
      return callApi(page, 'table.importTableFromTsv', [
        params.networkId,
        params.tableType,
        params.tsvText,
        options,
      ])
    }

    default:
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: `Unknown table tool: ${toolName}`,
        },
      }
  }
}

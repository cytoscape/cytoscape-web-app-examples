/**
 * Export domain MCP tools (1 tool).
 *
 * Maps to window.CyWebApi.export.* methods.
 * File shaping: CX2 written to session dir, returns { filePath, byteSize }.
 */
import fs from 'fs'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import { callApi } from '../callApi.js'
import { sessionFilePath } from '../session.js'
import type { BridgeResult } from '../types.js'

const MAX_EXPORT_SIZE = 200 * 1024 * 1024 // 200 MB guard

export const exportToolDefs: Tool[] = [
  {
    name: 'cytoscape_export_network',
    description:
      'Export the network as CX2 JSON to a temp file. ' +
      'Returns { filePath, byteSize }. Read with your Bash tool.',
    inputSchema: {
      type: 'object',
      properties: {
        networkId: { type: 'string' },
        networkName: {
          type: 'string',
          description: 'Optional name override in the exported CX2',
        },
      },
      required: ['networkId'],
    },
  },
]

export async function handleExportTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  if (toolName !== 'cytoscape_export_network') {
    return {
      success: false,
      error: { code: 'METHOD_NOT_FOUND', message: `Unknown export tool: ${toolName}` },
    }
  }

  const options: Record<string, unknown> = {}
  if (params.networkName) options.networkName = params.networkName

  const result = await callApi(page, 'export.exportToCx2', [
    params.networkId,
    options,
  ])
  if (!result.success) return result

  // File shaping: write CX2 to session dir
  try {
    const cx2Json = JSON.stringify(result.data)
    const byteSize = Buffer.byteLength(cx2Json, 'utf-8')

    if (byteSize > MAX_EXPORT_SIZE) {
      return {
        success: false,
        error: {
          code: 'SHAPING_ERROR',
          message: `Export size ${byteSize} bytes exceeds 200 MB limit`,
        },
      }
    }

    const filePath = sessionFilePath('export', 'cx2')
    fs.writeFileSync(filePath, cx2Json, 'utf-8')
    return { success: true, data: { filePath, byteSize } }
  } catch (e) {
    return {
      success: false,
      error: {
        code: 'SHAPING_ERROR',
        message: `Failed to write CX2 file: ${e}`,
      },
    }
  }
}

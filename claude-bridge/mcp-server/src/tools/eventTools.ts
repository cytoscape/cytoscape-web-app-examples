/**
 * Event forwarding MCP tool (1 tool).
 *
 * Implements polling-based event forwarding for CyWebEvents.
 * One call = one event. Claude re-calls to get the next event.
 * See design/apps/claude-bridge/README.md § Event Forwarding to Claude.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Page } from 'playwright'
import type { BridgeResult } from '../types.js'

const DEFAULT_TIMEOUT_MS = 30_000

export const eventToolDefs: Tool[] = [
  {
    name: 'cytoscape_wait_for_event',
    description:
      'Wait for a CyWebEvent to fire. Returns the event detail, or ' +
      '{ timeout: true } if no event fires within timeoutMs. ' +
      'Supported events: network:created, network:deleted, network:switched, ' +
      'selection:changed, layout:started, layout:completed, style:changed, data:changed.',
    inputSchema: {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          enum: [
            'network:created',
            'network:deleted',
            'network:switched',
            'selection:changed',
            'layout:started',
            'layout:completed',
            'style:changed',
            'data:changed',
          ],
          description: 'CyWebEvent type to listen for',
        },
        timeoutMs: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
        },
      },
      required: ['eventType'],
    },
  },
]

export async function handleEventTool(
  page: Page,
  toolName: string,
  params: Record<string, unknown>,
): Promise<BridgeResult<unknown>> {
  if (toolName !== 'cytoscape_wait_for_event') {
    return {
      success: false,
      error: {
        code: 'METHOD_NOT_FOUND',
        message: `Unknown event tool: ${toolName}`,
      },
    }
  }

  const eventType = params.eventType as string
  const timeoutMs = (params.timeoutMs as number) ?? DEFAULT_TIMEOUT_MS

  try {
    const detail = await page.evaluate(
      ({ eventType, timeoutMs }) =>
        new Promise<unknown>((resolve) => {
          const handler = (e: Event): void => {
            clearTimeout(timer)
            resolve((e as CustomEvent).detail)
          }
          const timer = setTimeout(() => {
            window.removeEventListener(eventType, handler)
            resolve({ timeout: true })
          }, timeoutMs)
          window.addEventListener(eventType, handler, { once: true })
        }),
      { eventType, timeoutMs },
    )

    return { success: true, data: detail }
  } catch (e) {
    return {
      success: false,
      error: {
        code: 'TRANSPORT_ERROR',
        message: `Event wait failed: ${e}`,
      },
    }
  }
}

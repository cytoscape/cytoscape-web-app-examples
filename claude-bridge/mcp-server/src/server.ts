/**
 * Claude Bridge MCP Server — stdio transport.
 *
 * Connects to a running Chrome/Chromium instance via CDP (--remote-debugging-port=9222),
 * waits for cywebapi:ready, then exposes MCP tools that call window.CyWebApi methods.
 *
 * Usage:
 *   node dist/server.js [--cdp-url ws://localhost:9222]
 *
 * See design/apps/claude-bridge/README.md for architecture.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { chromium, type Page } from 'playwright'
import { allToolDefs, handleTool } from './tools/index.js'

// ── CDP Connection ──────────────────────────────────────────────────────────

const CDP_URL = process.argv.includes('--cdp-url')
  ? process.argv[process.argv.indexOf('--cdp-url') + 1]
  : 'http://localhost:9222'

let page: Page | null = null

async function connectAndWait(): Promise<Page> {
  const browser = await chromium.connectOverCDP(CDP_URL)
  const contexts = browser.contexts()
  if (contexts.length === 0) {
    throw new Error('No browser contexts found. Is Cytoscape Web open?')
  }
  // Find the first page that has CyWebApi or is loading Cytoscape Web
  const pages = contexts[0].pages()
  const targetPage = pages[0]
  if (!targetPage) {
    throw new Error('No pages found in browser context.')
  }

  // Wait for cywebapi:ready (with timeout)
  await targetPage.evaluate(() => {
    return new Promise<void>((resolve) => {
      if ((window as any).CyWebApi) {
        resolve()
        return
      }
      const timeout = setTimeout(() => resolve(), 30_000)
      window.addEventListener(
        'cywebapi:ready',
        () => {
          clearTimeout(timeout)
          resolve()
        },
        { once: true },
      )
    })
  })

  // Verify CyWebApi is available
  const hasApi = await targetPage.evaluate(() => !!(window as any).CyWebApi)
  if (!hasApi) {
    throw new Error(
      'CyWebApi not found after 30s. Is Cytoscape Web fully loaded?',
    )
  }

  // Notify panel that bridge is connected
  await targetPage.evaluate(() => {
    window.dispatchEvent(new CustomEvent('claude:connected'))
  })

  return targetPage
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: 'cytoscape-web-bridge',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

// ── Tool registry ───────────────────────────────────────────────────────────

const pingTool = {
  name: 'cytoscape_ping',
  description:
    'Verify the bridge connection. Returns { connected, apiDomains }.',
  inputSchema: { type: 'object' as const, properties: {} },
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [pingTool, ...allToolDefs],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName } = request.params
  const params = (request.params.arguments ?? {}) as Record<string, unknown>

  // Connection guard
  if (!page) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: { code: 'TRANSPORT_ERROR', message: 'Not connected to browser' },
          }),
        },
      ],
    }
  }

  // Built-in ping tool
  if (toolName === 'cytoscape_ping') {
    try {
      const result = await page.evaluate(() => {
        const api = (window as any).CyWebApi
        if (!api) return { connected: false, apiDomains: [] }
        return { connected: true, apiDomains: Object.keys(api) }
      })
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    } catch (e) {
      return {
        content: [
          { type: 'text', text: JSON.stringify({ connected: false, error: String(e) }) },
        ],
      }
    }
  }

  // Route to domain handlers
  const result = await handleTool(page, toolName, params)

  // Convert BridgeResult to MCP text content
  if (result.success) {
    return {
      content: [{ type: 'text', text: JSON.stringify(result.data ?? {}) }],
    }
  }
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: result.error }) }],
    isError: true,
  }
})

// ── Startup ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    page = await connectAndWait()
    process.stderr.write(
      `[claude-bridge] Connected to Cytoscape Web via CDP (${CDP_URL})\n`,
    )
  } catch (e) {
    process.stderr.write(
      `[claude-bridge] Warning: Could not connect to browser: ${e}\n` +
        `[claude-bridge] Server will start but tools will return TRANSPORT_ERROR.\n` +
        `[claude-bridge] Start Chrome with --remote-debugging-port=9222 and reload.\n`,
    )
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('[claude-bridge] MCP server running on stdio\n')
}

main().catch((e) => {
  process.stderr.write(`[claude-bridge] Fatal: ${e}\n`)
  process.exit(1)
})

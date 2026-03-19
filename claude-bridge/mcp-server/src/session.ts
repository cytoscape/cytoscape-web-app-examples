/**
 * Session directory management for temp file lifecycle.
 *
 * Each MCP server instance creates a session-scoped directory under
 * $CYWEB_BRIDGE_TMPDIR (default: /tmp/) for CX2 exports and TSV files.
 * The directory is cleaned up on process exit.
 */
import { randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const tmpBase = process.env.CYWEB_BRIDGE_TMPDIR ?? os.tmpdir()
const sessionId = randomUUID()
const sessionDir = path.join(tmpBase, `cyweb-bridge-${sessionId}`)

let created = false

/** Get or create the session temp directory. */
export function getSessionDir(): string {
  if (!created) {
    fs.mkdirSync(sessionDir, { recursive: true })
    created = true

    // Cleanup on exit
    const cleanup = (): void => {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true })
      } catch {
        // best-effort
      }
    }
    process.on('exit', cleanup)
    process.on('SIGINT', () => {
      cleanup()
      process.exit(130)
    })
    process.on('SIGTERM', () => {
      cleanup()
      process.exit(143)
    })
  }
  return sessionDir
}

/** Generate a unique file path in the session directory. */
export function sessionFilePath(prefix: string, ext: string): string {
  return path.join(getSessionDir(), `${prefix}-${randomUUID()}.${ext}`)
}

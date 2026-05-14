/**
 * Module-level log store for BridgePanel.
 *
 * Survives component unmount/remount (e.g. tab switching) because state
 * is held at module scope, not in React useState.
 */

export interface LogEntry {
  id: number
  timestamp: Date
  type: 'command' | 'result' | 'error'
  method: string
  payload: unknown
}

type Listener = () => void

let entries: LogEntry[] = []
let connected = false
let idCounter = 0
const listeners = new Set<Listener>()

// Cached snapshot — useSyncExternalStore requires the same reference
// when state hasn't changed, otherwise it triggers infinite re-renders.
let cachedSnapshot = { entries, connected }

function notify(): void {
  cachedSnapshot = { entries, connected }
  listeners.forEach((fn) => fn())
}

export function addEntry(
  type: LogEntry['type'],
  method: string,
  payload: unknown,
): void {
  entries = [
    ...entries,
    {
      id: ++idCounter,
      timestamp: new Date(),
      type,
      method,
      payload,
    },
  ]
  notify()
}

export function setConnected(value: boolean): void {
  connected = value
  notify()
}

export function clearEntries(): void {
  entries = []
  notify()
}

// useSyncExternalStore-compatible API
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSnapshot(): { entries: LogEntry[]; connected: boolean } {
  return cachedSnapshot
}

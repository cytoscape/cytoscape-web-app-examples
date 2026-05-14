/**
 * CommandLog — timestamped, scrollable log of claude:* events.
 *
 * Each entry shows: timestamp, direction (← command / → result / ✕ error),
 * method name, and a truncated payload preview.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { LogEntry } from '../logStore'

export type { LogEntry }

const MAX_PAYLOAD_CHARS = 10_240 // 10 KB truncation rule

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function safeStringify(value: unknown): string {
  try {
    const seen = new WeakSet()
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]'
          seen.add(val)
          // Skip DOM elements
          if (val instanceof Element || val instanceof Node) return `[${val.constructor.name}]`
        }
        if (typeof val === 'function') return '[Function]'
        return val
      },
      2,
    )
  } catch {
    return String(value)
  }
}

function truncate(text: string): string {
  if (text.length <= MAX_PAYLOAD_CHARS) return text
  return text.slice(0, MAX_PAYLOAD_CHARS) + `\n… (truncated, ${text.length} chars total)`
}

function typeIcon(type: LogEntry['type']): string {
  switch (type) {
    case 'command':
      return '←'
    case 'result':
      return '→'
    case 'error':
      return '✕'
  }
}

function typeColor(type: LogEntry['type']): string {
  switch (type) {
    case 'command':
      return '#1976d2' // blue
    case 'result':
      return '#2e7d32' // green
    case 'error':
      return '#d32f2f' // red
  }
}

interface CommandLogProps {
  entries: LogEntry[]
  filter: 'all' | 'commands' | 'errors'
}

export const CommandLog = ({ entries, filter }: CommandLogProps): JSX.Element => {
  const filtered = entries.filter((e) => {
    if (filter === 'commands') return e.type === 'command' || e.type === 'result'
    if (filter === 'errors') return e.type === 'error'
    return true
  })

  if (filtered.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ p: 2, textAlign: 'center' }}>
        No log entries yet.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        flex: '1 1 0',
        minHeight: 0,
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        p: 1,
      }}
    >
      {filtered.map((entry) => (
        <Box
          key={`${entry.id}-${entry.type}`}
          sx={{
            mb: 0.5,
            p: 0.5,
            borderLeft: `3px solid ${typeColor(entry.type)}`,
            pl: 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
            <Typography
              component="span"
              sx={{ fontSize: '0.7rem', color: 'text.disabled', minWidth: 60 }}
            >
              {formatTime(entry.timestamp)}
            </Typography>
            <Typography
              component="span"
              sx={{ color: typeColor(entry.type), fontWeight: 'bold', minWidth: 16 }}
            >
              {typeIcon(entry.type)}
            </Typography>
            <Typography component="span" sx={{ fontWeight: 'bold' }}>
              {entry.method}
            </Typography>
          </Box>
          {entry.payload !== undefined && entry.payload !== null && (
            <Box
              sx={{
                mt: 0.25,
                color: 'text.secondary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 80,
                overflow: 'hidden',
              }}
            >
              {truncate(safeStringify(entry.payload))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}

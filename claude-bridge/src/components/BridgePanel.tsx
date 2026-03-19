/**
 * BridgePanel — live observer panel for claude:* events.
 *
 * Subscribes to claude:connected, claude:disconnected, claude:command,
 * claude:result, and claude:error custom events dispatched by the MCP
 * server's CDP dispatcher. Does NOT participate in command execution.
 *
 * See design/apps/claude-bridge/adr/0003-panel-as-pure-observer.md
 */
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CommandLog, type LogEntry } from './CommandLog'

type FilterTab = 'all' | 'commands' | 'errors'

const BridgePanel = (): JSX.Element => {
  const [connected, setConnected] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [tab, setTab] = useState<FilterTab>('all')
  const idCounter = useRef(0)

  const addEntry = useCallback(
    (type: LogEntry['type'], method: string, payload: unknown) => {
      setEntries((prev) => [
        ...prev,
        {
          id: ++idCounter.current,
          timestamp: new Date(),
          type,
          method,
          payload,
        },
      ])
    },
    [],
  )

  useEffect(() => {
    const onConnected = (): void => setConnected(true)
    const onDisconnected = (): void => setConnected(false)

    const onCommand = (e: Event): void => {
      const detail = (e as CustomEvent).detail
      addEntry('command', detail.method, detail.params)
    }

    const onResult = (e: Event): void => {
      const detail = (e as CustomEvent).detail
      addEntry('result', detail.method, detail.result)
    }

    const onError = (e: Event): void => {
      const detail = (e as CustomEvent).detail
      addEntry('error', detail.method, detail.error)
    }

    window.addEventListener('claude:connected', onConnected)
    window.addEventListener('claude:disconnected', onDisconnected)
    window.addEventListener('claude:command', onCommand)
    window.addEventListener('claude:result', onResult)
    window.addEventListener('claude:error', onError)

    return () => {
      window.removeEventListener('claude:connected', onConnected)
      window.removeEventListener('claude:disconnected', onDisconnected)
      window.removeEventListener('claude:command', onCommand)
      window.removeEventListener('claude:result', onResult)
      window.removeEventListener('claude:error', onError)
    }
  }, [addEntry])

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header: connection status */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: connected ? 'success.main' : 'grey.400',
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          Claude Bridge
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {connected ? 'Connected' : 'Not connected'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled">
          {entries.length} entries
        </Typography>
      </Box>

      {/* Tab filter */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as FilterTab)}
        variant="fullWidth"
        sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.75rem' } }}
      >
        <Tab label="All" value="all" />
        <Tab label="Commands" value="commands" />
        <Tab label="Errors" value="errors" />
      </Tabs>

      {/* Log */}
      <CommandLog entries={entries} filter={tab} />
    </Box>
  )
}

export default BridgePanel

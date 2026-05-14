/**
 * BridgePanel — live observer panel for claude:* events.
 *
 * Uses a module-level log store (logStore.ts) so entries persist across
 * tab switches (React unmount/remount). Event listeners are registered
 * once at module load time, not inside the component.
 *
 * See design/apps/claude-bridge/adr/0003-panel-as-pure-observer.md
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useState, useSyncExternalStore } from 'react'
import {
  addEntry,
  clearEntries,
  getSnapshot,
  setConnected,
  subscribe,
} from '../logStore'
import { CommandLog } from './CommandLog'

type FilterTab = 'all' | 'commands' | 'errors'

// ── Module-level event listeners (registered once, survive remount) ──────────

let listenersRegistered = false

function registerGlobalListeners(): void {
  if (listenersRegistered) return
  listenersRegistered = true

  window.addEventListener('claude:connected', () => setConnected(true))
  window.addEventListener('claude:disconnected', () => setConnected(false))

  window.addEventListener('claude:command', (e: Event) => {
    const detail = (e as CustomEvent).detail
    addEntry('command', detail.method, detail.params)
  })

  window.addEventListener('claude:result', (e: Event) => {
    const detail = (e as CustomEvent).detail
    addEntry('result', detail.method, detail.result)
  })

  window.addEventListener('claude:error', (e: Event) => {
    const detail = (e as CustomEvent).detail
    addEntry('error', detail.method, detail.error)
  })
}

// Register immediately at module load time
registerGlobalListeners()

// ── Component ────────────────────────────────────────────────────────────────

const BridgePanel = (): JSX.Element => {
  const { entries, connected } = useSyncExternalStore(subscribe, getSnapshot)
  const [tab, setTab] = useState<FilterTab>('all')

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
        {entries.length > 0 && (
          <Button
            size="small"
            sx={{ minWidth: 0, px: 0.5, fontSize: '0.65rem' }}
            onClick={clearEntries}
          >
            Clear
          </Button>
        )}
      </Box>

      {/* Tab filter */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as FilterTab)}
        variant="fullWidth"
        sx={{
          minHeight: 32,
          '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.75rem' },
        }}
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

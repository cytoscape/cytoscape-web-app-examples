/**
 * Example 4: App Lifecycle (mount / unmount)
 *
 * Shows how mount() and unmount() on CyAppWithLifecycle differ from React hooks
 * like useCyWebEvent, and how to bridge app-level state into React components.
 *
 * Key patterns demonstrated:
 *
 *   App-level lifecycle (HelloApp.tsx):
 *   - mount(context) runs once when the app is activated, before any component
 *     renders. It receives AppContext giving access to all App APIs without hooks.
 *   - unmount() runs when the app is deactivated or the page reloads.
 *     Every resource acquired in mount() must be released here.
 *   - A raw window.addEventListener registered in mount() stays alive even when
 *     the panel is hidden or not yet rendered — unlike useCyWebEvent, which is
 *     tied to the component instance.
 *
 *   Bridging to React (this file):
 *   - Module-level variables (lifecycleState.ts) are the bridge between the
 *     plain-object lifecycle and React components.
 *   - useSyncExternalStore is the standard React hook for subscribing to
 *     non-React external state. React calls getSnapshot on every render and
 *     re-renders only when the returned reference changes.
 *
 *   Contrast with Example 2 (SelectionSection):
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  useCyWebEvent('network:switched', handler)                         │
 *   │    → per-component, scoped to component lifetime, auto-cleanup      │
 *   │  window.addEventListener in mount()                                 │
 *   │    → app-level, survives component hide/show, manual cleanup needed │
 *   └─────────────────────────────────────────────────────────────────────┘
 *   Both listen to the same underlying DOM CustomEvent. The choice depends
 *   on whether you need component-scoped or app-scoped lifetime.
 */
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useSyncExternalStore } from 'react'

import {
  getLifecycleSnapshot,
  subscribeLifecycleState,
} from '../lifecycleState'

export const LifecycleSection = (): JSX.Element => {
  // useSyncExternalStore requires two stable function references:
  //   1. subscribe  — called by React to register a change listener.
  //                   Must return an unsubscribe function.
  //   2. getSnapshot — called by React to read the current state.
  //                   Must return the same reference when state is unchanged,
  //                   or React will re-render in an infinite loop.
  //
  // Both arguments here are module-level constants from lifecycleState.ts,
  // so they are always stable — no useCallback or useMemo needed.
  const { mounted, networkSwitchCount, lastNetworkId } = useSyncExternalStore(
    subscribeLifecycleState,
    getLifecycleSnapshot,
  )

  return (
    <Box>
      <Typography variant="h6">Example 4: App Lifecycle</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        mount() registers a raw DOM listener outside React; unmount() removes
        it. <code>useSyncExternalStore</code> bridges that non-React state into
        this component.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {/* Reflects the mounted flag set by mount() / unmount() in HelloApp.tsx */}
        <Chip
          size="small"
          label={mounted ? 'Mounted ✓' : 'Not mounted'}
          color={mounted ? 'success' : 'default'}
        />
        {/* Counts 'network:switched' events received by the app-level listener.
            Compare with SelectionSection: both track network switches, but this
            counter keeps running even while the panel is hidden. */}
        <Chip size="small" label={`Network switches: ${networkSwitchCount}`} />
        {/* Initial value comes from context.apis.workspace in mount();
            subsequent updates come from the window event listener. */}
        <Chip
          size="small"
          label={
            lastNetworkId !== null
              ? `Last network: ${lastNetworkId.slice(0, 8)}…`
              : 'No network yet'
          }
        />
      </Box>
    </Box>
  )
}

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

import { ContextMenuSection } from './ContextMenuSection'
import { HelloHeader } from './HelloHeader'
import { LayoutSection } from './LayoutSection'
import { LifecycleSection } from './LifecycleSection'
import { MenuSection } from './MenuSection'
import { SelectionSection } from './SelectionSection'
import { VisualStyleSection } from './VisualStyleSection'

/**
 * HelloPanel — root panel component for the Hello World app.
 *
 * Acts as a thin layout shell: it composes seven self-contained section
 * components separated by Dividers. Each section owns its own state,
 * API hooks, and error handling — no props are passed between them.
 *
 * Sections:
 *   HelloHeader          — app title and serving URL (Example 0)
 *   VisualStyleSection   — random color via VisualStyleApi (Example 1)
 *   SelectionSection     — selection tracking via EventBus (Example 2)
 *   LayoutSection        — layout execution via LayoutApi (Example 3)
 *   LifecycleSection     — mount/unmount lifecycle via useSyncExternalStore (Example 4)
 *   MenuSection          — dropdown menu component pattern (Example 5)
 *   ContextMenuSection   — context menu items for node/edge/canvas (Example 6)
 */
const HelloPanel = (): JSX.Element => (
  <Box
    sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '1em',
      gap: 2,
      overflowY: 'auto',
    }}
  >
    <HelloHeader />
    <Divider />
    <VisualStyleSection />
    <Divider />
    <SelectionSection />
    <Divider />
    <LayoutSection />
    <Divider />
    <LifecycleSection />
    <Divider />
    <MenuSection />
    <Divider />
    <ContextMenuSection />
  </Box>
)

export default HelloPanel

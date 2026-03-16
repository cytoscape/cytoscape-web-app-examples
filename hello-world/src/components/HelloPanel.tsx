import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

import { ContextMenuSection } from './ContextMenuSection'
import { ElementSection } from './ElementSection'
import { ExportSection } from './ExportSection'
import { HelloHeader } from './HelloHeader'
import { LayoutSection } from './LayoutSection'
import { LifecycleSection } from './LifecycleSection'
import { MenuSection } from './MenuSection'
import { NetworkSection } from './NetworkSection'
import { SelectionSection } from './SelectionSection'
import { TableSection } from './TableSection'
import { ViewportSection } from './ViewportSection'
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
 *   ElementSection       — node/edge CRUD via ElementApi (Example 7)
 *   TableSection         — table data read/write via TableApi (Example 8)
 *   ViewportSection      — fit/positions via ViewportApi (Example 9)
 *   ExportSection        — CX2 export via ExportApi (Example 10)
 *   NetworkSection       — network create/delete via NetworkApi (Example 11)
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
    <Divider />
    <ElementSection />
    <Divider />
    <TableSection />
    <Divider />
    <ViewportSection />
    <Divider />
    <ExportSection />
    <Divider />
    <NetworkSection />
  </Box>
)

export default HelloPanel
